-- Migration 003: Add Note Targets
-- Description: Add note_targets table for fine-grained note assignment
-- Author: GitHub Copilot Agent
-- Date: 2024-12-12

-- Note targets table (who should see this note)
CREATE TABLE IF NOT EXISTS note_targets (
    id SERIAL PRIMARY KEY,
    note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE NOT NULL,
    target_type VARCHAR(20) CHECK (target_type IN ('user', 'classe', 'promotion', 'niveau', 'all')) NOT NULL,
    target_value VARCHAR(50),    -- user_id, class name, etc., or NULL for 'all'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_note_targets_note_id ON note_targets(note_id);
CREATE INDEX idx_note_targets_type ON note_targets(target_type);
CREATE INDEX idx_note_targets_value ON note_targets(target_value);
CREATE INDEX idx_note_targets_composite ON note_targets(note_id, target_type, target_value);

-- Comments
COMMENT ON TABLE note_targets IS 'Defines who can see each note (user, classe, promotion, niveau, or all)';
COMMENT ON COLUMN note_targets.target_type IS 'Type of target: user, classe, promotion, niveau, or all';
COMMENT ON COLUMN note_targets.target_value IS 'Specific value (user ID, class name, etc.) or NULL for all';

-- Add additional fields to notes table for feed functionality
ALTER TABLE notes ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS urgent BOOLEAN DEFAULT FALSE;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Indexes on new columns
CREATE INDEX idx_notes_pinned ON notes(pinned);
CREATE INDEX idx_notes_urgent ON notes(urgent);
CREATE INDEX idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX idx_notes_updated_at ON notes(updated_at DESC);

-- Trigger for notes updated_at
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments on new columns
COMMENT ON COLUMN notes.pinned IS 'Whether note is pinned at top of feed';
COMMENT ON COLUMN notes.urgent IS 'Whether note is marked as urgent';
COMMENT ON COLUMN notes.view_count IS 'Number of times the note has been viewed';
COMMENT ON COLUMN notes.updated_at IS 'Last update timestamp';
