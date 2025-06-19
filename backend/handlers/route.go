package handlers

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"gpxbase/backend/models"
	"gpxbase/backend/storage"
	"gpxbase/backend/utils"
)

type RouteHandler struct {
	db      *pgxpool.Pool
	storage storage.FileStorage
}

func NewRouteHandler(db *pgxpool.Pool) *RouteHandler {
	// Initialize R2 storage
	r2Storage, err := storage.NewR2Storage()
	if err != nil {
		log.Printf("ERROR: Failed to initialize R2 storage: %v", err)
		log.Fatal("Failed to initialize R2 storage")
	}

	log.Printf("INFO: R2 storage initialized successfully for RouteHandler")

	return &RouteHandler{
		db:      db,
		storage: r2Storage,
	}
}

// CreateRoute handles GPX file upload and route creation in a single operation
func (h *RouteHandler) CreateRoute(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("userID")
	if !exists {
		log.Printf("ERROR: Route creation - User not authenticated")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}
	log.Printf("INFO: Route creation initiated by user: %s", userID.(string))

	// Parse multipart form
	err := c.Request.ParseMultipartForm(20 << 20) // 20 MB max
	if err != nil {
		log.Printf("ERROR: Failed to parse multipart form for user %s: %v", userID.(string), err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Failed to parse form data",
		})
		return
	}

	// Get the GPX file from form
	file, header, err := c.Request.FormFile("gpx_file")
	if err != nil {
		log.Printf("ERROR: Failed to get GPX file from form for user %s: %v", userID.(string), err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "GPX file is required",
		})
		return
	}
	defer file.Close()
	log.Printf("INFO: Processing GPX file upload: %s (size: %d bytes)", header.Filename, header.Size)

	// Validate file extension
	filename := header.Filename
	if !strings.HasSuffix(strings.ToLower(filename), ".gpx") {
		log.Printf("ERROR: Invalid file extension for user %s: %s", userID.(string), filename)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "File must have .gpx extension",
		})
		return
	}

	// Read file content
	content, err := io.ReadAll(file)
	if err != nil {
		log.Printf("ERROR: Failed to read file content for user %s, file %s: %v", userID.(string), filename, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to read file content",
		})
		return
	}

	// Basic GPX content validation
	contentStr := string(content)
	if !strings.Contains(contentStr, "<gpx") || !strings.Contains(contentStr, "</gpx>") {
		log.Printf("ERROR: Invalid GPX file format for user %s, file %s: missing GPX tags", userID.(string), filename)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid GPX file format",
		})
		return
	}

	// Parse route metadata from form
	var routeReq models.RouteCreateRequest
	if err := c.ShouldBind(&routeReq); err != nil {
		log.Printf("ERROR: Failed to parse route metadata for user %s: %v", userID.(string), err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid route metadata: " + err.Error(),
		})
		return
	}

	// Generate unique route ID and R2 object key
	routeID := uuid.New()
	userIDStr := userID.(string)
	objectKey := storage.GenerateObjectKey(userIDStr, routeID.String(), filename)
	log.Printf("INFO: Uploading GPX file to R2 with key: %s", objectKey)

	// Upload file to R2
	fileReader := bytes.NewReader(content)
	if err := h.storage.UploadFile(objectKey, fileReader, "application/gpx+xml"); err != nil {
		log.Printf("ERROR: Failed to upload file to R2 %s: %v", objectKey, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to upload file to storage",
		})
		return
	}

	// Create route record
	route := models.Route{
		ID:                 routeID,
		UserID:             uuid.MustParse(userIDStr),
		Name:               routeReq.Name,
		Difficulty:         routeReq.Difficulty,
		SceneryDescription: routeReq.SceneryDescription,
		AdditionalNotes:    routeReq.AdditionalNotes,
		TotalDistance:      routeReq.TotalDistance,
		MaxElevationGain:   routeReq.MaxElevationGain,
		EstimatedDuration:  routeReq.EstimatedDuration,
		Filename:           filename,
		R2ObjectKey:        objectKey,
		FileSize:           int64(len(content)),
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}

	// Insert into database
	query := `
		INSERT INTO routes (
			id, user_id, name, difficulty, scenery_description, additional_notes,
			total_distance, max_elevation_gain, estimated_duration,
			filename, r2_object_key, file_size, created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
	`

	ctx := context.Background()
	log.Printf("INFO: Inserting route record into database: %s", routeID.String())
	_, err = h.db.Exec(ctx, query,
		route.ID, route.UserID, route.Name, route.Difficulty,
		route.SceneryDescription, route.AdditionalNotes,
		route.TotalDistance, route.MaxElevationGain, route.EstimatedDuration,
		route.Filename, route.R2ObjectKey, route.FileSize,
		route.CreatedAt, route.UpdatedAt,
	)

	if err != nil {
		log.Printf("ERROR: Failed to insert route record for user %s, file %s: %v", userIDStr, filename, err)
		// Clean up the uploaded file if database insert fails
		if removeErr := h.storage.DeleteFile(objectKey); removeErr != nil {
			log.Printf("ERROR: Failed to cleanup file after DB error %s: %v", objectKey, removeErr)
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to save route",
		})
		return
	}

	response := route.ToResponse()
	log.Printf("INFO: Route created successfully for user %s: %s (ID: %s)", userIDStr, route.Name, routeID.String())
	c.JSON(http.StatusCreated, gin.H{
		"message": "Route created successfully",
		"route":   response,
	})
}

// GetUserRoutes retrieves all routes for the authenticated user
func (h *RouteHandler) GetUserRoutes(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		log.Printf("ERROR: GetUserRoutes - User not authenticated")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}
	log.Printf("INFO: Fetching routes for user: %s", userID.(string))

	query := `
		SELECT id, user_id, name, difficulty, scenery_description, additional_notes,
		       total_distance, max_elevation_gain, estimated_duration,
		       filename, file_size, created_at, updated_at
		FROM routes 
		WHERE user_id = $1
		ORDER BY created_at DESC
	`

	ctx := context.Background()
	rows, err := h.db.Query(ctx, query, userID.(string))
	if err != nil {
		log.Printf("ERROR: Failed to query routes for user %s: %v", userID.(string), err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch routes",
		})
		return
	}
	defer rows.Close()

	var routes []models.RouteResponse
	for rows.Next() {
		var route models.RouteResponse
		
		err := rows.Scan(
			&route.ID, &route.UserID, &route.Name, &route.Difficulty,
			&route.SceneryDescription, &route.AdditionalNotes,
			&route.TotalDistance, &route.MaxElevationGain, &route.EstimatedDuration,
			&route.Filename, &route.FileSize, &route.CreatedAt, &route.UpdatedAt,
		)
		if err != nil {
			log.Printf("ERROR: Failed to scan route data for user %s: %v", userID.(string), err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to scan route data",
			})
			return
		}

		routes = append(routes, route)
	}

	log.Printf("INFO: Successfully fetched %d routes for user %s", len(routes), userID.(string))
	c.JSON(http.StatusOK, gin.H{
		"routes": routes,
	})
}

// GetRoute retrieves a specific route with download URL
func (h *RouteHandler) GetRoute(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		log.Printf("ERROR: GetRoute - User not authenticated")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}

	routeID := c.Param("id")
	if routeID == "" {
		log.Printf("ERROR: GetRoute - Route ID is required for user %s", userID.(string))
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Route ID is required",
		})
		return
	}
	log.Printf("INFO: Fetching route %s for user %s", routeID, userID.(string))

	query := `
		SELECT id, user_id, name, difficulty, scenery_description, additional_notes,
		       total_distance, max_elevation_gain, estimated_duration,
		       filename, r2_object_key, file_size, created_at, updated_at
		FROM routes 
		WHERE id = $1 AND user_id = $2
	`

	var route models.Route
	
	ctx := context.Background()
	err := h.db.QueryRow(ctx, query, routeID, userID.(string)).Scan(
		&route.ID, &route.UserID, &route.Name, &route.Difficulty,
		&route.SceneryDescription, &route.AdditionalNotes,
		&route.TotalDistance, &route.MaxElevationGain, &route.EstimatedDuration,
		&route.Filename, &route.R2ObjectKey, &route.FileSize,
		&route.CreatedAt, &route.UpdatedAt,
	)

	if err != nil {
		if err.Error() == "no rows in result set" {
			log.Printf("WARN: Route not found: %s for user %s", routeID, userID.(string))
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Route not found",
			})
			return
		}
		log.Printf("ERROR: Failed to fetch route %s for user %s: %v", routeID, userID.(string), err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch route",
		})
		return
	}

	// Generate presigned URL for file access
	log.Printf("INFO: Generating presigned URL for route file: %s", route.R2ObjectKey)
	presignedURL, err := h.storage.GetPresignedURLWithFilename(route.R2ObjectKey, 15*time.Minute, utils.GenerateGPXFileName(route.Name, route.ID.String()))
	if err != nil {
		log.Printf("ERROR: Failed to generate presigned URL for %s: %v", route.R2ObjectKey, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to generate file access URL",
		})
		return
	}

	expiresAt := time.Now().Add(15 * time.Minute).Format(time.RFC3339)
	response := route.ToDetailResponse(presignedURL, expiresAt)

	log.Printf("INFO: Successfully fetched route %s for user %s", routeID, userID.(string))
	c.JSON(http.StatusOK, gin.H{
		"route": response,
	})
}

// UpdateRoute updates route metadata (not the GPX file)
func (h *RouteHandler) UpdateRoute(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		log.Printf("ERROR: UpdateRoute - User not authenticated")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}

	routeID := c.Param("id")
	if routeID == "" {
		log.Printf("ERROR: UpdateRoute - Route ID is required for user %s", userID.(string))
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Route ID is required",
		})
		return
	}

	var updateReq models.RouteUpdateRequest
	if err := c.ShouldBindJSON(&updateReq); err != nil {
		log.Printf("ERROR: Failed to parse route update request for user %s: %v", userID.(string), err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid update data: " + err.Error(),
		})
		return
	}

	log.Printf("INFO: Updating route %s for user %s", routeID, userID.(string))

	// Build dynamic update query
	setParts := []string{"updated_at = NOW()"}
	args := []interface{}{routeID, userID.(string)}
	argIndex := 3

	if updateReq.Name != nil {
		setParts = append(setParts, fmt.Sprintf("name = $%d", argIndex))
		args = append(args, *updateReq.Name)
		argIndex++
	}
	if updateReq.Difficulty != nil {
		setParts = append(setParts, fmt.Sprintf("difficulty = $%d", argIndex))
		args = append(args, *updateReq.Difficulty)
		argIndex++
	}
	if updateReq.SceneryDescription != nil {
		setParts = append(setParts, fmt.Sprintf("scenery_description = $%d", argIndex))
		args = append(args, *updateReq.SceneryDescription)
		argIndex++
	}
	if updateReq.AdditionalNotes != nil {
		setParts = append(setParts, fmt.Sprintf("additional_notes = $%d", argIndex))
		args = append(args, *updateReq.AdditionalNotes)
		argIndex++
	}
	if updateReq.TotalDistance != nil {
		setParts = append(setParts, fmt.Sprintf("total_distance = $%d", argIndex))
		args = append(args, *updateReq.TotalDistance)
		argIndex++
	}
	if updateReq.MaxElevationGain != nil {
		setParts = append(setParts, fmt.Sprintf("max_elevation_gain = $%d", argIndex))
		args = append(args, *updateReq.MaxElevationGain)
		argIndex++
	}
	if updateReq.EstimatedDuration != nil {
		setParts = append(setParts, fmt.Sprintf("estimated_duration = $%d", argIndex))
		args = append(args, *updateReq.EstimatedDuration)
		argIndex++
	}

	if len(setParts) == 1 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "No fields to update",
		})
		return
	}

	query := "UPDATE routes SET " + strings.Join(setParts, ", ") + " WHERE id = $1 AND user_id = $2"

	ctx := context.Background()
	result, err := h.db.Exec(ctx, query, args...)
	if err != nil {
		log.Printf("ERROR: Failed to update route %s for user %s: %v", routeID, userID.(string), err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update route",
		})
		return
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		log.Printf("WARN: No rows affected when updating route %s for user %s", routeID, userID.(string))
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Route not found",
		})
		return
	}

	log.Printf("INFO: Route updated successfully: %s for user %s", routeID, userID.(string))
	c.JSON(http.StatusOK, gin.H{
		"message": "Route updated successfully",
	})
}

// DeleteRoute removes a route and its associated GPX file
func (h *RouteHandler) DeleteRoute(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		log.Printf("ERROR: DeleteRoute - User not authenticated")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}

	routeID := c.Param("id")
	if routeID == "" {
		log.Printf("ERROR: DeleteRoute - Route ID is required for user %s", userID.(string))
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Route ID is required",
		})
		return
	}
	log.Printf("INFO: Deleting route %s for user %s", routeID, userID.(string))

	// First get the R2 object key to delete the file
	getQuery := `SELECT r2_object_key FROM routes WHERE id = $1 AND user_id = $2`
	var objectKey string
	ctx := context.Background()
	err := h.db.QueryRow(ctx, getQuery, routeID, userID.(string)).Scan(&objectKey)
	if err != nil {
		if err.Error() == "no rows in result set" {
			log.Printf("WARN: Route not found for deletion: %s for user %s", routeID, userID.(string))
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Route not found",
			})
			return
		}
		log.Printf("ERROR: Failed to fetch route for deletion %s for user %s: %v", routeID, userID.(string), err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch route",
		})
		return
	}

	// Delete from database first
	log.Printf("INFO: Deleting route record from database: %s", routeID)
	deleteQuery := `DELETE FROM routes WHERE id = $1 AND user_id = $2`
	result, err := h.db.Exec(ctx, deleteQuery, routeID, userID.(string))
	if err != nil {
		log.Printf("ERROR: Failed to delete route from database %s for user %s: %v", routeID, userID.(string), err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete route",
		})
		return
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		log.Printf("WARN: No rows affected when deleting route %s for user %s", routeID, userID.(string))
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Route not found",
		})
		return
	}

	// Delete the file from R2
	log.Printf("INFO: Deleting route file from R2: %s", objectKey)
	if err := h.storage.DeleteFile(objectKey); err != nil {
		// Log the error but don't fail the request as DB record is already deleted
		log.Printf("WARN: Failed to delete file from R2 %s: %v", objectKey, err)
	} else {
		log.Printf("INFO: Successfully deleted file from R2: %s", objectKey)
	}

	log.Printf("INFO: Route deleted successfully: %s for user %s", routeID, userID.(string))
	c.JSON(http.StatusOK, gin.H{
		"message": "Route deleted successfully",
	})
}