-- Migration 007: Add Reactions System
-- Description: Allow users to react to posts with thumbs up/down
-- Author: GitHub Copilot Agent
-- Date: 2024-12-12

-- Reactions table
CREATE TABLE IF NOT EXISTS reactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE NOT NULL,
    reaction_type VARCHAR(10) CHECK (reaction_type IN ('up', 'down')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, note_id)  -- One reaction per user per note
);

-- Indexes for performance
CREATE INDEX idx_reactions_user_id ON reactions(user_id);
CREATE INDEX idx_reactions_note_id ON reactions(note_id);
CREATE INDEX idx_reactions_reaction_type ON reactions(reaction_type);

-- Trigger for updated_at
CREATE TRIGGER update_reactions_updated_at BEFORE UPDATE ON reactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add materialized columns to notes for reaction counts (optional - for performance)
ALTER TABLE notes ADD COLUMN IF NOT EXISTS reactions_up INTEGER DEFAULT 0;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS reactions_down INTEGER DEFAULT 0;

-- Function to update reaction counts
CREATE OR REPLACE FUNCTION update_note_reaction_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalculate counts for the affected note
    IF TG_OP = 'DELETE' THEN
        UPDATE notes SET
            reactions_up = (SELECT COUNT(*) FROM reactions WHERE note_id = OLD.note_id AND reaction_type = 'up'),
            reactions_down = (SELECT COUNT(*) FROM reactions WHERE note_id = OLD.note_id AND reaction_type = 'down')
        WHERE id = OLD.note_id;
        RETURN OLD;
    ELSE
        UPDATE notes SET
            reactions_up = (SELECT COUNT(*) FROM reactions WHERE note_id = NEW.note_id AND reaction_type = 'up'),
            reactions_down = (SELECT COUNT(*) FROM reactions WHERE note_id = NEW.note_id AND reaction_type = 'down')
        WHERE id = NEW.note_id;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update reaction counts
CREATE TRIGGER update_note_reactions_on_insert
    AFTER INSERT ON reactions
    FOR EACH ROW EXECUTE FUNCTION update_note_reaction_counts();

CREATE TRIGGER update_note_reactions_on_update
    AFTER UPDATE ON reactions
    FOR EACH ROW EXECUTE FUNCTION update_note_reaction_counts();

CREATE TRIGGER update_note_reactions_on_delete
    AFTER DELETE ON reactions
    FOR EACH ROW EXECUTE FUNCTION update_note_reaction_counts();

-- Comments
COMMENT ON TABLE reactions IS 'User reactions (thumbs up/down) on notes';
COMMENT ON COLUMN reactions.reaction_type IS 'Type of reaction: up or down';
COMMENT ON COLUMN notes.reactions_up IS 'Cached count of thumbs up reactions';
COMMENT ON COLUMN notes.reactions_down IS 'Cached count of thumbs down reactions';
