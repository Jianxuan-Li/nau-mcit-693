-- Add permanent geometry storage field and remove temp_geojson
-- Migration: 009_add_permanent_geometry_storage.sql

BEGIN;

-- Remove the temporary geojson field (no longer needed)
DROP INDEX IF EXISTS idx_routes_temp_geojson;
ALTER TABLE routes DROP COLUMN IF EXISTS temp_geojson;

-- Add new compact geometry storage field using PostGIS GEOMETRY type
-- This is much more space-efficient than storing GeoJSON text
ALTER TABLE routes ADD COLUMN original_geometry GEOMETRY(LINESTRING, 4326);

-- Add spatial index for efficient geometry queries (if needed)
CREATE INDEX idx_routes_original_geometry ON routes USING GIST (original_geometry);

-- Add comment explaining the purpose
COMMENT ON COLUMN routes.original_geometry IS 'Original route geometry from GPX file stored in compact PostGIS format for backup/analysis';

COMMIT;