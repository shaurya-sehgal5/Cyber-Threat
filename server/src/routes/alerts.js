const express = require("express");
const { pool } = require("../config/db");

const router = express.Router();

const VALID_STATUSES = [
    "open",
    "investigating",
    "resolved",
    "false_positive"
];

// Get individual alert
router.get("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid alert ID"
            });
        }

        const alert = await pool.query(
            "SELECT * FROM threat_alerts WHERE id = $1",
            [id]
        );

        if (!alert.rowCount) {
            return res.status(404).json({
                success: false,
                message: "Alert not found"
            });
        }

        const history = await pool.query(
            `SELECT * FROM alert_events
             WHERE alert_id = $1
             ORDER BY changed_at DESC`,
            [id]
        );

        res.json({
            success: true,
            data: {
                ...alert.rows[0],
                history: history.rows
            }
        });

    } catch (error) {
        console.error("Alert detail error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve alert"
        });
    }
});

// Update alert status and preserve audit history
router.patch("/:id/status", async (req, res) => {
    const client = await pool.connect();

    try {
        const id = Number(req.params.id);
        const { status, note } = req.body;

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid alert ID"
            });
        }

        if (!VALID_STATUSES.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid alert status",
                allowed: VALID_STATUSES
            });
        }

        if (note !== undefined &&
            (typeof note !== "string" || note.length > 1000)) {
            return res.status(400).json({
                success: false,
                message: "Note must be a string of at most 1000 characters"
            });
        }

        await client.query("BEGIN");

        const current = await client.query(
            `SELECT id, status
             FROM threat_alerts
             WHERE id = $1
             FOR UPDATE`,
            [id]
        );

        if (!current.rowCount) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Alert not found"
            });
        }

        const previousStatus = current.rows[0].status;

        const updated = await client.query(
            `UPDATE threat_alerts
             SET status = $1
             WHERE id = $2
             RETURNING *`,
            [status, id]
        );

        if (previousStatus !== status || note) {
            await client.query(
                `INSERT INTO alert_events (
                    alert_id, previous_status, new_status, note
                ) VALUES ($1, $2, $3, $4)`,
                [id, previousStatus, status, note || null]
            );
        }

        await client.query("COMMIT");

        res.json({
            success: true,
            message: "Alert status updated successfully",
            data: updated.rows[0]
        });

    } catch (error) {
        await client.query("ROLLBACK").catch(() => {});

        console.error("Alert update error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to update alert status"
        });
    } finally {
        client.release();
    }
});

module.exports = router;
