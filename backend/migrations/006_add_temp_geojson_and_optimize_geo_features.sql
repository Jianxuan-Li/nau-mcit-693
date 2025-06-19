-- Update geographical features with temporary GeoJSON field and PostGIS optimization
-- Migration: Add temporary GeoJSON field, optimize spatial calculations

-- Add temporary GeoJSON field to store converted GPX data during processing
ALTER TABLE routes ADD COLUMN temp_geojson JSONB;

-- Update existing geographical fields with better documentation
COMMENT ON COLUMN routes.center_point IS 'Calculated center point of the route using PostGIS ST_Centroid';
COMMENT ON COLUMN routes.convex_hull IS 'Minimum convex hull polygon calculated using PostGIS ST_ConvexHull';
COMMENT ON COLUMN routes.simplified_path IS 'Simplified path with 95% reduction in points using PostGIS ST_Simplify for web display';

-- Add computed columns for additional route metrics (these will be calculated and stored)
ALTER TABLE routes ADD COLUMN route_length_km DECIMAL(10,3);
ALTER TABLE routes ADD COLUMN bounding_box GEOMETRY(POLYGON, 4326);

-- Add indexes for the new fields
CREATE INDEX idx_routes_temp_geojson ON routes USING GIN (temp_geojson);
CREATE INDEX idx_routes_route_length ON routes (route_length_km);
CREATE INDEX idx_routes_bounding_box ON routes USING GIST (bounding_box);

-- Add comments for new fields
COMMENT ON COLUMN routes.temp_geojson IS 'Temporary GeoJSON data converted from GPX - will be deleted after processing';
COMMENT ON COLUMN routes.route_length_km IS 'Calculated route length in kilometers using PostGIS ST_Length';
COMMENT ON COLUMN routes.bounding_box IS 'Route bounding box calculated using PostGIS ST_Envelope';