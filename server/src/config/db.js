const { Pool } = require("pg");

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
});

pool.on("error", (error) => {
    console.error("Unexpected PostgreSQL error:", error.message);
});

const testConnection = async () => {
    const result = await pool.query(
        "SELECT current_database() AS database, NOW() AS server_time"
    );

    console.log("PostgreSQL connected:", result.rows[0].database);
};

module.exports = {
    pool,
    testConnection
};
