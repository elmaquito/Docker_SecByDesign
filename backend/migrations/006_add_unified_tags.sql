-- Migration 006: Add Unified Tags System
-- Description: Unified tagging system for notes (classe, specialite, groupe, categorie)
-- Author: GitHub Copilot Agent
-- Date: 2024-12-12

-- Drop existing note_themes if it exists (we'll use unified tags instead)
-- Keep themes table for now but add new tags table

-- Tags table (unified system for classe, specialite, groupe, categorie)
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) CHECK (type IN ('classe', 'specialite', 'groupe', 'categorie')) NOT NULL,
    name VARCHAR(100) NOT NULL,
    meta JSONB DEFAULT '{}',  -- Additional metadata (color, icon, etc.)
    is_default_for_student_view BOOLEAN DEFAULT FALSE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (type, name)  -- Each tag name must be unique within its type
);

-- Note-Tag association (many-to-many)
CREATE TABLE IF NOT EXISTS note_tags (
    note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (note_id, tag_id)
);

-- Indexes for performance
CREATE INDEX idx_tags_type ON tags(type);
CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_tags_is_default ON tags(is_default_for_student_view);
CREATE INDEX idx_note_tags_note_id ON note_tags(note_id);
CREATE INDEX idx_note_tags_tag_id ON note_tags(tag_id);

-- Trigger for updated_at
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE tags IS 'Unified tagging system for notes: classe, specialite, groupe, categorie';
COMMENT ON COLUMN tags.type IS 'Tag type: classe, specialite, groupe, or categorie';
COMMENT ON COLUMN tags.name IS 'Tag name (e.g., "Cyber1", "Pentest", "Groupe A", "Urgent")';
COMMENT ON COLUMN tags.meta IS 'JSON metadata for tag (color, icon, description, etc.)';
COMMENT ON COLUMN tags.is_default_for_student_view IS 'If true, this tag is pre-selected in student view filters';

-- Insert default tags
INSERT INTO tags (type, name, meta, is_default_for_student_view) VALUES
    -- Classes
    ('classe', 'Cyber1', '{"color": "blue"}', false),
    ('classe', 'Cyber2', '{"color": "blue"}', false),
    ('classe', 'Dev1', '{"color": "green"}', false),
    ('classe', 'Dev2', '{"color": "green"}', false),
    ('classe', 'Tous', '{"color": "gray"}', true),
    
    -- Specialites
    ('specialite', 'Cybersécurité', '{"color": "red"}', false),
    ('specialite', 'Développement', '{"color": "purple"}', false),
    ('specialite', 'Réseau', '{"color": "cyan"}', false),
    ('specialite', 'Cloud', '{"color": "orange"}', false),
    
    -- Groupes
    ('groupe', 'Groupe A', '{"color": "yellow"}', false),
    ('groupe', 'Groupe B', '{"color": "yellow"}', false),
    ('groupe', 'Groupe C', '{"color": "yellow"}', false),
    
    -- Categories/Etiquettes
    ('categorie', 'Urgent', '{"color": "red"}', false),
    ('categorie', 'Important', '{"color": "orange"}', false),
    ('categorie', 'Info', '{"color": "blue"}', false),
    ('categorie', 'Examen', '{"color": "purple"}', false),
    ('categorie', 'Projet', '{"color": "green"}', false),
    ('categorie', 'Cours', '{"color": "cyan"}', false)
ON CONFLICT (type, name) DO NOTHING;
