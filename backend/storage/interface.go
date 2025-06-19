package storage

import (
	"io"
	"log"
	"strings"
	"time"
)

// FileStorage defines the interface for file storage operations
type FileStorage interface {
	// UploadFile uploads a file to storage with the given key and content type
	UploadFile(key string, file io.Reader, contentType string) error
	
	// GetPresignedURL generates a temporary URL for file access
	GetPresignedURL(key string, duration time.Duration) (string, error)

	// GetPresignedURLWithFilename generates a temporary URL for file access with a specified filename
	GetPresignedURLWithFilename(key string, duration time.Duration, filename string) (string, error)
	
	// DeleteFile removes a file from storage
	DeleteFile(key string) error
	
	// FileExists checks if a file exists in storage
	FileExists(key string) (bool, error)
}

// GenerateObjectKey creates a standardized object key for GPX files
func GenerateObjectKey(userID, fileID, filename string) string {
	log.Printf("INFO: Generating object key for user %s, file %s, filename %s", userID, fileID, filename)
	// Extract file extension
	ext := ""
	if idx := strings.LastIndex(filename, "."); idx >= 0 {
		ext = filename[idx:]
	}
	// Generate clean key with just ID and extension
	return "gpx/" + userID + "/" + fileID + ext
}