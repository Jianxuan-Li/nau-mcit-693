-- Add timing and social fields to routes table, remove redundant total_distance
-- Migration: 008_add_route_timing_and_social_fields.sql

BEGIN;

-- Remove redundant total_distance field (route_length_km is calculated by PostGIS)
ALTER TABLE routes DROP COLUMN IF EXISTS total_distance;

-- Change estimated_duration to nullable since it's now calculated from GPX
-- Handle case where constraint might not exist
DO $$ BEGIN
    ALTER TABLE routes ALTER COLUMN estimated_duration DROP NOT NULL;
EXCEPTION
    WHEN undefined_column THEN
        -- Column doesn't exist, skip
        NULL;
    WHEN others THEN
        -- Other errors, re-raise
        RAISE;
END $$;

-- Add average speed field (km/h) - calculated from GPX timing and PostGIS distance
ALTER TABLE routes ADD COLUMN average_speed DECIMAL(8,2) CHECK (average_speed >= 0);

-- Add start and end time fields extracted from GPX timestamps
ALTER TABLE routes ADD COLUMN start_time TIMESTAMPTZ;
ALTER TABLE routes ADD COLUMN end_time TIMESTAMPTZ;

-- Add social features
ALTER TABLE routes ADD COLUMN like_count INTEGER NOT NULL DEFAULT 0 CHECK (like_count >= 0);
ALTER TABLE routes ADD COLUMN save_count INTEGER NOT NULL DEFAULT 0 CHECK (save_count >= 0);

-- Add indexes for performance on social fields (for sorting/filtering by popularity)
CREATE INDEX idx_routes_like_count ON routes(like_count DESC);
CREATE INDEX idx_routes_save_count ON routes(save_count DESC);

-- Add index on start_time for temporal queries
CREATE INDEX idx_routes_start_time ON routes(start_time);

-- Add comments for documentation
COMMENT ON COLUMN routes.estimated_duration IS 'Calculated duration from GPX timestamps in minutes';
COMMENT ON COLUMN routes.average_speed IS 'Calculated average speed from GPX timing and PostGIS distance in km/h';
COMMENT ON COLUMN routes.start_time IS 'Start time extracted from GPX timestamps (with timezone)';
COMMENT ON COLUMN routes.end_time IS 'End time extracted from GPX timestamps (with timezone)';
COMMENT ON COLUMN routes.like_count IS 'Number of likes from other users';
COMMENT ON COLUMN routes.save_count IS 'Number of times route was saved by other users';

COMMIT;