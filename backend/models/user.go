package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID                uuid.UUID  `json:"id" db:"id"`
	Email             string     `json:"email" db:"email" binding:"required,email"`
	PasswordHash      string     `json:"-" db:"password_hash"`
	Name              string     `json:"name" db:"name" binding:"required"`
	CreatedAt         time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at" db:"updated_at"`
	LastLogin         *time.Time `json:"last_login,omitempty" db:"last_login"`
	IsActive          bool       `json:"is_active" db:"is_active"`
	EmailVerified     bool       `json:"email_verified" db:"email_verified"`
	VerificationToken *string    `json:"-" db:"verification_token"`
	ResetToken        *string    `json:"-" db:"reset_token"`
	ResetTokenExpires *time.Time `json:"-" db:"reset_token_expires"`
}

type CreateUserRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Name     string `json:"name" binding:"required"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type UserResponse struct {
	ID            uuid.UUID  `json:"id"`
	Email         string     `json:"email"`
	Name          string     `json:"name"`
	CreatedAt     time.Time  `json:"created_at"`
	IsActive      bool       `json:"is_active"`
	EmailVerified bool       `json:"email_verified"`
	LastLogin     *time.Time `json:"last_login,omitempty"`
}

func (u *User) ToResponse() UserResponse {
	return UserResponse{
		ID:            u.ID,
		Email:         u.Email,
		Name:          u.Name,
		CreatedAt:     u.CreatedAt,
		IsActive:      u.IsActive,
		EmailVerified: u.EmailVerified,
		LastLogin:     u.LastLogin,
	}
}

// UserPublicResponse represents the public response payload for user information
// This is used for public endpoints where sensitive information should be hidden
type UserPublicResponse struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
}

// ToPublicResponse converts a User to UserPublicResponse (only public information)
func (u *User) ToPublicResponse() UserPublicResponse {
	return UserPublicResponse{
		ID:   u.ID,
		Name: u.Name,
	}
}