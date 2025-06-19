-- Test script to verify 3D geometry processing
-- Run this after applying migration 007

-- Check if PostGIS extension is available
SELECT PostGIS_Version();

-- Test 3D geometry creation
SELECT ST_AsText(ST_GeomFromText('POINT Z(116.397 39.917 50)', 4326)) as test_3d_point;

-- Test sample GeoJSON processing similar to what our code does
WITH test_geojson AS (
    SELECT '{"type":"FeatureCollection","features":[{"type":"Feature","properties":{"name":"test","type":"track"},"geometry":{"type":"LineString","coordinates":[[116.397,39.917,50],[116.398,39.918,55],[116.399,39.919,60]]}}]}'::jsonb as geojson
),
geom_data AS (
    SELECT 
        ST_GeomFromGeoJSON(feature->>'geometry') as geom
    FROM test_geojson,
         jsonb_array_elements(geojson->'features') as feature
    WHERE feature->'geometry'->>'type' = 'LineString'
    LIMIT 1
),
main_geom AS (
    SELECT 
        CASE 
            WHEN ST_NDims(geom) = 3 THEN geom
            ELSE ST_Force3D(geom)
        END as geom
    FROM geom_data 
    WHERE geom IS NOT NULL 
    LIMIT 1
)
SELECT 
    ST_AsText(ST_Force3D(ST_Centroid(geom))) as center_point,
    ST_AsText(ST_Force3D(ST_ConvexHull(geom))) as convex_hull,
    ST_AsText(ST_Force3D(ST_Simplify(geom, 0.001))) as simplified_path,
    ST_Length(ST_Transform(ST_Force2D(geom), 3857)) / 1000.0 as route_length_km,
    ST_AsText(ST_Force3D(ST_Envelope(geom))) as bounding_box
FROM main_geom;

-- Check current routes table structure
\d+ routes;

-- Show any existing routes and their geo features
SELECT 
    id, 
    name,
    ST_AsText(center_point) as center_point,
    route_length_km
FROM routes 
LIMIT 3;