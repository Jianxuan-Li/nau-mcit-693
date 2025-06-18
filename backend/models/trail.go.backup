package models

import (
	"time"

	"github.com/google/uuid"
)

// DifficultyLevel represents the difficulty level of a trail
type DifficultyLevel string

const (
	DifficultyEasy       DifficultyLevel = "easy"
	DifficultyModerate   DifficultyLevel = "moderate"
	DifficultyHard       DifficultyLevel = "hard"
	DifficultyExpert     DifficultyLevel = "expert"
)

// Trail represents trail information associated with GPX files
type Trail struct {
	ID                uuid.UUID       `json:"id" db:"id"`
	UserID            uuid.UUID       `json:"user_id" db:"user_id"`
	GPXID             *uuid.UUID      `json:"gpx_id,omitempty" db:"gpx_id"` // Optional association with GPX file
	Name              string          `json:"name" db:"name"`
	Difficulty        DifficultyLevel `json:"difficulty" db:"difficulty"`
	SceneryDescription string         `json:"scenery_description,omitempty" db:"scenery_description"`
	AdditionalNotes   string          `json:"additional_notes,omitempty" db:"additional_notes"`
	TotalDistance     float64         `json:"total_distance" db:"total_distance"`           // in kilometers
	MaxElevationGain  float64         `json:"max_elevation_gain" db:"max_elevation_gain"`   // in meters
	EstimatedDuration int             `json:"estimated_duration" db:"estimated_duration"`   // in minutes
	CreatedAt         time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time       `json:"updated_at" db:"updated_at"`
}

// TrailCreateRequest represents the request payload for creating a trail
type TrailCreateRequest struct {
	GPXID             *uuid.UUID      `json:"gpx_id,omitempty"`
	Name              string          `json:"name" binding:"required,max=255"`
	Difficulty        DifficultyLevel `json:"difficulty" binding:"required,oneof=easy moderate hard expert"`
	SceneryDescription string         `json:"scenery_description,omitempty" binding:"max=1000"`
	AdditionalNotes   string          `json:"additional_notes,omitempty" binding:"max=2000"`
	TotalDistance     float64         `json:"total_distance" binding:"required,min=0"`
	MaxElevationGain  float64         `json:"max_elevation_gain" binding:"min=0"`
	EstimatedDuration int             `json:"estimated_duration" binding:"required,min=0"`
}

// TrailUpdateRequest represents the request payload for updating a trail
type TrailUpdateRequest struct {
	Name              *string          `json:"name,omitempty" binding:"omitempty,max=255"`
	Difficulty        *DifficultyLevel `json:"difficulty,omitempty" binding:"omitempty,oneof=easy moderate hard expert"`
	SceneryDescription *string         `json:"scenery_description,omitempty" binding:"omitempty,max=1000"`
	AdditionalNotes   *string          `json:"additional_notes,omitempty" binding:"omitempty,max=2000"`
	TotalDistance     *float64         `json:"total_distance,omitempty" binding:"omitempty,min=0"`
	MaxElevationGain  *float64         `json:"max_elevation_gain,omitempty" binding:"omitempty,min=0"`
	EstimatedDuration *int             `json:"estimated_duration,omitempty" binding:"omitempty,min=0"`
}

// TrailResponse represents the response format for trail data
type TrailResponse struct {
	ID                uuid.UUID       `json:"id"`
	UserID            uuid.UUID       `json:"user_id"`
	GPXID             *uuid.UUID      `json:"gpx_id,omitempty"`
	GPXFilename       *string         `json:"gpx_filename,omitempty"` // Include associated GPX filename
	Name              string          `json:"name"`
	Difficulty        DifficultyLevel `json:"difficulty"`
	SceneryDescription string         `json:"scenery_description,omitempty"`
	AdditionalNotes   string          `json:"additional_notes,omitempty"`
	TotalDistance     float64         `json:"total_distance"`
	MaxElevationGain  float64         `json:"max_elevation_gain"`
	EstimatedDuration int             `json:"estimated_duration"`
	CreatedAt         time.Time       `json:"created_at"`
	UpdatedAt         time.Time       `json:"updated_at"`
}

// ToResponse converts Trail model to TrailResponse
func (t *Trail) ToResponse() TrailResponse {
	return TrailResponse{
		ID:                t.ID,
		UserID:            t.UserID,
		GPXID:             t.GPXID,
		Name:              t.Name,
		Difficulty:        t.Difficulty,
		SceneryDescription: t.SceneryDescription,
		AdditionalNotes:   t.AdditionalNotes,
		TotalDistance:     t.TotalDistance,
		MaxElevationGain:  t.MaxElevationGain,
		EstimatedDuration: t.EstimatedDuration,
		CreatedAt:         t.CreatedAt,
		UpdatedAt:         t.UpdatedAt,
	}
}

// ValidateDifficulty checks if the difficulty level is valid
func ValidateDifficulty(difficulty string) bool {
	switch DifficultyLevel(difficulty) {
	case DifficultyEasy, DifficultyModerate, DifficultyHard, DifficultyExpert:
		return true
	default:
		return false
	}
}