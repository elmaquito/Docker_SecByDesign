-- Migration 002: Add Themes and Categories
-- Description: Add themes and categories for note organization and targeting
-- Author: GitHub Copilot Agent
-- Date: 2024-12-12

-- Themes table (for organizing notes by topic)
CREATE TABLE IF NOT EXISTS themes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(20) DEFAULT 'blue',  -- For UI badge colors
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Categories table (for targeting notes to specific audiences)
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    target_type VARCHAR(20) CHECK (target_type IN ('classe', 'promotion', 'niveau', 'all')) NOT NULL,
    target_value VARCHAR(50),    -- Specific value or NULL for 'all'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Note-Theme association (many-to-many)
CREATE TABLE IF NOT EXISTS note_themes (
    note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
    theme_id INTEGER REFERENCES themes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (note_id, theme_id)
);

-- Note-Category association (many-to-many)
CREATE TABLE IF NOT EXISTS note_categories (
    note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (note_id, category_id)
);

-- Indexes for performance
CREATE INDEX idx_themes_name ON themes(name);
CREATE INDEX idx_categories_name ON categories(name);
CREATE INDEX idx_categories_target_type ON categories(target_type);
CREATE INDEX idx_categories_target_value ON categories(target_value);
CREATE INDEX idx_note_themes_note_id ON note_themes(note_id);
CREATE INDEX idx_note_themes_theme_id ON note_themes(theme_id);
CREATE INDEX idx_note_categories_note_id ON note_categories(note_id);
CREATE INDEX idx_note_categories_category_id ON note_categories(category_id);

-- Triggers for updated_at
CREATE TRIGGER update_themes_updated_at BEFORE UPDATE ON themes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE themes IS 'Thematic tags for organizing notes (e.g., Security, DevOps)';
COMMENT ON TABLE categories IS 'Categories for targeting notes to specific audiences';
COMMENT ON TABLE note_themes IS 'Many-to-many relationship between notes and themes';
COMMENT ON TABLE note_categories IS 'Many-to-many relationship between notes and categories';

-- Insert default themes
INSERT INTO themes (name, description, color) VALUES
    ('Sécurité', 'Cybersécurité, pentest, sécurité applicative', 'red'),
    ('DevOps', 'CI/CD, Docker, Kubernetes, automatisation', 'blue'),
    ('Cryptographie', 'Chiffrement, hashing, signatures, PKI', 'purple'),
    ('Réseau', 'TCP/IP, protocoles, architecture réseau', 'green'),
    ('Programmation', 'Langages, algorithmes, développement', 'orange'),
    ('Cloud', 'AWS, Azure, GCP, cloud computing', 'cyan'),
    ('Base de données', 'SQL, NoSQL, modélisation de données', 'yellow'),
    ('IA/ML', 'Intelligence artificielle, Machine Learning', 'pink')
ON CONFLICT (name) DO NOTHING;

-- Insert default categories (examples)
INSERT INTO categories (name, description, target_type, target_value) VALUES
    ('Tous les étudiants', 'Visible par tous les étudiants', 'all', NULL),
    ('Classe Cyber1', 'Étudiants de Cyber1', 'classe', 'Cyber1'),
    ('Classe Cyber2', 'Étudiants de Cyber2', 'classe', 'Cyber2'),
    ('Classe Dev1', 'Étudiants de Dev1', 'classe', 'Dev1'),
    ('Classe Dev2', 'Étudiants de Dev2', 'classe', 'Dev2'),
    ('Promotion 2024-2025', 'Promotion actuelle', 'promotion', '2024-2025'),
    ('Niveau Bac+1', 'Première année', 'niveau', 'Bac+1'),
    ('Niveau Bac+2', 'Deuxième année', 'niveau', 'Bac+2'),
    ('Niveau Bac+3', 'Troisième année', 'niveau', 'Bac+3')
ON CONFLICT (name) DO NOTHING;
