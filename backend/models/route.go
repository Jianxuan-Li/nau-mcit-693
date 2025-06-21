package models

import (
	"time"

	"github.com/google/uuid"
)

// DifficultyLevel represents the difficulty level of a route
type DifficultyLevel string

const (
	DifficultyEasy     DifficultyLevel = "easy"
	DifficultyModerate DifficultyLevel = "moderate"
	DifficultyHard     DifficultyLevel = "hard"
	DifficultyExpert   DifficultyLevel = "expert"
)

// Route represents a unified model containing both route metadata and GPX file information
type Route struct {
	ID                 uuid.UUID       `json:"id" db:"id"`
	UserID             uuid.UUID       `json:"user_id" db:"user_id"`
	
	// Route metadata
	Name               string          `json:"name" db:"name"`
	Difficulty         DifficultyLevel `json:"difficulty" db:"difficulty"`
	SceneryDescription string          `json:"scenery_description,omitempty" db:"scenery_description"`
	AdditionalNotes    string          `json:"additional_notes,omitempty" db:"additional_notes"`
	MaxElevationGain   float64         `json:"max_elevation_gain" db:"max_elevation_gain"`   // in meters
	EstimatedDuration  *int            `json:"estimated_duration,omitempty" db:"estimated_duration"` // calculated from GPX in minutes
	AverageSpeed       *float64        `json:"average_speed,omitempty" db:"average_speed"`   // calculated from GPX in km/h
	StartTime          *time.Time      `json:"start_time,omitempty" db:"start_time"`         // extracted from GPX
	EndTime            *time.Time      `json:"end_time,omitempty" db:"end_time"`             // extracted from GPX
	
	// Social features
	LikeCount          int             `json:"like_count" db:"like_count"`                   // number of likes
	SaveCount          int             `json:"save_count" db:"save_count"`                   // number of saves
	
	// GPX file information
	Filename           string          `json:"filename" db:"filename"`
	R2ObjectKey        string          `json:"r2_object_key" db:"r2_object_key"`
	FileSize           int64           `json:"file_size" db:"file_size"`
	
	// Geographical features
	CenterPoint        *string         `json:"center_point,omitempty" db:"center_point"`        // WKT format point
	ConvexHull         *string         `json:"convex_hull,omitempty" db:"convex_hull"`          // WKT format polygon  
	SimplifiedPath     *string         `json:"simplified_path,omitempty" db:"simplified_path"`  // WKT format linestring
	RouteLength        *float64        `json:"route_length_km,omitempty" db:"route_length_km"`  // Calculated route length in km
	BoundingBox        *string         `json:"bounding_box,omitempty" db:"bounding_box"`        // WKT format bounding box polygon
	OriginalGeometry   *string         `json:"-" db:"original_geometry"`                        // Original geometry in PostGIS format (cold storage)
	
	// Timestamps
	CreatedAt          time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time       `json:"updated_at" db:"updated_at"`
}

// RouteCreateRequest represents the request payload for creating a new route
type RouteCreateRequest struct {
	// Route metadata
	Name               string          `json:"name" binding:"required,max=255"`
	Difficulty         DifficultyLevel `json:"difficulty" binding:"required,oneof=easy moderate hard expert"`
	SceneryDescription string          `json:"scenery_description,omitempty" binding:"max=1000"`
	AdditionalNotes    string          `json:"additional_notes,omitempty" binding:"max=2000"`
	MaxElevationGain   float64         `json:"max_elevation_gain" binding:"min=0"`
	
	// GPX file will be provided via multipart form upload
}

// RouteUpdateRequest represents the request payload for updating a route
type RouteUpdateRequest struct {
	Name               *string          `json:"name,omitempty" binding:"omitempty,max=255"`
	Difficulty         *DifficultyLevel `json:"difficulty,omitempty" binding:"omitempty,oneof=easy moderate hard expert"`
	SceneryDescription *string          `json:"scenery_description,omitempty" binding:"omitempty,max=1000"`
	AdditionalNotes    *string          `json:"additional_notes,omitempty" binding:"omitempty,max=2000"`
	MaxElevationGain   *float64         `json:"max_elevation_gain,omitempty" binding:"omitempty,min=0"`
}

// RouteResponse represents the response payload for route operations
type RouteResponse struct {
	ID                 uuid.UUID       `json:"id"`
	UserID             uuid.UUID       `json:"user_id"`
	Name               string          `json:"name"`
	Difficulty         DifficultyLevel `json:"difficulty"`
	SceneryDescription string          `json:"scenery_description,omitempty"`
	AdditionalNotes    string          `json:"additional_notes,omitempty"`
	MaxElevationGain   float64         `json:"max_elevation_gain"`
	EstimatedDuration  *int            `json:"estimated_duration,omitempty"`
	AverageSpeed       *float64        `json:"average_speed,omitempty"`
	StartTime          *time.Time      `json:"start_time,omitempty"`
	EndTime            *time.Time      `json:"end_time,omitempty"`
	LikeCount          int             `json:"like_count"`
	SaveCount          int             `json:"save_count"`
	Filename           string          `json:"filename"`
	FileSize           int64           `json:"file_size"`
	CenterPoint        *string         `json:"center_point,omitempty"`
	ConvexHull         *string         `json:"convex_hull,omitempty"`
	SimplifiedPath     *string         `json:"simplified_path,omitempty"`
	RouteLength        *float64        `json:"route_length_km,omitempty"`
	BoundingBox        *string         `json:"bounding_box,omitempty"`
	CreatedAt          time.Time       `json:"created_at"`
	UpdatedAt          time.Time       `json:"updated_at"`
}

// RouteDetailResponse represents a detailed route response with download URL
type RouteDetailResponse struct {
	RouteResponse
	DownloadURL string `json:"download_url"`
	ExpiresAt   string `json:"expires_at"`
}

// RouteWithUserResponse represents a route response that includes user information
type RouteWithUserResponse struct {
	RouteResponse
	User UserPublicResponse `json:"user"`
}

// ToResponse converts a Route to RouteResponse
func (r *Route) ToResponse() RouteResponse {
	return RouteResponse{
		ID:                 r.ID,
		UserID:             r.UserID,
		Name:               r.Name,
		Difficulty:         r.Difficulty,
		SceneryDescription: r.SceneryDescription,
		AdditionalNotes:    r.AdditionalNotes,
		MaxElevationGain:   r.MaxElevationGain,
		EstimatedDuration:  r.EstimatedDuration,
		AverageSpeed:       r.AverageSpeed,
		StartTime:          r.StartTime,
		EndTime:            r.EndTime,
		LikeCount:          r.LikeCount,
		SaveCount:          r.SaveCount,
		Filename:           r.Filename,
		FileSize:           r.FileSize,
		CenterPoint:        r.CenterPoint,
		ConvexHull:         r.ConvexHull,
		SimplifiedPath:     r.SimplifiedPath,
		RouteLength:        r.RouteLength,
		BoundingBox:        r.BoundingBox,
		CreatedAt:          r.CreatedAt,
		UpdatedAt:          r.UpdatedAt,
	}
}

// ToDetailResponse converts a Route to RouteDetailResponse with download URL
func (r *Route) ToDetailResponse(downloadURL, expiresAt string) RouteDetailResponse {
	return RouteDetailResponse{
		RouteResponse: r.ToResponse(),
		DownloadURL:   downloadURL,
		ExpiresAt:     expiresAt,
	}
}

// ToResponseWithUser converts a Route to RouteWithUserResponse with user information
func (r *Route) ToResponseWithUser(user UserPublicResponse) RouteWithUserResponse {
	return RouteWithUserResponse{
		RouteResponse: r.ToResponse(),
		User:          user,
	}
}

// IsValidDifficulty checks if the difficulty level is valid
func IsValidDifficulty(difficulty string) bool {
	switch DifficultyLevel(difficulty) {
	case DifficultyEasy, DifficultyModerate, DifficultyHard, DifficultyExpert:
		return true
	default:
		return false
	}
}

// GetAllDifficulties returns all valid difficulty levels
func GetAllDifficulties() []DifficultyLevel {
	return []DifficultyLevel{
		DifficultyEasy,
		DifficultyModerate,
		DifficultyHard,
		DifficultyExpert,
	}
}