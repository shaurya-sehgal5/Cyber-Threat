require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { pool, testConnection } = require("./config/db");

const app = express();

app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173"
}));

app.use(express.json({ limit: "2mb" }));

app.use("/api/logs", require("./routes/logs"));
app.use("/api/alerts", require("./routes/alerts"));
app.use("/api/analytics", require("./routes/analytics"));

const { runDetection } = require("./services/detectionEngine");

app.post("/api/detections/run", async (req, res) => {
    try {
        const result = await runDetection();
        res.json(result);
    } catch (error) {
        console.error("Detection execution failed:", error.message);
        res.status(500).json({
            success: false,
            message: "Detection execution failed"
        });
    }
});

// Root endpoint
app.get("/", (req, res) => {
    res.json({
        name: "Cyber Threat Trace API",
        version: "1.0.0",
        status: "running"
    });
});

// Health endpoint
app.get("/api/health", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW() AS database_time");

        res.json({
            status: "healthy",
            service: "Cyber Threat Trace API",
            database: "connected",
            database_time: result.rows[0].database_time
        });
    } catch (error) {
        res.status(503).json({
            status: "unhealthy",
            database: "disconnected",
            error: "Database connection failed"
        });
    }
});

// Dashboard statistics
app.get("/api/dashboard/stats", async (req, res) => {
    try {
        const [logs, alerts, severity, recentActivity] = await Promise.all([
            pool.query(`
                SELECT
                    COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE status = 'failed') AS failed,
                    COUNT(*) FILTER (WHERE status = 'success') AS successful
                FROM authentication_logs
            `),

            pool.query(`
                SELECT
                    COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE status = 'open') AS open,
                    COUNT(*) FILTER (WHERE status = 'investigating') AS investigating
                FROM threat_alerts
            `),

            pool.query(`
                SELECT severity, COUNT(*) AS count
                FROM threat_alerts
                GROUP BY severity
            `),

            pool.query(`
                SELECT COUNT(*) AS total
                FROM authentication_logs
                WHERE event_time >= NOW() - INTERVAL '24 hours'
            `)
        ]);

        const severityBreakdown = {
            low: 0,
            medium: 0,
            high: 0,
            critical: 0
        };

        severity.rows.forEach((row) => {
            severityBreakdown[row.severity] = Number(row.count);
        });

        res.json({
            success: true,
            data: {
                authentication: {
                    total: Number(logs.rows[0].total),
                    failed: Number(logs.rows[0].failed),
                    successful: Number(logs.rows[0].successful)
                },
                alerts: {
                    total: Number(alerts.rows[0].total),
                    open: Number(alerts.rows[0].open),
                    investigating: Number(alerts.rows[0].investigating)
                },
                severity: severityBreakdown,
                eventsLast24Hours: Number(recentActivity.rows[0].total)
            }
        });
    } catch (error) {
        console.error("Dashboard statistics error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve dashboard statistics"
        });
    }
});

// Authentication logs
app.get("/api/logs", async (req, res) => {
    try {
        const limit = Math.min(
            Math.max(parseInt(req.query.limit, 10) || 50, 1),
            100
        );

        const result = await pool.query(
            `SELECT * FROM authentication_logs
             ORDER BY event_time DESC
             LIMIT $1`,
            [limit]
        );

        res.json({
            success: true,
            count: result.rowCount,
            data: result.rows
        });
    } catch (error) {
        console.error("Logs error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve authentication logs"
        });
    }
});

// Threat alerts
app.get("/api/alerts", async (req, res) => {
    try {
        const { severity, status } = req.query;

        const conditions = [];
        const values = [];

        if (severity) {
            values.push(severity.toLowerCase());
            conditions.push(`severity = $${values.length}`);
        }

        if (status) {
            values.push(status.toLowerCase());
            conditions.push(`status = $${values.length}`);
        }

        const whereClause = conditions.length
            ? `WHERE ${conditions.join(" AND ")}`
            : "";

        const result = await pool.query(
            `SELECT * FROM threat_alerts
             ${whereClause}
             ORDER BY created_at DESC
             LIMIT 100`,
            values
        );

        res.json({
            success: true,
            count: result.rowCount,
            data: result.rows
        });
    } catch (error) {
        console.error("Alerts error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve threat alerts"
        });
    }
});

// Detection history
app.get("/api/detections/history", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT *
            FROM detection_history
            ORDER BY executed_at DESC
            LIMIT 50
        `);

        res.json({
            success: true,
            count: result.rowCount,
            data: result.rows
        });
    } catch (error) {
        console.error("Detection history error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve detection history"
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found"
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error("Unhandled error:", error.message);

    res.status(500).json({
        success: false,
        message: "Internal server error"
    });
});

const PORT = Number(process.env.PORT || 5000);

const startServer = async () => {
    try {
        await testConnection();

        app.listen(PORT, () => {
            console.log("------------------------------------");
            console.log(" CYBER THREAT TRACE API");
            console.log("------------------------------------");
            console.log(` Server: http://localhost:${PORT}`);
            console.log(` Health: http://localhost:${PORT}/api/health`);
            console.log("------------------------------------");
        });
    } catch (error) {
        console.error("Failed to start application:", error.message);
        process.exit(1);
    }
};

if (require.main === module) {
    startServer();
}

module.exports = app;


