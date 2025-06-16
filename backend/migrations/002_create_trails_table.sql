-- Create trails table in PostgreSQL
CREATE TABLE IF NOT EXISTS trails (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    gpx_id UUID NULL,
    name VARCHAR(255) NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'moderate', 'hard', 'expert')),
    scenery_description TEXT,
    additional_notes TEXT,
    total_distance DECIMAL(10,3) NOT NULL CHECK (total_distance >= 0), -- in kilometers
    max_elevation_gain DECIMAL(8,2) NOT NULL DEFAULT 0 CHECK (max_elevation_gain >= 0), -- in meters
    estimated_duration INTEGER NOT NULL CHECK (estimated_duration >= 0), -- in minutes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_trail_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_trail_gpx_id FOREIGN KEY (gpx_id) REFERENCES gpx_files(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trails_user_id ON trails(user_id);
CREATE INDEX IF NOT EXISTS idx_trails_gpx_id ON trails(gpx_id);
CREATE INDEX IF NOT EXISTS idx_trails_difficulty ON trails(difficulty);
CREATE INDEX IF NOT EXISTS idx_trails_created_at ON trails(created_at);
CREATE INDEX IF NOT EXISTS idx_trails_name ON trails(name);