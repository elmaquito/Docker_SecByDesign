-- Migration 001: Add Profiles Table
-- Description: Extend users with profiles (classe, promotion, niveau)
-- Author: GitHub Copilot Agent
-- Date: 2024-12-12

-- Create profiles table with 1-1 relationship to users
CREATE TABLE IF NOT EXISTS profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    classe VARCHAR(50),           -- ex: "Cyber1", "Dev1", "Cyber2"
    promotion VARCHAR(50),        -- ex: "2024-2025", "2023-2024"
    niveau VARCHAR(20),           -- ex: "Bac+1", "Bac+2", "Bac+3", "Bac+4", "Bac+5"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on user_id for faster lookups
CREATE INDEX idx_profiles_user_id ON profiles(user_id);

-- Create index on classe for filtering
CREATE INDEX idx_profiles_classe ON profiles(classe);

-- Create index on promotion for filtering
CREATE INDEX idx_profiles_promotion ON profiles(promotion);

-- Create index on niveau for filtering
CREATE INDEX idx_profiles_niveau ON profiles(niveau);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE profiles IS 'User profiles with educational information (classe, promotion, niveau)';
COMMENT ON COLUMN profiles.classe IS 'Class name (e.g., Cyber1, Dev1)';
COMMENT ON COLUMN profiles.promotion IS 'Promotion year (e.g., 2024-2025)';
COMMENT ON COLUMN profiles.niveau IS 'Education level (e.g., Bac+1, Bac+2)';
