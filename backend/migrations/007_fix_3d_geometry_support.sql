-- Fix 3D geometry support for routes table
-- Migration: Update geometry columns to support Z dimension (elevation)

-- Drop existing indexes
DROP INDEX IF EXISTS idx_routes_center_point;
DROP INDEX IF EXISTS idx_routes_convex_hull;
DROP INDEX IF EXISTS idx_routes_simplified_path;
DROP INDEX IF EXISTS idx_routes_bounding_box;

-- Update geometry columns to support 3D coordinates (Z dimension for elevation)
ALTER TABLE routes ALTER COLUMN center_point TYPE GEOMETRY(POINTZ, 4326);
ALTER TABLE routes ALTER COLUMN convex_hull TYPE GEOMETRY(POLYGONZ, 4326);
ALTER TABLE routes ALTER COLUMN simplified_path TYPE GEOMETRY(LINESTRINGZ, 4326);
ALTER TABLE routes ALTER COLUMN bounding_box TYPE GEOMETRY(POLYGONZ, 4326);

-- Recreate spatial indexes
CREATE INDEX idx_routes_center_point ON routes USING GIST (center_point);
CREATE INDEX idx_routes_convex_hull ON routes USING GIST (convex_hull);
CREATE INDEX idx_routes_simplified_path ON routes USING GIST (simplified_path);
CREATE INDEX idx_routes_bounding_box ON routes USING GIST (bounding_box);

-- Update comments to reflect 3D support
COMMENT ON COLUMN routes.center_point IS 'Calculated center point of the route using PostGIS ST_Centroid (supports elevation)';
COMMENT ON COLUMN routes.convex_hull IS 'Minimum convex hull polygon calculated using PostGIS ST_ConvexHull (supports elevation)';
COMMENT ON COLUMN routes.simplified_path IS 'Simplified path with 95% reduction in points using PostGIS ST_Simplify for web display (supports elevation)';
COMMENT ON COLUMN routes.bounding_box IS 'Route bounding box calculated using PostGIS ST_Envelope (supports elevation)';