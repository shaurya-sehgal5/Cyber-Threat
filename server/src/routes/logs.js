const express = require("express");
const multer = require("multer");
const net = require("node:net");
const { parse } = require("csv-parse/sync");
const { pool } = require("../config/db");
const { runDetection } = require("../services/detectionEngine");

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1
    }
});

function normalizeLog(row) {
    const username = String(row.username || "").trim();
    const source_ip = String(row.source_ip || row.ip || "").trim();
    const status = String(row.status || "").trim().toLowerCase();
    const event_time = new Date(row.event_time || row.timestamp);
    const event_type = String(row.event_type || "login").trim();

    if (!username || username.length > 255) {
        throw new Error("Invalid username");
    }

    if (!net.isIP(source_ip)) {
        throw new Error(`Invalid IP address: ${source_ip}`);
    }

    if (!["success", "failed"].includes(status)) {
        throw new Error(`Invalid status for ${username}`);
    }

    if (Number.isNaN(event_time.getTime())) {
        throw new Error(`Invalid event timestamp for ${username}`);
    }

    if (event_type.length > 50) {
        throw new Error("Event type is too long");
    }

    return {
        username,
        source_ip,
        status,
        event_time,
        event_type,
        user_agent: row.user_agent || null,
        raw_event: row
    };
}

router.post("/upload", upload.single("file"), async (req, res) => {
    const client = await pool.connect();

    try {
        let rows;

        if (req.file) {
            const content = req.file.buffer.toString("utf8");

            if (req.file.originalname.toLowerCase().endsWith(".csv")) {
                rows = parse(content, {
                    columns: true,
                    skip_empty_lines: true,
                    trim: true
                });
            } else if (req.file.originalname.toLowerCase().endsWith(".json")) {
                const parsed = JSON.parse(content);
                rows = Array.isArray(parsed) ? parsed : parsed.logs;
            } else {
                return res.status(400).json({
                    success: false,
                    message: "Only CSV and JSON files are supported"
                });
            }
        } else {
            rows = Array.isArray(req.body) ? req.body : req.body.logs;
        }

        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No authentication log records provided"
            });
        }

        if (rows.length > 10000) {
            return res.status(400).json({
                success: false,
                message: "Maximum upload size is 10,000 records"
            });
        }

        const normalized = rows.map(normalizeLog);

        await client.query("BEGIN");

        const insertQuery = `
            INSERT INTO authentication_logs (
                username, source_ip, status,
                event_time, event_type, user_agent, raw_event
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7)
        `;

        for (const log of normalized) {
            await client.query(insertQuery, [
                log.username,
                log.source_ip,
                log.status,
                log.event_time,
                log.event_type,
                log.user_agent,
                JSON.stringify(log.raw_event)
            ]);
        }

        await client.query("COMMIT");

        const detection = await runDetection();

        res.status(201).json({
            success: true,
            message: "Authentication logs imported successfully",
            imported: normalized.length,
            detection
        });

    } catch (error) {
        await client.query("ROLLBACK").catch(() => {});

        console.error("Log upload error:", error.message);

        res.status(400).json({
            success: false,
            message: error.message || "Log import failed"
        });
    } finally {
        client.release();
    }
});

module.exports = router;

