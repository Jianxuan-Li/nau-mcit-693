package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"gpxbase/backend/models"
)

type SpatialRouteHandler struct {
	db *pgxpool.Pool
}

func NewSpatialRouteHandler(db *pgxpool.Pool) *SpatialRouteHandler {
	return &SpatialRouteHandler{
		db: db,
	}
}

type BoundsParams struct {
	MinLat float64
	MaxLat float64
	MinLng float64
	MaxLng float64
}

type PaginationParams struct {
	Page  int
	Limit int
}

func validateAndGetBoundsParameters(c *gin.Context) (*BoundsParams, error) {
	minLatStr := c.Query("min_lat")
	maxLatStr := c.Query("max_lat")
	minLngStr := c.Query("min_lng")
	maxLngStr := c.Query("max_lng")

	// Check for missing parameters
	if minLatStr == "" {
		return nil, fmt.Errorf("min_lat parameter is required")
	}
	if maxLatStr == "" {
		return nil, fmt.Errorf("max_lat parameter is required")
	}
	if minLngStr == "" {
		return nil, fmt.Errorf("min_lng parameter is required")
	}
	if maxLngStr == "" {
		return nil, fmt.Errorf("max_lng parameter is required")
	}

	// Parse min_lat
	minLat, err := strconv.ParseFloat(minLatStr, 64)
	if err != nil {
		return nil, fmt.Errorf("Invalid min_lat parameter: must be a valid number")
	}
	if minLat < -90 || minLat > 90 {
		return nil, fmt.Errorf("Invalid min_lat: must be between -90 and 90")
	}

	// Parse max_lat
	maxLat, err := strconv.ParseFloat(maxLatStr, 64)
	if err != nil {
		return nil, fmt.Errorf("Invalid max_lat parameter: must be a valid number")
	}
	if maxLat < -90 || maxLat > 90 {
		return nil, fmt.Errorf("Invalid max_lat: must be between -90 and 90")
	}

	// Parse min_lng
	minLng, err := strconv.ParseFloat(minLngStr, 64)
	if err != nil {
		return nil, fmt.Errorf("Invalid min_lng parameter: must be a valid number")
	}
	if minLng < -180 || minLng > 180 {
		return nil, fmt.Errorf("Invalid min_lng: must be between -180 and 180")
	}

	// Parse max_lng
	maxLng, err := strconv.ParseFloat(maxLngStr, 64)
	if err != nil {
		return nil, fmt.Errorf("Invalid max_lng parameter: must be a valid number")
	}
	if maxLng < -180 || maxLng > 180 {
		return nil, fmt.Errorf("Invalid max_lng: must be between -180 and 180")
	}

	// Validate bounds relationships
	if minLat >= maxLat {
		return nil, fmt.Errorf("Invalid bounds: min_lat must be less than max_lat")
	}
	if minLng >= maxLng {
		return nil, fmt.Errorf("Invalid bounds: min_lng must be less than max_lng")
	}

	return &BoundsParams{
		MinLat: minLat,
		MaxLat: maxLat,
		MinLng: minLng,
		MaxLng: maxLng,
	}, nil
}

func validateAndGetPaginationParameters(c *gin.Context) *PaginationParams {
	page := c.DefaultQuery("page", "1")
	limit := c.DefaultQuery("limit", "50")

	pageNum := 1
	limitNum := 50
	if p, err := strconv.Atoi(page); err == nil && p > 0 {
		pageNum = p
	}
	if l, err := strconv.Atoi(limit); err == nil && l > 0 && l <= 200 {
		limitNum = l
	}

	return &PaginationParams{
		Page:  pageNum,
		Limit: limitNum,
	}
}

// GetRoutesInBounds retrieves routes whose center points are within the specified map bounds
func (h *SpatialRouteHandler) GetRoutesInBounds(c *gin.Context) {
	log.Printf("INFO: Fetching routes within map bounds")

	bounds, err := validateAndGetBoundsParameters(c)
	if err != nil {
		log.Printf("ERROR: Invalid bounds parameters: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	pagination := validateAndGetPaginationParameters(c)

	// Create bounding box polygon for PostGIS query
	// ST_MakeEnvelope creates a rectangular polygon from min/max coordinates
	query := `
		SELECT r.id, r.user_id, r.name, r.difficulty, r.scenery_description, r.additional_notes,
		       r.max_elevation_gain, r.estimated_duration,
		       r.average_speed, r.start_time, r.end_time, r.like_count, r.save_count,
		       r.filename, r.file_size, r.created_at, r.updated_at,
		       ST_AsGeoJSON(ST_Force2D(center_point)) as center_point_geojson,
		       ST_AsGeoJSON(ST_Force2D(simplified_path)) as simplified_path_geojson,
		       route_length_km,
		       ST_AsGeoJSON(ST_Force2D(bounding_box)) as bounding_box_geojson,
		       u.id, u.email, u.name, u.created_at, u.is_active, u.email_verified, u.last_login
		FROM routes r
		JOIN users u ON r.user_id = u.id
		WHERE u.is_active = true
		  AND r.center_point IS NOT NULL
		  AND ST_Within(r.center_point, ST_MakeEnvelope($1, $2, $3, $4, 4326))
		LIMIT $5 OFFSET $6
	`

	offset := (pagination.Page - 1) * pagination.Limit
	
	args := []interface{}{bounds.MinLng, bounds.MinLat, bounds.MaxLng, bounds.MaxLat, pagination.Limit, offset}

	log.Printf("INFO: Searching routes in bounds: lat[%.6f, %.6f], lng[%.6f, %.6f], page=%d, limit=%d", 
		bounds.MinLat, bounds.MaxLat, bounds.MinLng, bounds.MaxLng, pagination.Page, pagination.Limit)

	ctx := context.Background()
	rows, err := h.db.Query(ctx, query, args...)
	if err != nil {
		log.Printf("ERROR: Failed to query routes in bounds: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch routes",
		})
		return
	}
	defer rows.Close()

	var routes []models.RouteWithUserResponse
	for rows.Next() {
		var route models.Route
		var user models.User
		var centerPointGeoJSON *string
		var simplifiedPathGeoJSON *string
		var boundingBoxGeoJSON *string
		
		err := rows.Scan(
			&route.ID, &route.UserID, &route.Name, &route.Difficulty,
			&route.SceneryDescription, &route.AdditionalNotes,
			&route.MaxElevationGain, &route.EstimatedDuration,
			&route.AverageSpeed, &route.StartTime, &route.EndTime,
			&route.LikeCount, &route.SaveCount,
			&route.Filename, &route.FileSize, &route.CreatedAt, &route.UpdatedAt,
			&centerPointGeoJSON, &simplifiedPathGeoJSON,
			&route.RouteLength, &boundingBoxGeoJSON,
			&user.ID, &user.Email, &user.Name, &user.CreatedAt, &user.IsActive, &user.EmailVerified, &user.LastLogin,
		)
		if err != nil {
			log.Printf("ERROR: Failed to scan route data: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to scan route data",
			})
			return
		}

		// Set GeoJSON fields
		route.CenterPoint = centerPointGeoJSON
		route.SimplifiedPath = simplifiedPathGeoJSON
		route.BoundingBox = boundingBoxGeoJSON
		
		userResponse := user.ToPublicResponse()
		routeWithUser := route.ToResponseWithUser(userResponse)
		routes = append(routes, routeWithUser)
	}

	// Get total count for pagination
	countQuery := `
		SELECT COUNT(*)
		FROM routes r
		JOIN users u ON r.user_id = u.id
		WHERE u.is_active = true
		  AND r.center_point IS NOT NULL
		  AND ST_Within(r.center_point, ST_MakeEnvelope($1, $2, $3, $4, 4326))
	`
	
	countArgs := []interface{}{bounds.MinLng, bounds.MinLat, bounds.MaxLng, bounds.MaxLat}

	var totalCount int
	err = h.db.QueryRow(ctx, countQuery, countArgs...).Scan(&totalCount)
	if err != nil {
		log.Printf("ERROR: Failed to get total count for bounds query: %v", err)
		totalCount = -1
	}

	totalPages := -1
	if totalCount > 0 {
		totalPages = (totalCount + pagination.Limit - 1) / pagination.Limit
	}

	log.Printf("INFO: Successfully fetched %d routes within bounds (page %d, limit %d, total %d)", 
		len(routes), pagination.Page, pagination.Limit, totalCount)
	
	c.JSON(http.StatusOK, gin.H{
		"routes": routes,
		"bounds": gin.H{
			"min_lat": bounds.MinLat,
			"max_lat": bounds.MaxLat,
			"min_lng": bounds.MinLng,
			"max_lng": bounds.MaxLng,
		},
		"pagination": gin.H{
			"page":        pagination.Page,
			"limit":       pagination.Limit,
			"total_count": totalCount,
			"total_pages": totalPages,
		},
	})
}