-- Migration 005: Add Password Reset Tokens
-- Description: Add password reset functionality with secure token storage
-- Author: GitHub Copilot Agent
-- Date: 2024-12-12

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    token_hash VARCHAR(255) NOT NULL,  -- SHA-256 hash of the token
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45)  -- For audit/security
);

-- Indexes for performance and security
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Add email and phone fields to users table for password reset
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create trigger to auto-update updated_at on users
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE password_reset_tokens IS 'Secure storage for password reset tokens with expiration';
COMMENT ON COLUMN password_reset_tokens.token_hash IS 'SHA-256 hash of the reset token (never store plain token)';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Token expiration timestamp (typically 1 hour from creation)';
COMMENT ON COLUMN password_reset_tokens.used_at IS 'Timestamp when token was used (NULL if unused)';
COMMENT ON COLUMN password_reset_tokens.ip_address IS 'IP address that requested the reset for security audit';
