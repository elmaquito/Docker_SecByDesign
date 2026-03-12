-- Migration 009: Add User Tags
-- Description: Link users to tags (for groups, specialties, etc.)
-- Author: GitHub Copilot Agent
-- Date: 2026-03-12

-- User Tags table (Many-to-Many)
CREATE TABLE IF NOT EXISTS user_tags (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, tag_id)
);

-- Indexes
CREATE INDEX idx_user_tags_user_id ON user_tags(user_id);
CREATE INDEX idx_user_tags_tag_id ON user_tags(tag_id);

-- Comments
COMMENT ON TABLE user_tags IS 'Associations between users and tags (e.g., User belongs to Group A)';
