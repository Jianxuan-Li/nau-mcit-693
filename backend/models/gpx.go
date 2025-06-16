package models

import (
	"time"

	"github.com/google/uuid"
)

type GPXFile struct {
	ID          uuid.UUID `json:"id" db:"id"`
	UserID      uuid.UUID `json:"user_id" db:"user_id"`
	Filename    string    `json:"filename" db:"filename"`
	FilePath    string    `json:"file_path" db:"file_path"`
	FileSize    int64     `json:"file_size" db:"file_size"`
	UploadedAt  time.Time `json:"uploaded_at" db:"uploaded_at"`
	Description string    `json:"description,omitempty" db:"description"`
}

type GPXUploadRequest struct {
	Description    string                     `json:"description,omitempty"`
	CreateTrail    bool                      `json:"create_trail,omitempty"`    // Whether to create trail info
	TrailInfo      *TrailInfoFromGPX         `json:"trail_info,omitempty"`      // Trail info if creating trail
}

// TrailInfoFromGPX represents trail information when uploading GPX
type TrailInfoFromGPX struct {
	Name              string          `json:"name" binding:"required,max=255"`
	Difficulty        string          `json:"difficulty" binding:"required,oneof=easy moderate hard expert"`
	SceneryDescription string         `json:"scenery_description,omitempty" binding:"max=1000"`
	AdditionalNotes   string          `json:"additional_notes,omitempty" binding:"max=2000"`
	TotalDistance     float64         `json:"total_distance" binding:"required,min=0"`
	MaxElevationGain  float64         `json:"max_elevation_gain" binding:"min=0"`
	EstimatedDuration int             `json:"estimated_duration" binding:"required,min=0"`
}

type GPXResponse struct {
	ID          uuid.UUID `json:"id"`
	UserID      uuid.UUID `json:"user_id"`
	Filename    string    `json:"filename"`
	FileSize    int64     `json:"file_size"`
	UploadedAt  time.Time `json:"uploaded_at"`
	Description string    `json:"description,omitempty"`
	HasTrail    bool      `json:"has_trail,omitempty"`    // Indicates if this GPX has associated trail
	TrailID     *uuid.UUID `json:"trail_id,omitempty"`   // Associated trail ID if exists
}

func (g *GPXFile) ToResponse() GPXResponse {
	return GPXResponse{
		ID:          g.ID,
		UserID:      g.UserID,
		Filename:    g.Filename,
		FileSize:    g.FileSize,
		UploadedAt:  g.UploadedAt,
		Description: g.Description,
		HasTrail:    false, // Will be set by handlers when needed
		TrailID:     nil,   // Will be set by handlers when needed
	}
}

// ToResponseWithTrail converts GPX model to GPXResponse with trail information
func (g *GPXFile) ToResponseWithTrail(trailID *uuid.UUID) GPXResponse {
	response := g.ToResponse()
	if trailID != nil {
		response.HasTrail = true
		response.TrailID = trailID
	}
	return response
}