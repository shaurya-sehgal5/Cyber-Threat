-- ============================================
-- CYBER THREAT TRACE
-- Database Schema v1.0
-- ============================================

CREATE TABLE IF NOT EXISTS authentication_logs (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    source_ip VARCHAR(45) NOT NULL,
    event_type VARCHAR(50) NOT NULL DEFAULT 'login',
    status VARCHAR(20) NOT NULL
        CHECK (status IN ('success', 'failed')),
    event_time TIMESTAMPTZ NOT NULL,
    user_agent TEXT,
    raw_event JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS threat_alerts (
    id BIGSERIAL PRIMARY KEY,
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL
        CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    source_ip VARCHAR(45),
    username VARCHAR(255),
    status VARCHAR(30) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
    occurrences INTEGER NOT NULL DEFAULT 1,
    first_seen TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS detection_history (
    id BIGSERIAL PRIMARY KEY,
    rule_name VARCHAR(150) NOT NULL,
    records_scanned INTEGER NOT NULL DEFAULT 0,
    alerts_created INTEGER NOT NULL DEFAULT 0,
    execution_status VARCHAR(30) NOT NULL DEFAULT 'completed',
    details JSONB DEFAULT '{}'::jsonb,
    executed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes

CREATE INDEX IF NOT EXISTS idx_auth_logs_username
ON authentication_logs(username);

CREATE INDEX IF NOT EXISTS idx_auth_logs_source_ip
ON authentication_logs(source_ip);

CREATE INDEX IF NOT EXISTS idx_auth_logs_event_time
ON authentication_logs(event_time DESC);

CREATE INDEX IF NOT EXISTS idx_auth_logs_status
ON authentication_logs(status);

CREATE INDEX IF NOT EXISTS idx_alerts_severity
ON threat_alerts(severity);

CREATE INDEX IF NOT EXISTS idx_alerts_status
ON threat_alerts(status);

CREATE INDEX IF NOT EXISTS idx_alerts_created_at
ON threat_alerts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_detection_executed_at
ON detection_history(executed_at DESC);

-- Database version tracking

CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schema_version (version, description)
VALUES (1, 'Initial Cyber Threat Trace database schema')
ON CONFLICT (version) DO NOTHING;
