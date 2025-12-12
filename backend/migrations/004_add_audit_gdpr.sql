-- Migration 004: Add Audit Logs and GDPR Tables
-- Description: Add audit logging and GDPR compliance tables
-- Author: GitHub Copilot Agent
-- Date: 2024-12-12

-- Audit logs table (for critical actions)
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,  -- e.g., 'NOTE_CREATED', 'USER_EXPORTED', 'NOTE_DELETED'
    entity_type VARCHAR(50),       -- e.g., 'note', 'user', 'comment', 'theme'
    entity_id INTEGER,
    details JSONB,                 -- Additional details in JSON format
    ip_address VARCHAR(45),        -- IPv4 or IPv6
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- GDPR export requests table
CREATE TABLE IF NOT EXISTS gdpr_export_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    export_data JSONB,             -- Exported user data in JSON format
    error_message TEXT
);

-- Add GDPR-related columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS anonymized BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Indexes for audit logs
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_composite ON audit_logs(user_id, action, created_at DESC);

-- Indexes for GDPR export requests
CREATE INDEX idx_gdpr_export_user_id ON gdpr_export_requests(user_id);
CREATE INDEX idx_gdpr_export_status ON gdpr_export_requests(status);
CREATE INDEX idx_gdpr_export_requested_at ON gdpr_export_requests(requested_at DESC);

-- Indexes for GDPR columns on users
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
CREATE INDEX idx_users_anonymized ON users(anonymized);

-- Partitioning for audit_logs (optional, for performance with large datasets)
-- This can be implemented later if needed

-- Comments
COMMENT ON TABLE audit_logs IS 'Audit trail for critical actions (security, GDPR, etc.)';
COMMENT ON TABLE gdpr_export_requests IS 'GDPR data export requests and their status';
COMMENT ON COLUMN users.deleted_at IS 'Soft delete timestamp (GDPR right to erasure)';
COMMENT ON COLUMN users.anonymized IS 'Whether user data has been anonymized';
COMMENT ON COLUMN users.consent_date IS 'Date when user gave consent to data processing';
COMMENT ON COLUMN users.last_login IS 'Last login timestamp for activity tracking';

-- Function to auto-purge old audit logs (6 months)
CREATE OR REPLACE FUNCTION purge_old_audit_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '6 months';
END;
$$ LANGUAGE plpgsql;

-- Function to auto-purge old GDPR export requests (3 months)
CREATE OR REPLACE FUNCTION purge_old_gdpr_exports()
RETURNS void AS $$
BEGIN
    DELETE FROM gdpr_export_requests 
    WHERE status = 'completed' 
    AND completed_at < NOW() - INTERVAL '3 months';
END;
$$ LANGUAGE plpgsql;

-- Function to anonymize users marked for deletion (30 days after deleted_at)
CREATE OR REPLACE FUNCTION anonymize_deleted_users()
RETURNS void AS $$
BEGIN
    UPDATE users
    SET 
        username = 'deleted_user_' || id,
        password_hash = '',
        anonymized = TRUE
    WHERE 
        deleted_at IS NOT NULL 
        AND deleted_at < NOW() - INTERVAL '30 days'
        AND anonymized = FALSE;
END;
$$ LANGUAGE plpgsql;

-- Comments on functions
COMMENT ON FUNCTION purge_old_audit_logs IS 'Purge audit logs older than 6 months (GDPR retention policy)';
COMMENT ON FUNCTION purge_old_gdpr_exports IS 'Purge completed GDPR export requests older than 3 months';
COMMENT ON FUNCTION anonymize_deleted_users IS 'Anonymize users 30 days after soft delete (GDPR right to erasure)';

-- Note: These functions should be called via cron job or scheduled task
-- Example crontab entry:
-- 0 2 * * * psql -U user -d notimatic_dev -c "SELECT purge_old_audit_logs();"
-- 0 3 * * * psql -U user -d notimatic_dev -c "SELECT purge_old_gdpr_exports();"
-- 0 4 * * * psql -U user -d notimatic_dev -c "SELECT anonymize_deleted_users();"
