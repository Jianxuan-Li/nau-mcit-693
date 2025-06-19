-- Add geographical features to routes table
-- Migration: Add center point, convex hull polygon, and low-precision path for web display

-- Add PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add center point column (stores the center point of the route)
ALTER TABLE routes ADD COLUMN center_point GEOMETRY(POINT, 4326);

-- Add convex hull polygon column (stores the minimum convex hull of the route)
ALTER TABLE routes ADD COLUMN convex_hull GEOMETRY(POLYGON, 4326);

-- Add low-precision path column for web GeoJSON display
-- Using LINESTRING with reduced precision for faster web rendering
ALTER TABLE routes ADD COLUMN simplified_path GEOMETRY(LINESTRING, 4326);

-- Add spatial indexes for better query performance
CREATE INDEX idx_routes_center_point ON routes USING GIST (center_point);
CREATE INDEX idx_routes_convex_hull ON routes USING GIST (convex_hull);
CREATE INDEX idx_routes_simplified_path ON routes USING GIST (simplified_path);

-- Add comments to document the purpose of each column
COMMENT ON COLUMN routes.center_point IS 'Center point of the route in WGS84 coordinates';
COMMENT ON COLUMN routes.convex_hull IS 'Minimum convex hull polygon of the route in WGS84 coordinates';
COMMENT ON COLUMN routes.simplified_path IS 'Simplified low-precision path for web GeoJSON display in WGS84 coordinates';