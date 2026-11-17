CREATE INDEX IF NOT EXISTS idx_auth_failed_ip_time
ON authentication_logs(source_ip, event_time DESC)
WHERE status = 'failed';

CREATE INDEX IF NOT EXISTS idx_auth_failed_user_time
ON authentication_logs(username, event_time DESC)
WHERE status = 'failed';

CREATE INDEX IF NOT EXISTS idx_alert_type_ip
ON threat_alerts(alert_type, source_ip);