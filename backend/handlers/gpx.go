package handlers

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"gpxbase/backend/models"
)

type GPXHandler struct {
	db       *pgxpool.Pool
	baseDir  string
}

func NewGPXHandler(db *pgxpool.Pool) *GPXHandler {
	// Get GPX files directory from environment variable, default to ./gpx_files
	baseDir := os.Getenv("GPX_FILES_DIR")
	if baseDir == "" {
		baseDir = "./gpx_files"
	}

	if err := os.MkdirAll(baseDir, 0755); err != nil {
		log.Printf("ERROR: Failed to create GPX files directory %s: %v", baseDir, err)
	} else {
		log.Printf("INFO: GPX files directory created/verified: %s", baseDir)
	}

	return &GPXHandler{
		db:      db,
		baseDir: baseDir,
	}
}

func (h *GPXHandler) UploadGPX(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("userID")
	if !exists {
		log.Printf("ERROR: GPX upload - User not authenticated")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}
	log.Printf("INFO: GPX upload initiated by user: %s", userID.(string))

	// Parse multipart form
	err := c.Request.ParseMultipartForm(10 << 20) // 10 MB max
	if err != nil {
		log.Printf("ERROR: Failed to parse multipart form for user %s: %v", userID.(string), err)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Failed to parse form data",
		})
		return
	}

	// Get the file from form
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

	// Get optional description and trail creation flag
	description := c.Request.FormValue("description")
	createTrail := c.Request.FormValue("create_trail") == "true"
	
	// Log trail creation request if provided
	if createTrail {
		trailInfoStr := c.Request.FormValue("trail_info")
		if trailInfoStr != "" {
			log.Printf("INFO: Parsing trail info for GPX upload")
			// For form data, we expect JSON string in trail_info field
			// This will be handled by separate trail creation endpoint
			log.Printf("INFO: Trail creation requested but will be handled separately")
		}
	}

	// Generate unique file ID and create file path
	fileID := uuid.New()
	userIDStr := userID.(string)
	userDir := filepath.Join(h.baseDir, userIDStr)
	log.Printf("INFO: Creating user directory: %s", userDir)
	if err := os.MkdirAll(userDir, 0755); err != nil {
		log.Printf("ERROR: Failed to create user directory %s: %v", userDir, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create user directory",
		})
		return
	}

	// Create file path with unique name
	filePath := filepath.Join(userDir, fmt.Sprintf("%s_%s", fileID.String(), filename))
	log.Printf("INFO: Saving GPX file to: %s", filePath)

	// Save file to disk
	if err := os.WriteFile(filePath, content, 0644); err != nil {
		log.Printf("ERROR: Failed to save file to disk %s: %v", filePath, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to save file to disk",
		})
		return
	}

	// Create GPX file record
	gpxFile := models.GPXFile{
		ID:          fileID,
		UserID:      uuid.MustParse(userIDStr),
		Filename:    filename,
		FilePath:    filePath,
		FileSize:    int64(len(content)),
		UploadedAt:  time.Now(),
		Description: description,
	}

	// Insert into database
	query := `
		INSERT INTO gpx_files (id, user_id, filename, file_path, file_size, uploaded_at, description)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	ctx := context.Background()
	log.Printf("INFO: Inserting GPX file record into database: %s", fileID.String())
	_, err = h.db.Exec(ctx, query,
		gpxFile.ID,
		gpxFile.UserID,
		gpxFile.Filename,
		gpxFile.FilePath,
		gpxFile.FileSize,
		gpxFile.UploadedAt,
		gpxFile.Description,
	)

	if err != nil {
		log.Printf("ERROR: Failed to insert GPX file record for user %s, file %s: %v", userIDStr, filename, err)
		// Clean up the saved file if database insert fails
		if removeErr := os.Remove(filePath); removeErr != nil {
			log.Printf("ERROR: Failed to cleanup file after DB error %s: %v", filePath, removeErr)
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to save GPX file",
		})
		return
	}

	response := gpxFile.ToResponse()
	
	// Note: Trail creation is intentionally separate for better API design
	// Users should use POST /api/v1/trails to create trail information
	if createTrail {
		response.HasTrail = false // Will be true once trail is created separately
		log.Printf("INFO: GPX file uploaded successfully for user %s: %s (ID: %s) - Trail creation requested but should be done separately", userIDStr, filename, fileID.String())
		c.JSON(http.StatusCreated, gin.H{
			"message": "GPX file uploaded successfully. Use POST /api/v1/trails to create trail information.",
			"gpx":     response,
			"note":    "Create trail information using the trail API endpoint with gpx_id: " + fileID.String(),
		})
	} else {
		log.Printf("INFO: GPX file uploaded successfully for user %s: %s (ID: %s)", userIDStr, filename, fileID.String())
		c.JSON(http.StatusCreated, gin.H{
			"message": "GPX file uploaded successfully",
			"gpx":     response,
		})
	}
}

func (h *GPXHandler) GetUserGPXFiles(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		log.Printf("ERROR: GetUserGPXFiles - User not authenticated")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}
	log.Printf("INFO: Fetching GPX files for user: %s", userID.(string))

	query := `
		SELECT id, user_id, filename, file_size, uploaded_at, description
		FROM gpx_files 
		WHERE user_id = $1
		ORDER BY uploaded_at DESC
	`

	ctx := context.Background()
	rows, err := h.db.Query(ctx, query, userID.(string))
	if err != nil {
		log.Printf("ERROR: Failed to query GPX files for user %s: %v", userID.(string), err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch GPX files",
		})
		return
	}
	defer rows.Close()

	var gpxFiles []models.GPXResponse
	for rows.Next() {
		var gpx models.GPXResponse
		
		err := rows.Scan(&gpx.ID, &gpx.UserID, &gpx.Filename, &gpx.FileSize, &gpx.UploadedAt, &gpx.Description)
		if err != nil {
			log.Printf("ERROR: Failed to scan GPX file data for user %s: %v", userID.(string), err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to scan GPX file data",
			})
			return
		}

		gpxFiles = append(gpxFiles, gpx)
	}

	log.Printf("INFO: Successfully fetched %d GPX files for user %s", len(gpxFiles), userID.(string))
	c.JSON(http.StatusOK, gin.H{
		"gpx_files": gpxFiles,
	})
}

func (h *GPXHandler) GetGPXFile(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		log.Printf("ERROR: GetGPXFile - User not authenticated")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}

	gpxID := c.Param("id")
	if gpxID == "" {
		log.Printf("ERROR: GetGPXFile - GPX file ID is required for user %s", userID.(string))
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "GPX file ID is required",
		})
		return
	}
	log.Printf("INFO: Fetching GPX file %s for user %s", gpxID, userID.(string))

	query := `
		SELECT id, user_id, filename, file_path, file_size, uploaded_at, description
		FROM gpx_files 
		WHERE id = $1 AND user_id = $2
	`

	var gpx models.GPXFile
	
	ctx := context.Background()
	err := h.db.QueryRow(ctx, query, gpxID, userID.(string)).Scan(
		&gpx.ID, &gpx.UserID, &gpx.Filename, &gpx.FilePath,
		&gpx.FileSize, &gpx.UploadedAt, &gpx.Description,
	)

	if err != nil {
		if err.Error() == "no rows in result set" {
			log.Printf("WARN: GPX file not found: %s for user %s", gpxID, userID.(string))
			c.JSON(http.StatusNotFound, gin.H{
				"error": "GPX file not found",
			})
			return
		}
		log.Printf("ERROR: Failed to fetch GPX file %s for user %s: %v", gpxID, userID.(string), err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch GPX file",
		})
		return
	}

	// Read file content from disk
	log.Printf("INFO: Reading GPX file content from: %s", gpx.FilePath)
	content, err := os.ReadFile(gpx.FilePath)
	if err != nil {
		log.Printf("ERROR: Failed to read GPX file content from %s: %v", gpx.FilePath, err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to read GPX file content",
		})
		return
	}

	// Add content to response
	response := struct {
		models.GPXFile
		Content string `json:"content"`
	}{
		GPXFile: gpx,
		Content: string(content),
	}

	log.Printf("INFO: Successfully fetched GPX file %s for user %s", gpxID, userID.(string))
	c.JSON(http.StatusOK, gin.H{
		"gpx": response,
	})
}

func (h *GPXHandler) DeleteGPXFile(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		log.Printf("ERROR: DeleteGPXFile - User not authenticated")
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}

	gpxID := c.Param("id")
	if gpxID == "" {
		log.Printf("ERROR: DeleteGPXFile - GPX file ID is required for user %s", userID.(string))
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "GPX file ID is required",
		})
		return
	}
	log.Printf("INFO: Deleting GPX file %s for user %s", gpxID, userID.(string))

	// First get the file path to delete the physical file
	getQuery := `SELECT file_path FROM gpx_files WHERE id = $1 AND user_id = $2`
	var filePath string
	ctx := context.Background()
	err := h.db.QueryRow(ctx, getQuery, gpxID, userID.(string)).Scan(&filePath)
	if err != nil {
		if err.Error() == "no rows in result set" {
			log.Printf("WARN: GPX file not found for deletion: %s for user %s", gpxID, userID.(string))
			c.JSON(http.StatusNotFound, gin.H{
				"error": "GPX file not found",
			})
			return
		}
		log.Printf("ERROR: Failed to fetch GPX file for deletion %s for user %s: %v", gpxID, userID.(string), err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch GPX file",
		})
		return
	}

	// Delete from database first
	log.Printf("INFO: Deleting GPX file record from database: %s", gpxID)
	deleteQuery := `DELETE FROM gpx_files WHERE id = $1 AND user_id = $2`
	result, err := h.db.Exec(ctx, deleteQuery, gpxID, userID.(string))
	if err != nil {
		log.Printf("ERROR: Failed to delete GPX file from database %s for user %s: %v", gpxID, userID.(string), err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete GPX file",
		})
		return
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		log.Printf("WARN: No rows affected when deleting GPX file %s for user %s", gpxID, userID.(string))
		c.JSON(http.StatusNotFound, gin.H{
			"error": "GPX file not found",
		})
		return
	}

	// Delete the physical file
	log.Printf("INFO: Deleting physical GPX file: %s", filePath)
	if err := os.Remove(filePath); err != nil {
		// Log the error but don't fail the request as DB record is already deleted
		log.Printf("WARN: Failed to delete physical file %s: %v", filePath, err)
	} else {
		log.Printf("INFO: Successfully deleted physical file: %s", filePath)
	}

	log.Printf("INFO: GPX file deleted successfully: %s for user %s", gpxID, userID.(string))
	c.JSON(http.StatusOK, gin.H{
		"message": "GPX file deleted successfully",
	})
}