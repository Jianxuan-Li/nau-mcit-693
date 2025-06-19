package services

import (
	"context"
	"fmt"
	"log"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// GeoService handles geographical processing using PostGIS
type GeoService struct {
	db *pgxpool.Pool
}

// NewGeoService creates a new GeoService instance
func NewGeoService(db *pgxpool.Pool) *GeoService {
	return &GeoService{
		db: db,
	}
}

// GeoFeatures represents the calculated geographical features
type GeoFeatures struct {
	CenterPoint    *string  `json:"center_point"`
	ConvexHull     *string  `json:"convex_hull"`
	SimplifiedPath *string  `json:"simplified_path"`
	RouteLength    *float64 `json:"route_length_km"`
	BoundingBox    *string  `json:"bounding_box"`
}

// ProcessGeoJSONWithPostGIS processes GeoJSON data using PostGIS functions
func (gs *GeoService) ProcessGeoJSONWithPostGIS(ctx context.Context, routeID uuid.UUID, geoJSONStr string) (*GeoFeatures, error) {
	log.Printf("INFO: Processing GeoJSON with PostGIS for route: %s", routeID.String())

	// Step 1: Store GeoJSON temporarily in the database
	err := gs.storeTemporaryGeoJSON(ctx, routeID, geoJSONStr)
	if err != nil {
		return nil, fmt.Errorf("failed to store temporary GeoJSON: %w", err)
	}

	// Step 2: Extract main geometry from GeoJSON and calculate features
	features, err := gs.calculateGeoFeatures(ctx, routeID)
	if err != nil {
		// Clean up temporary data even if calculation fails
		gs.cleanupTemporaryGeoJSON(ctx, routeID)
		return nil, fmt.Errorf("failed to calculate geo features: %w", err)
	}

	// Step 3: Update route with calculated features
	err = gs.updateRouteWithGeoFeatures(ctx, routeID, features)
	if err != nil {
		// Clean up temporary data
		gs.cleanupTemporaryGeoJSON(ctx, routeID)
		return nil, fmt.Errorf("failed to update route with geo features: %w", err)
	}

	// Step 4: Clean up temporary GeoJSON data
	err = gs.cleanupTemporaryGeoJSON(ctx, routeID)
	if err != nil {
		log.Printf("WARN: Failed to cleanup temporary GeoJSON for route %s: %v", routeID.String(), err)
		// Don't fail the entire operation for cleanup errors
	}

	log.Printf("INFO: Successfully processed GeoJSON with PostGIS for route: %s", routeID.String())
	return features, nil
}

// storeTemporaryGeoJSON stores GeoJSON data in the temporary field
func (gs *GeoService) storeTemporaryGeoJSON(ctx context.Context, routeID uuid.UUID, geoJSONStr string) error {
	query := `UPDATE routes SET temp_geojson = $1 WHERE id = $2`
	
	_, err := gs.db.Exec(ctx, query, geoJSONStr, routeID)
	if err != nil {
		return fmt.Errorf("failed to store temporary GeoJSON: %w", err)
	}
	
	return nil
}

// calculateGeoFeatures uses PostGIS to calculate geographical features from GeoJSON
func (gs *GeoService) calculateGeoFeatures(ctx context.Context, routeID uuid.UUID) (*GeoFeatures, error) {
	// Complex PostGIS query to extract and calculate all geo features from GeoJSON
	// Handle both 2D and 3D geometries (with elevation)
	query := `
		WITH geom_data AS (
			-- Extract LineString geometries from GeoJSON features
			SELECT 
				ST_GeomFromGeoJSON(feature->>'geometry') as geom
			FROM routes,
				 jsonb_array_elements(temp_geojson->'features') as feature
			WHERE id = $1
			  AND feature->'geometry'->>'type' = 'LineString'
			LIMIT 1  -- Get the first/main LineString
		),
		main_geom AS (
			SELECT 
				-- Ensure geometry has Z dimension, add 0 if missing
				CASE 
					WHEN ST_NDims(geom) = 3 THEN geom
					ELSE ST_Force3D(geom)
				END as geom
			FROM geom_data 
			WHERE geom IS NOT NULL 
			LIMIT 1
		)
		SELECT 
			-- Center point (centroid of the line) - force 3D
			ST_AsText(ST_Force3D(ST_Centroid(geom))) as center_point,
			
			-- Convex hull (minimum convex polygon containing all points) - force 3D  
			ST_AsText(ST_Force3D(ST_ConvexHull(geom))) as convex_hull,
			
			-- Simplified path (reduce points by ~95% for web display) - force 3D
			-- Using tolerance of 0.001 degrees (~111 meters at equator)
			ST_AsText(ST_Force3D(ST_Simplify(geom, 0.001))) as simplified_path,
			
			-- Route length in kilometers (works with both 2D and 3D)
			-- Transform to Web Mercator for accurate distance calculation
			ST_Length(ST_Transform(ST_Force2D(geom), 3857)) / 1000.0 as route_length_km,
			
			-- Bounding box (envelope) - force 3D
			ST_AsText(ST_Force3D(ST_Envelope(geom))) as bounding_box
			
		FROM main_geom
	`

	var features GeoFeatures
	err := gs.db.QueryRow(ctx, query, routeID).Scan(
		&features.CenterPoint,
		&features.ConvexHull,
		&features.SimplifiedPath,
		&features.RouteLength,
		&features.BoundingBox,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to calculate geo features: %w", err)
	}

	return &features, nil
}

// updateRouteWithGeoFeatures updates the route record with calculated geographical features
func (gs *GeoService) updateRouteWithGeoFeatures(ctx context.Context, routeID uuid.UUID, features *GeoFeatures) error {
	query := `
		UPDATE routes SET
			center_point = ST_GeomFromText($1, 4326),
			convex_hull = ST_GeomFromText($2, 4326),
			simplified_path = ST_GeomFromText($3, 4326),
			route_length_km = $4,
			bounding_box = ST_GeomFromText($5, 4326),
			updated_at = NOW()
		WHERE id = $6
	`

	_, err := gs.db.Exec(ctx, query,
		*features.CenterPoint,
		*features.ConvexHull,
		*features.SimplifiedPath,
		*features.RouteLength,
		*features.BoundingBox,
		routeID,
	)

	if err != nil {
		return fmt.Errorf("failed to update route with geo features: %w", err)
	}

	return nil
}

// cleanupTemporaryGeoJSON removes the temporary GeoJSON data
func (gs *GeoService) cleanupTemporaryGeoJSON(ctx context.Context, routeID uuid.UUID) error {
	query := `UPDATE routes SET temp_geojson = NULL WHERE id = $1`
	
	_, err := gs.db.Exec(ctx, query, routeID)
	if err != nil {
		return fmt.Errorf("failed to cleanup temporary GeoJSON: %w", err)
	}
	
	return nil
}

// GetRouteGeoFeatures retrieves geographical features for a route
func (gs *GeoService) GetRouteGeoFeatures(ctx context.Context, routeID uuid.UUID) (*GeoFeatures, error) {
	query := `
		SELECT 
			ST_AsText(center_point) as center_point,
			ST_AsText(convex_hull) as convex_hull,
			ST_AsText(simplified_path) as simplified_path,
			route_length_km,
			ST_AsText(bounding_box) as bounding_box
		FROM routes 
		WHERE id = $1
	`

	var features GeoFeatures
	err := gs.db.QueryRow(ctx, query, routeID).Scan(
		&features.CenterPoint,
		&features.ConvexHull,
		&features.SimplifiedPath,
		&features.RouteLength,
		&features.BoundingBox,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get route geo features: %w", err)
	}

	return &features, nil
}