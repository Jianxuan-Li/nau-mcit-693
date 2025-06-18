-- Migration to merge gpx_files and trails tables into a unified routes table
-- This creates a single table that contains both file information and route metadata

-- Step 1: Create the new unified routes table
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    
    -- Route metadata
    name VARCHAR(255) NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'moderate', 'hard', 'expert')),
    scenery_description TEXT,
    additional_notes TEXT,
    total_distance DECIMAL(10,3) NOT NULL CHECK (total_distance >= 0), -- in kilometers
    max_elevation_gain DECIMAL(8,2) NOT NULL DEFAULT 0 CHECK (max_elevation_gain >= 0), -- in meters
    estimated_duration INTEGER NOT NULL CHECK (estimated_duration >= 0), -- in minutes
    
    -- GPX file information
    filename VARCHAR(255) NOT NULL,
    r2_object_key VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_route_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Step 2: Create indexes for performance
CREATE INDEX idx_routes_user_id ON routes(user_id);
CREATE INDEX idx_routes_difficulty ON routes(difficulty);
CREATE INDEX idx_routes_created_at ON routes(created_at);
CREATE INDEX idx_routes_name ON routes(name);
CREATE INDEX idx_routes_r2_object_key ON routes(r2_object_key);

-- Step 4: Add comments for documentation
COMMENT ON TABLE routes IS 'Unified table containing both route metadata and GPX file information';
COMMENT ON COLUMN routes.name IS 'User-defined name for the route';
COMMENT ON COLUMN routes.difficulty IS 'Route difficulty level: easy, moderate, hard, expert';
COMMENT ON COLUMN routes.total_distance IS 'Total route distance in kilometers';
COMMENT ON COLUMN routes.max_elevation_gain IS 'Maximum elevation gain in meters';
COMMENT ON COLUMN routes.estimated_duration IS 'Estimated completion time in minutes';
COMMENT ON COLUMN routes.filename IS 'Original GPX filename';
COMMENT ON COLUMN routes.r2_object_key IS 'Cloudflare R2 object key for the GPX file';
COMMENT ON COLUMN routes.file_size IS 'GPX file size in bytes';

-- Step 5: Drop old tables (uncomment when ready)
DROP TABLE trails;
DROP TABLE gpx_files;