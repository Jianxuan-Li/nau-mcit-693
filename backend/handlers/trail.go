package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"gpxbase/backend/models"
)

type TrailHandler struct {
	db *pgxpool.Pool
}

func NewTrailHandler(db *pgxpool.Pool) *TrailHandler {
	log.Printf("INFO: Trail handler initialized")
	return &TrailHandler{
		db: db,
	}
}

// CreateTrail creates a new trail
func (h *TrailHandler) CreateTrail(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		log.Printf("ERROR: CreateTrail - User not authenticated")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}
	log.Printf("INFO: Creating trail for user: %s", userID.(string))

	var req models.TrailCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("ERROR: Invalid trail creation request for user %s: %v", userID.(string), err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	// Validate GPX ownership if gpx_id is provided
	if req.GPXID != nil {
		if err := h.validateGPXOwnership(*req.GPXID, userID.(string)); err != nil {
			log.Printf("ERROR: GPX ownership validation failed for user %s, GPX %s: %v", userID.(string), req.GPXID.String(), err)
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid GPX file or access denied",
			})
			return
		}
	}

	// Create trail
	trail := models.Trail{
		ID:                uuid.New(),
		UserID:            uuid.MustParse(userID.(string)),
		GPXID:             req.GPXID,
		Name:              req.Name,
		Difficulty:        req.Difficulty,
		SceneryDescription: req.SceneryDescription,
		AdditionalNotes:   req.AdditionalNotes,
		TotalDistance:     req.TotalDistance,
		MaxElevationGain:  req.MaxElevationGain,
		EstimatedDuration: req.EstimatedDuration,
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}

	query := `
		INSERT INTO trails (id, user_id, gpx_id, name, difficulty, scenery_description, 
		                   additional_notes, total_distance, max_elevation_gain, estimated_duration, 
		                   created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`

	ctx := context.Background()
	log.Printf("INFO: Inserting trail record into database: %s", trail.ID.String())
	_, err := h.db.Exec(ctx, query,
		trail.ID, trail.UserID, trail.GPXID, trail.Name, trail.Difficulty,
		trail.SceneryDescription, trail.AdditionalNotes, trail.TotalDistance,
		trail.MaxElevationGain, trail.EstimatedDuration, trail.CreatedAt, trail.UpdatedAt,
	)

	if err != nil {
		log.Printf("ERROR: Failed to create trail for user %s: %v", userID.(string), err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create trail",
		})
		return
	}

	response := trail.ToResponse()
	log.Printf("INFO: Trail created successfully for user %s: %s (ID: %s)", userID.(string), trail.Name, trail.ID.String())
	c.JSON(http.StatusCreated, gin.H{
		"message": "Trail created successfully",
		"trail":   response,
	})
}

// GetUserTrails gets all trails for the authenticated user
func (h *TrailHandler) GetUserTrails(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		log.Printf("ERROR: GetUserTrails - User not authenticated")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}
	log.Printf("INFO: Fetching trails for user: %s", userID.(string))

	query := `
		SELECT t.id, t.user_id, t.gpx_id, t.name, t.difficulty, t.scenery_description,
		       t.additional_notes, t.total_distance, t.max_elevation_gain, t.estimated_duration,
		       t.created_at, t.updated_at, g.filename
		FROM trails t
		LEFT JOIN gpx_files g ON t.gpx_id = g.id
		WHERE t.user_id = $1
		ORDER BY t.created_at DESC
	`

	ctx := context.Background()
	rows, err := h.db.Query(ctx, query, userID.(string))
	if err != nil {
		log.Printf("ERROR: Failed to query trails for user %s: %v", userID.(string), err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch trails",
		})
		return
	}
	defer rows.Close()

	var trails []models.TrailResponse
	for rows.Next() {
		var trail models.TrailResponse
		var gpxFilename *string

		err := rows.Scan(&trail.ID, &trail.UserID, &trail.GPXID, &trail.Name, &trail.Difficulty,
			&trail.SceneryDescription, &trail.AdditionalNotes, &trail.TotalDistance,
			&trail.MaxElevationGain, &trail.EstimatedDuration, &trail.CreatedAt, &trail.UpdatedAt,
			&gpxFilename)
		if err != nil {
			log.Printf("ERROR: Failed to scan trail data for user %s: %v", userID.(string), err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to scan trail data",
			})
			return
		}

		trail.GPXFilename = gpxFilename
		trails = append(trails, trail)
	}

	log.Printf("INFO: Successfully fetched %d trails for user %s", len(trails), userID.(string))
	c.JSON(http.StatusOK, gin.H{
		"trails": trails,
	})
}

// GetTrail gets a specific trail by ID
func (h *TrailHandler) GetTrail(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		log.Printf("ERROR: GetTrail - User not authenticated")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}

	trailID := c.Param("id")
	if trailID == "" {
		log.Printf("ERROR: GetTrail - Trail ID is required for user %s", userID.(string))
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Trail ID is required",
		})
		return
	}
	log.Printf("INFO: Fetching trail %s for user %s", trailID, userID.(string))

	query := `
		SELECT t.id, t.user_id, t.gpx_id, t.name, t.difficulty, t.scenery_description,
		       t.additional_notes, t.total_distance, t.max_elevation_gain, t.estimated_duration,
		       t.created_at, t.updated_at, g.filename
		FROM trails t
		LEFT JOIN gpx_files g ON t.gpx_id = g.id
		WHERE t.id = $1 AND t.user_id = $2
	`

	var trail models.TrailResponse
	var gpxFilename *string

	ctx := context.Background()
	err := h.db.QueryRow(ctx, query, trailID, userID.(string)).Scan(
		&trail.ID, &trail.UserID, &trail.GPXID, &trail.Name, &trail.Difficulty,
		&trail.SceneryDescription, &trail.AdditionalNotes, &trail.TotalDistance,
		&trail.MaxElevationGain, &trail.EstimatedDuration, &trail.CreatedAt, &trail.UpdatedAt,
		&gpxFilename,
	)

	if err != nil {
		if err.Error() == "no rows in result set" {
			log.Printf("WARN: Trail not found: %s for user %s", trailID, userID.(string))
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Trail not found",
			})
			return
		}
		log.Printf("ERROR: Failed to fetch trail %s for user %s: %v", trailID, userID.(string), err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch trail",
		})
		return
	}

	trail.GPXFilename = gpxFilename
	log.Printf("INFO: Successfully fetched trail %s for user %s", trailID, userID.(string))
	c.JSON(http.StatusOK, gin.H{
		"trail": trail,
	})
}

// UpdateTrail updates an existing trail
func (h *TrailHandler) UpdateTrail(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		log.Printf("ERROR: UpdateTrail - User not authenticated")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}

	trailID := c.Param("id")
	if trailID == "" {
		log.Printf("ERROR: UpdateTrail - Trail ID is required for user %s", userID.(string))
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Trail ID is required",
		})
		return
	}
	log.Printf("INFO: Updating trail %s for user %s", trailID, userID.(string))

	var req models.TrailUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("ERROR: Invalid trail update request for user %s, trail %s: %v", userID.(string), trailID, err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	// Build dynamic update query
	updateFields := []string{}
	args := []interface{}{}
	argIndex := 1

	if req.Name != nil {
		updateFields = append(updateFields, fmt.Sprintf("name = $%d", argIndex))
		args = append(args, *req.Name)
		argIndex++
	}
	if req.Difficulty != nil {
		updateFields = append(updateFields, fmt.Sprintf("difficulty = $%d", argIndex))
		args = append(args, *req.Difficulty)
		argIndex++
	}
	if req.SceneryDescription != nil {
		updateFields = append(updateFields, fmt.Sprintf("scenery_description = $%d", argIndex))
		args = append(args, *req.SceneryDescription)
		argIndex++
	}
	if req.AdditionalNotes != nil {
		updateFields = append(updateFields, fmt.Sprintf("additional_notes = $%d", argIndex))
		args = append(args, *req.AdditionalNotes)
		argIndex++
	}
	if req.TotalDistance != nil {
		updateFields = append(updateFields, fmt.Sprintf("total_distance = $%d", argIndex))
		args = append(args, *req.TotalDistance)
		argIndex++
	}
	if req.MaxElevationGain != nil {
		updateFields = append(updateFields, fmt.Sprintf("max_elevation_gain = $%d", argIndex))
		args = append(args, *req.MaxElevationGain)
		argIndex++
	}
	if req.EstimatedDuration != nil {
		updateFields = append(updateFields, fmt.Sprintf("estimated_duration = $%d", argIndex))
		args = append(args, *req.EstimatedDuration)
		argIndex++
	}

	if len(updateFields) == 0 {
		log.Printf("WARN: No fields to update for trail %s, user %s", trailID, userID.(string))
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "No fields to update",
		})
		return
	}

	// Add updated_at field
	updateFields = append(updateFields, fmt.Sprintf("updated_at = $%d", argIndex))
	args = append(args, time.Now())
	argIndex++

	// Add WHERE conditions
	args = append(args, trailID, userID.(string))

	query := fmt.Sprintf("UPDATE trails SET %s WHERE id = $%d AND user_id = $%d",
		strings.Join(updateFields, ", "), argIndex, argIndex+1)

	ctx := context.Background()
	result, err := h.db.Exec(ctx, query, args...)
	if err != nil {
		log.Printf("ERROR: Failed to update trail %s for user %s: %v", trailID, userID.(string), err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update trail",
		})
		return
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		log.Printf("WARN: Trail not found for update: %s for user %s", trailID, userID.(string))
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Trail not found",
		})
		return
	}

	log.Printf("INFO: Trail updated successfully: %s for user %s", trailID, userID.(string))
	c.JSON(http.StatusOK, gin.H{
		"message": "Trail updated successfully",
	})
}

// DeleteTrail deletes a trail
func (h *TrailHandler) DeleteTrail(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		log.Printf("ERROR: DeleteTrail - User not authenticated")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}

	trailID := c.Param("id")
	if trailID == "" {
		log.Printf("ERROR: DeleteTrail - Trail ID is required for user %s", userID.(string))
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Trail ID is required",
		})
		return
	}
	log.Printf("INFO: Deleting trail %s for user %s", trailID, userID.(string))

	query := `DELETE FROM trails WHERE id = $1 AND user_id = $2`

	ctx := context.Background()
	result, err := h.db.Exec(ctx, query, trailID, userID.(string))
	if err != nil {
		log.Printf("ERROR: Failed to delete trail %s for user %s: %v", trailID, userID.(string), err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete trail",
		})
		return
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		log.Printf("WARN: Trail not found for deletion: %s for user %s", trailID, userID.(string))
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Trail not found",
		})
		return
	}

	log.Printf("INFO: Trail deleted successfully: %s for user %s", trailID, userID.(string))
	c.JSON(http.StatusOK, gin.H{
		"message": "Trail deleted successfully",
	})
}

// validateGPXOwnership validates that the user owns the specified GPX file
func (h *TrailHandler) validateGPXOwnership(gpxID uuid.UUID, userID string) error {
	query := `SELECT id FROM gpx_files WHERE id = $1 AND user_id = $2`
	
	ctx := context.Background()
	var id uuid.UUID
	err := h.db.QueryRow(ctx, query, gpxID, userID).Scan(&id)
	if err != nil {
		if err.Error() == "no rows in result set" {
			return fmt.Errorf("GPX file not found or access denied")
		}
		return err
	}
	return nil
}