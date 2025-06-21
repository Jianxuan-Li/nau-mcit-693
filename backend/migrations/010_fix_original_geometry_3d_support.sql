-- Fix original_geometry column to support 3D coordinates (Z dimension)
-- Migration: 010_fix_original_geometry_3d_support.sql

BEGIN;

-- Update original_geometry column to support 3D LineString (with elevation data)
-- This fixes the error: "Geometry has Z dimension but column does not"
ALTER TABLE routes ALTER COLUMN original_geometry TYPE geometry(LineStringZ,4326);

-- Add comment for documentation
COMMENT ON COLUMN routes.original_geometry IS 'Original route geometry from GPX file stored in compact PostGIS format for backup/analysis (supports 3D with elevation)';

COMMIT;