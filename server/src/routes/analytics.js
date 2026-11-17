const express = require("express");
const { pool } = require("../config/db");

const router = express.Router();

// Hourly authentication activity
router.get("/activity", async (req, res) => {
    try {
        const hours = Math.min(
            Math.max(parseInt(req.query.hours, 10) || 24, 1),
            168
        );

        const result = await pool.query(
            `
            WITH hourly AS (
                SELECT
                    date_trunc('hour', event_time) AS hour,
                    COUNT(*) AS total_events,
                    COUNT(*) FILTER (
                        WHERE status = 'failed'
                    ) AS failed_logins,
                    COUNT(*) FILTER (
                        WHERE status = 'success'
                    ) AS successful_logins
                FROM authentication_logs
                WHERE event_time >= NOW() - ($1 * INTERVAL '1 hour')
                GROUP BY date_trunc('hour', event_time)
            ),
            timeline AS (
                SELECT generate_series(
                    date_trunc('hour', NOW()) - (($1 - 1) * INTERVAL '1 hour'),
                    date_trunc('hour', NOW()),
                    INTERVAL '1 hour'
                ) AS hour
            )
            SELECT
                timeline.hour,
                COALESCE(hourly.total_events, 0)::int AS total_events,
                COALESCE(hourly.failed_logins, 0)::int AS failed_logins,
                COALESCE(hourly.successful_logins, 0)::int AS successful_logins
            FROM timeline
            LEFT JOIN hourly ON timeline.hour = hourly.hour
            ORDER BY timeline.hour ASC
            `,
            [hours]
        );

        res.json({
            success: true,
            period_hours: hours,
            count: result.rowCount,
            data: result.rows
        });

    } catch (error) {
        console.error("Activity analytics error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve activity analytics"
        });
    }
});

// Top suspicious IP addresses
router.get("/top-ips", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                source_ip,
                COUNT(*) AS total_attempts,
                COUNT(*) FILTER (
                    WHERE status = 'failed'
                ) AS failed_attempts,
                COUNT(DISTINCT username) AS targeted_accounts
            FROM authentication_logs
            WHERE event_time >= NOW() - INTERVAL '24 hours'
            GROUP BY source_ip
            ORDER BY failed_attempts DESC, total_attempts DESC
            LIMIT 10
        `);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error("Top IP analytics error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve IP analytics"
        });
    }
});

// Authentication success and failure summary
router.get("/authentication-summary", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (
                    WHERE status = 'success'
                ) AS successful,
                COUNT(*) FILTER (
                    WHERE status = 'failed'
                ) AS failed,
                COUNT(DISTINCT source_ip) AS unique_ips,
                COUNT(DISTINCT username) AS unique_users
            FROM authentication_logs
            WHERE event_time >= NOW() - INTERVAL '24 hours'
        `);

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error("Authentication summary error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve authentication summary"
        });
    }
});

module.exports = router;