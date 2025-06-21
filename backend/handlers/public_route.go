package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"gpxbase/backend/models"
	"gpxbase/backend/storage"
	"gpxbase/backend/utils"
)

const (
	// DownloadURLExpirationMinutes is the fixed expiration time for download URLs
	DownloadURLExpirationMinutes = 10
	// PublicDownloadURLExpirationMinutes is the expiration time for public download URLs (shorter for security)
	PublicDownloadURLExpirationMinutes = 1
)

type PublicRouteHandler struct {
	db      *pgxpool.Pool
	storage storage.FileStorage
}

func NewPublicRouteHandler(db *pgxpool.Pool) *PublicRouteHandler {
	// Initialize R2 storage
	r2Storage, err := storage.NewR2Storage()
	if err != nil {
		log.Printf("ERROR: Failed to initialize R2 storage: %v", err)
		log.Fatal("Failed to initialize R2 storage")
	}

	log.Printf("INFO: R2 storage initialized successfully for PublicRouteHandler")

	return &PublicRouteHandler{
		db:      db,
		storage: r2Storage,
	}
}

// GetAllRoutes retrieves all routes from all users (public endpoint)
func (h *PublicRouteHandler) GetAllRoutes(c *gin.Context) {
	log.Printf("INFO: Fetching all routes from all users")

	// Parse query parameters for filtering and pagination
	page := c.DefaultQuery("page", "1")
	limit := c.DefaultQuery("limit", "20")
	difficulty := c.Query("difficulty")
	search := c.Query("search")

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
	`

	args := []interface{}{}
	argIndex := 1

	// Add difficulty filter
	if difficulty != "" {
		query += fmt.Sprintf(" AND r.difficulty = $%d", argIndex)
		args = append(args, difficulty)
		argIndex++
	}

	// Add search filter
	if search != "" {
		query += fmt.Sprintf(" AND (r.name ILIKE $%d OR r.scenery_description ILIKE $%d)", argIndex, argIndex)
		searchTerm := "%" + search + "%"
		args = append(args, searchTerm)
		argIndex++
	}

	// Add ordering
	query += " ORDER BY r.created_at DESC"

	// Add pagination
	query += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	
	// Parse pagination parameters
	pageNum := 1
	limitNum := 20
	if p, err := strconv.Atoi(page); err == nil && p > 0 {
		pageNum = p
	}
	if l, err := strconv.Atoi(limit); err == nil && l > 0 && l <= 100 {
		limitNum = l
	}
	offset := (pageNum - 1) * limitNum
	
	args = append(args, limitNum, offset)

	ctx := context.Background()
	rows, err := h.db.Query(ctx, query, args...)
	if err != nil {
		log.Printf("ERROR: Failed to query all routes: %v", err)
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
	`
	
	countArgs := []interface{}{}
	argIndex = 1

	if difficulty != "" {
		countQuery += fmt.Sprintf(" AND r.difficulty = $%d", argIndex)
		countArgs = append(countArgs, difficulty)
		argIndex++
	}

	if search != "" {
		countQuery += fmt.Sprintf(" AND (r.name ILIKE $%d OR r.scenery_description ILIKE $%d)", argIndex, argIndex)
		searchTerm := "%" + search + "%"
		countArgs = append(countArgs, searchTerm)
		argIndex++
	}

	var totalCount int
	err = h.db.QueryRow(ctx, countQuery, countArgs...).Scan(&totalCount)
	if err != nil {
		log.Printf("ERROR: Failed to get total count: %v", err)
		// Continue without total count
		totalCount = -1
	}

	totalPages := -1
	if totalCount > 0 {
		totalPages = (totalCount + limitNum - 1) / limitNum
	}

	log.Printf("INFO: Successfully fetched %d routes (page %d, limit %d)", len(routes), pageNum, limitNum)
	c.JSON(http.StatusOK, gin.H{
		"routes":      routes,
		"pagination": gin.H{
			"page":        pageNum,
			"limit":       limitNum,
			"total_count": totalCount,
			"total_pages": totalPages,
		},
	})
}

// GenerateDownloadURL generates a presigned URL for downloading a GPX file
// Users must be authenticated but can download any user's GPX file
func (h *PublicRouteHandler) GenerateDownloadURL(c *gin.Context) {
	// Get user ID from context (authentication required)
	userID, exists := c.Get("userID")
	if !exists {
		log.Printf("ERROR: GenerateDownloadURL - User not authenticated")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}

	routeID := c.Param("id")
	if routeID == "" {
		log.Printf("ERROR: GenerateDownloadURL - Route ID is required for user %s", userID.(string))
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Route ID is required",
		})
		return
	}

	log.Printf("INFO: Generating download URL for route %s by user %s", routeID, userID.(string))

	// Get route information and R2 object key
	query := `
		SELECT r.id, r.user_id, r.name, r.filename, r.r2_object_key, r.file_size,
		       u.name as creator_name
		FROM routes r
		JOIN users u ON r.user_id = u.id
		WHERE r.id = $1
	`

	var route struct {
		ID           string `json:"id"`
		UserID       string `json:"user_id"`
		Name         string `json:"name"`
		Filename     string `json:"filename"`
		R2ObjectKey  string `json:"r2_object_key"`
		FileSize     int64  `json:"file_size"`
		CreatorName  string `json:"creator_name"`
	}

	ctx := context.Background()
	err := h.db.QueryRow(ctx, query, routeID).Scan(
		&route.ID, &route.UserID, &route.Name, &route.Filename,
		&route.R2ObjectKey, &route.FileSize, &route.CreatorName,
	)

	if err != nil {
		if err.Error() == "no rows in result set" {
			log.Printf("WARN: Route not found for download URL generation: %s by user %s", routeID, userID.(string))
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Route not found",
			})
			return
		}
		log.Printf("ERROR: Failed to fetch route for download URL generation %s by user %s: %v", routeID, userID.(string), err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch route",
		})
		return
	}

	// Generate presigned URL for file access
	log.Printf("INFO: Generating presigned URL for route file: %s", route.R2ObjectKey)
	presignedURL, err := h.storage.GetPresignedURLWithFilename(route.R2ObjectKey, time.Duration(DownloadURLExpirationMinutes)*time.Minute, utils.GenerateGPXFileName(route.Name, route.ID))
	if err != nil {
		log.Printf("ERROR: Failed to generate presigned URL for %s: %v", route.R2ObjectKey, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to generate download URL",
		})
		return
	}

	expiresAt := time.Now().Add(time.Duration(DownloadURLExpirationMinutes) * time.Minute).Format(time.RFC3339)

	// Log the download request for audit purposes
	log.Printf("INFO: Download URL generated successfully for route %s (%s) by user %s, expires at %s", 
		routeID, route.Name, userID.(string), expiresAt)

	c.JSON(http.StatusOK, gin.H{
		"download_url": presignedURL,
		"expires_at":   expiresAt,
		"route_info": gin.H{
			"id":           route.ID,
			"name":         route.Name,
			"filename":     route.Filename,
			"file_size":    route.FileSize,
			"creator_name": route.CreatorName,
		},
	})
}

// GeneratePublicDownloadURL generates a presigned URL for downloading a GPX file (public access, no authentication required)
// Note: Uses shorter expiration time (1 minute) for security
func (h *PublicRouteHandler) GeneratePublicDownloadURL(c *gin.Context) {
	routeID := c.Param("id")
	if routeID == "" {
		log.Printf("ERROR: GeneratePublicDownloadURL - Route ID is required")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Route ID is required",
		})
		return
	}

	log.Printf("INFO: Generating public download URL for route %s", routeID)

	// Get route information and R2 object key
	query := `
		SELECT r.id, r.user_id, r.name, r.filename, r.r2_object_key, r.file_size,
		       u.name as creator_name
		FROM routes r
		JOIN users u ON r.user_id = u.id
		WHERE r.id = $1 AND u.is_active = true
	`

	var route struct {
		ID           string `json:"id"`
		UserID       string `json:"user_id"`
		Name         string `json:"name"`
		Filename     string `json:"filename"`
		R2ObjectKey  string `json:"r2_object_key"`
		FileSize     int64  `json:"file_size"`
		CreatorName  string `json:"creator_name"`
	}

	ctx := context.Background()
	err := h.db.QueryRow(ctx, query, routeID).Scan(
		&route.ID, &route.UserID, &route.Name, &route.Filename,
		&route.R2ObjectKey, &route.FileSize, &route.CreatorName,
	)

	if err != nil {
		if err.Error() == "no rows in result set" {
			log.Printf("WARN: Route not found for public download URL generation: %s", routeID)
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Route not found",
			})
			return
		}
		log.Printf("ERROR: Failed to fetch route for public download URL generation %s: %v", routeID, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch route",
		})
		return
	}

	// Generate presigned URL for file access with shorter expiration
	log.Printf("INFO: Generating public presigned URL for route file: %s", route.R2ObjectKey)
	presignedURL, err := h.storage.GetPresignedURLWithFilename(route.R2ObjectKey, time.Duration(PublicDownloadURLExpirationMinutes)*time.Minute, utils.GenerateGPXFileName(route.Name, route.ID))
	if err != nil {
		log.Printf("ERROR: Failed to generate public presigned URL for %s: %v", route.R2ObjectKey, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to generate download URL",
		})
		return
	}

	expiresAt := time.Now().Add(time.Duration(PublicDownloadURLExpirationMinutes) * time.Minute).Format(time.RFC3339)

	// Log the public download request for audit purposes
	log.Printf("INFO: Public download URL generated successfully for route %s (%s), expires at %s", 
		routeID, route.Name, expiresAt)

	c.JSON(http.StatusOK, gin.H{
		"download_url": presignedURL,
		"expires_at":   expiresAt,
		"route_info": gin.H{
			"id":           route.ID,
			"name":         route.Name,
			"filename":     route.Filename,
			"file_size":    route.FileSize,
			"creator_name": route.CreatorName,
		},
	})
} 