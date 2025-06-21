package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"gpxbase/backend/utils"
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

// ExtendedGeoFeatures includes both geographical and timing features
type ExtendedGeoFeatures struct {
	*GeoFeatures
	StartTime        *string  `json:"start_time"`
	EndTime          *string  `json:"end_time"`
	Duration         *int     `json:"duration_minutes"`
	AverageSpeed     *float64 `json:"average_speed_kmh"`
	MaxElevationGain *float64 `json:"max_elevation_gain"`
}

// ProcessGeoJSONWithPostGIS processes GeoJSON data using PostGIS functions
func (gs *GeoService) ProcessGeoJSONWithPostGIS(ctx context.Context, routeID uuid.UUID, geoJSONStr string) (*GeoFeatures, error) {
	log.Printf("INFO: Processing GeoJSON with PostGIS for route: %s", routeID.String())

	// Step 1: Store original geometry permanently in compact PostGIS format
	err := gs.storeOriginalGeometry(ctx, routeID, geoJSONStr)
	if err != nil {
		return nil, fmt.Errorf("failed to store original geometry: %w", err)
	}

	// Step 2: Calculate geographical features from stored geometry
	features, err := gs.calculateGeoFeatures(ctx, routeID)
	if err != nil {
		return nil, fmt.Errorf("failed to calculate geo features: %w", err)
	}

	// Step 3: Update route with calculated features
	err = gs.updateRouteWithGeoFeatures(ctx, routeID, features)
	if err != nil {
		// Clean up temporary data
		// gs.cleanupTemporaryGeoJSON(ctx, routeID)
		return nil, fmt.Errorf("failed to update route with geo features: %w", err)
	}

	// Step 4: Clean up temporary GeoJSON data
	// err = gs.cleanupTemporaryGeoJSON(ctx, routeID)
	if err != nil {
		log.Printf("WARN: Failed to cleanup temporary GeoJSON for route %s: %v", routeID.String(), err)
		// Don't fail the entire operation for cleanup errors
	}

	log.Printf("INFO: Successfully processed GeoJSON with PostGIS for route: %s", routeID.String())
	return features, nil
}

// storeOriginalGeometry stores the main route geometry in compact PostGIS format
func (gs *GeoService) storeOriginalGeometry(ctx context.Context, routeID uuid.UUID, geoJSONStr string) error {
	// Extract the main LineString geometry from GeoJSON and store in PostGIS format
	query := `
		UPDATE routes SET 
			original_geometry = (
				SELECT ST_GeomFromGeoJSON(feature->>'geometry')
				FROM jsonb_array_elements($1::jsonb->'features') as feature
				WHERE feature->'geometry'->>'type' = 'LineString'
				LIMIT 1
			)
		WHERE id = $2
	`
	
	_, err := gs.db.Exec(ctx, query, geoJSONStr, routeID)
	if err != nil {
		return fmt.Errorf("failed to store original geometry: %w", err)
	}
	
	return nil
}

// calculateGeoFeatures uses PostGIS to calculate geographical features from GeoJSON
func (gs *GeoService) calculateGeoFeatures(ctx context.Context, routeID uuid.UUID) (*GeoFeatures, error) {
	// Complex PostGIS query to calculate all geo features from stored original geometry
	// Handle both 2D and 3D geometries (with elevation)
	query := `
		WITH geom_data AS (
			-- Use the stored original geometry
			SELECT original_geometry as geom
			FROM routes
			WHERE id = $1
			  AND original_geometry IS NOT NULL
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

// ProcessGPXWithExtendedFeatures processes GPX content and calculates both geographical and timing features
func (gs *GeoService) ProcessGPXWithExtendedFeatures(ctx context.Context, routeID uuid.UUID, gpxContent []byte) (*ExtendedGeoFeatures, error) {
	log.Printf("INFO: Processing GPX with extended features for route: %s", routeID.String())

	// Step 1: Analyze GPX for timing and elevation data
	gpxStats, err := utils.AnalyzeGPXTiming(gpxContent)
	if err != nil {
		log.Printf("WARN: Failed to analyze GPX timing for route %s: %v", routeID.String(), err)
		// Continue with geographical processing even if timing analysis fails
		gpxStats = &utils.GPXStats{}
	}

	// Step 2: Convert GPX to GeoJSON and store original geometry
	geoJSONStr, err := utils.ProcessGPXToGeoJSON(gpxContent)
	if err != nil {
		return nil, fmt.Errorf("failed to convert GPX to GeoJSON: %w", err)
	}

	// Step 3: Store original geometry and calculate geographical features
	geoFeatures, err := gs.ProcessGeoJSONWithPostGIS(ctx, routeID, geoJSONStr)
	if err != nil {
		return nil, fmt.Errorf("failed to process geographical features: %w", err)
	}

	// Step 4: Combine features and calculate average speed
	extended := &ExtendedGeoFeatures{
		GeoFeatures:      geoFeatures,
		Duration:         gpxStats.Duration,
		MaxElevationGain: gpxStats.MaxElevationGain,
	}

	// Convert timestamps to string format for storage
	if gpxStats.StartTime != nil {
		startTimeStr := gpxStats.StartTime.Format(time.RFC3339)
		extended.StartTime = &startTimeStr
	}
	if gpxStats.EndTime != nil {
		endTimeStr := gpxStats.EndTime.Format(time.RFC3339)
		extended.EndTime = &endTimeStr
	}

	// Calculate average speed using PostGIS distance and GPX timing
	if geoFeatures.RouteLength != nil && gpxStats.Duration != nil && *gpxStats.Duration > 0 {
		avgSpeed := *geoFeatures.RouteLength / (float64(*gpxStats.Duration) / 60.0) // km/h
		extended.AverageSpeed = &avgSpeed
	}

	return extended, nil
}

// UpdateRouteWithExtendedFeatures updates a route with both geographical and timing features
func (gs *GeoService) UpdateRouteWithExtendedFeatures(ctx context.Context, routeID uuid.UUID, features *ExtendedGeoFeatures) error {
	log.Printf("INFO: Updating route %s with extended features", routeID.String())

	query := `
		UPDATE routes SET
			center_point = ST_GeomFromText($1, 4326),
			convex_hull = ST_GeomFromText($2, 4326),
			simplified_path = ST_GeomFromText($3, 4326),
			route_length_km = $4,
			bounding_box = ST_GeomFromText($5, 4326),
			start_time = $6,
			end_time = $7,
			estimated_duration = $8,
			average_speed = $9,
			max_elevation_gain = $10,
			updated_at = NOW()
		WHERE id = $11
	`

	// Convert string timestamps back to time.Time for database storage
	var startTime, endTime *time.Time
	if features.StartTime != nil {
		if t, err := time.Parse(time.RFC3339, *features.StartTime); err == nil {
			startTime = &t
		}
	}
	if features.EndTime != nil {
		if t, err := time.Parse(time.RFC3339, *features.EndTime); err == nil {
			endTime = &t
		}
	}

	_, err := gs.db.Exec(ctx, query,
		*features.CenterPoint,
		*features.ConvexHull,
		*features.SimplifiedPath,
		*features.RouteLength,
		*features.BoundingBox,
		startTime,
		endTime,
		features.Duration,
		features.AverageSpeed,
		features.MaxElevationGain,
		routeID,
	)

	if err != nil {
		return fmt.Errorf("failed to update route with extended features: %w", err)
	}

	log.Printf("INFO: Successfully updated route %s with extended features", routeID.String())
	return nil
}