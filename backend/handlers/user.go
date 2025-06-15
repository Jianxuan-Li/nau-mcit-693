package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"gpxbase/backend/models"
	"gpxbase/backend/utils"
)

type UserHandler struct {
	db        *pgxpool.Pool
	jwtSecret []byte
}

func NewUserHandler(db *pgxpool.Pool, jwtSecret []byte) *UserHandler {
	return &UserHandler{
		db:        db,
		jwtSecret: jwtSecret,
	}
}

func (h *UserHandler) RegisterUser(c *gin.Context) {
	var req models.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	var existingUser models.User
	err := h.db.QueryRow(ctx, "SELECT id FROM users WHERE email = $1", req.Email).Scan(&existingUser.ID)
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"error": "User with this email already exists",
		})
		return
	}

	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to process password",
		})
		return
	}

	user := models.User{
		ID:           uuid.New(),
		Email:        req.Email,
		PasswordHash: hashedPassword,
		Name:         req.Name,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
		IsActive:     true,
		EmailVerified: false,
	}

	query := `
		INSERT INTO users (id, email, password_hash, name, created_at, updated_at, is_active, email_verified)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, email, name, created_at, is_active, email_verified`

	var createdUser models.User
	err = h.db.QueryRow(ctx, query,
		user.ID, user.Email, user.PasswordHash, user.Name,
		user.CreatedAt, user.UpdatedAt, user.IsActive, user.EmailVerified,
	).Scan(
		&createdUser.ID, &createdUser.Email, &createdUser.Name,
		&createdUser.CreatedAt, &createdUser.IsActive, &createdUser.EmailVerified,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create user",
			"details": err.Error(),
		})
		return
	}

	response := createdUser.ToResponse()
	c.JSON(http.StatusCreated, gin.H{
		"message": "User created successfully",
		"user":    response,
	})
}

func (h *UserHandler) LoginUser(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	var user models.User
	err := h.db.QueryRow(ctx, 
		"SELECT id, email, password_hash, name, created_at, is_active, email_verified, last_login FROM users WHERE email = $1",
		req.Email,
	).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Name,
		&user.CreatedAt, &user.IsActive, &user.EmailVerified, &user.LastLogin,
	)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid email or password",
		})
		return
	}

	if !user.IsActive {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Account is not active",
		})
		return
	}

	if !utils.CheckPasswordHash(req.Password, user.PasswordHash) {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid email or password",
		})
		return
	}

	// Update last login time
	now := time.Now()
	_, err = h.db.Exec(ctx, "UPDATE users SET last_login = $1 WHERE id = $2", now, user.ID)
	if err != nil {
		// Log the error but don't fail the login
		// TODO: Add proper logging
	}

	// Generate JWT token
	token, err := utils.GenerateToken(user.ID.String(), user.Email, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to generate authentication token",
		})
		return
	}

	response := user.ToResponse()
	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful",
		"user":    response,
		"token":   token,
	})
}

func (h *UserHandler) GetCurrentUser(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	var user models.User
	err := h.db.QueryRow(ctx, 
		"SELECT id, email, name, created_at, is_active, email_verified, last_login FROM users WHERE id = $1",
		userID,
	).Scan(
		&user.ID, &user.Email, &user.Name,
		&user.CreatedAt, &user.IsActive, &user.EmailVerified, &user.LastLogin,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get user information",
		})
		return
	}

	response := user.ToResponse()
	c.JSON(http.StatusOK, gin.H{
		"user": response,
	})
}