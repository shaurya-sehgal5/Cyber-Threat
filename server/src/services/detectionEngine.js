const { pool } = require("../config/db");

const RULES = [
    {
        type: "BRUTE_FORCE",
        name: "Brute Force Attack",
        severity: "high",
        threshold: 5,
        windowMinutes: 10,
        query: `
            WITH attempts AS (
                SELECT source_ip, username, event_time,
                    COUNT(*) OVER (
                        PARTITION BY source_ip, username
                        ORDER BY event_time
                        RANGE BETWEEN INTERVAL '10 minutes' PRECEDING
                        AND CURRENT ROW
                    ) AS attempt_count
                FROM authentication_logs
                WHERE status = 'failed'
                  AND event_time >= NOW() - INTERVAL '24 hours'
            )
            SELECT source_ip, username,
                MAX(attempt_count) AS attempts,
                MIN(event_time) AS first_seen,
                MAX(event_time) AS last_seen
            FROM attempts
            WHERE attempt_count >= $1
            GROUP BY source_ip, username
        `
    },
    {
        type: "ACCOUNT_ENUMERATION",
        name: "Account Enumeration",
        severity: "high",
        threshold: 3,
        windowMinutes: 15,
        query: `
            SELECT source_ip, NULL AS username,
                COUNT(DISTINCT username) AS attempts,
                MIN(event_time) AS first_seen,
                MAX(event_time) AS last_seen
            FROM authentication_logs
            WHERE status = 'failed'
              AND event_time >= NOW() - INTERVAL '15 minutes'
            GROUP BY source_ip
            HAVING COUNT(DISTINCT username) >= $1
        `
    },
    {
        type: "SUSPICIOUS_IP",
        name: "Suspicious IP Activity",
        severity: "critical",
        threshold: 10,
        windowMinutes: 15,
        query: `
            SELECT source_ip, NULL AS username,
                COUNT(*) AS attempts,
                MIN(event_time) AS first_seen,
                MAX(event_time) AS last_seen
            FROM authentication_logs
            WHERE status = 'failed'
              AND event_time >= NOW() - INTERVAL '15 minutes'
            GROUP BY source_ip
            HAVING COUNT(*) >= $1
        `
    }
];

async function createOrUpdateAlert(client, rule, row) {
    const existing = await client.query(
        `SELECT id
         FROM threat_alerts
         WHERE alert_type = $1
           AND source_ip IS NOT DISTINCT FROM $2
           AND username IS NOT DISTINCT FROM $3
           AND status IN ('open', 'investigating')
         ORDER BY created_at DESC
         LIMIT 1`,
        [rule.type, row.source_ip, row.username]
    );

    const metadata = {
        rule: rule.type,
        threshold: rule.threshold,
        window_minutes: rule.windowMinutes,
        attempts: Number(row.attempts)
    };

    if (existing.rowCount) {
        await client.query(
            `UPDATE threat_alerts
             SET occurrences = GREATEST(occurrences, $1),
                 last_seen = GREATEST(last_seen, $2),
                 metadata = $3
             WHERE id = $4`,
            [
                Number(row.attempts),
                row.last_seen,
                JSON.stringify(metadata),
                existing.rows[0].id
            ]
        );

        return false;
    }

    await client.query(
        `INSERT INTO threat_alerts (
            alert_type, severity, title, description,
            source_ip, username, occurrences,
            first_seen, last_seen, metadata
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
            rule.type,
            rule.severity,
            rule.name,
            `${row.attempts} failed authentication attempts detected from ${row.source_ip}${row.username ? ` against ${row.username}` : ""}.`,
            row.source_ip,
            row.username,
            Number(row.attempts),
            row.first_seen,
            row.last_seen,
            JSON.stringify(metadata)
        ]
    );

    return true;
}

async function runDetection() {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        let recordsScanned = 0;
        let alertsCreated = 0;
        const detectedRules = [];

        for (const rule of RULES) {
            const result = await client.query(
                rule.query,
                [rule.threshold]
            );

            recordsScanned += result.rowCount;

            for (const row of result.rows) {
                const inserted = await createOrUpdateAlert(
                    client,
                    rule,
                    row
                );

                if (inserted) alertsCreated++;

                if (!detectedRules.includes(rule.type)) {
                    detectedRules.push(rule.type);
                }
            }
        }

        const history = await client.query(
            `INSERT INTO detection_history (
                rule_name, records_scanned, alerts_created,
                execution_status, details
            ) VALUES ($1,$2,$3,$4,$5)
            RETURNING id`,
            [
                "Authentication Threat Detection",
                recordsScanned,
                alertsCreated,
                "completed",
                JSON.stringify({
                    rules_evaluated: RULES.length,
                    detected_rules: detectedRules
                })
            ]
        );

        await client.query("COMMIT");

        return {
            success: true,
            execution_id: history.rows[0].id,
            records_scanned: recordsScanned,
            alerts_created: alertsCreated,
            rules_evaluated: RULES.length,
            detected_rules: detectedRules
        };

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

module.exports = { runDetection, RULES };
