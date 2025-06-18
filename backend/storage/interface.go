package storage

import (
	"io"
	"time"
)

// FileStorage defines the interface for file storage operations
type FileStorage interface {
	// UploadFile uploads a file to storage with the given key and content type
	UploadFile(key string, file io.Reader, contentType string) error
	
	// GetPresignedURL generates a temporary URL for file access
	GetPresignedURL(key string, duration time.Duration) (string, error)
	
	// DeleteFile removes a file from storage
	DeleteFile(key string) error
	
	// FileExists checks if a file exists in storage
	FileExists(key string) (bool, error)
}

// GenerateObjectKey creates a standardized object key for GPX files
func GenerateObjectKey(userID, fileID, filename string) string {
	return "gpx/" + userID + "/" + fileID + "_" + filename
}