-- Migration: Add sessions table for refresh token management
-- Purpose: Zero-Trust authentication with refresh token rotation

-- Sessions table for storing refresh tokens
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    user_agent TEXT,
    ip_address VARCHAR(45),
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP WITH TIME ZONE
);

-- Index for fast lookup by user_id
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- Index for fast lookup by refresh_token_hash
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token_hash ON sessions(refresh_token_hash);

-- Index for efficient cleanup of expired/revoked sessions
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_revoked ON sessions(revoked);

-- Trigger to automatically set revoked_at when revoked is set to true
CREATE OR REPLACE FUNCTION set_revoked_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.revoked = TRUE AND OLD.revoked = FALSE THEN
        NEW.revoked_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_revoked_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION set_revoked_at();
