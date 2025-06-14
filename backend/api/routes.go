package api

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"gpxbase/backend/handlers"
)

// SetupRouter configures all the routes for the application
func SetupRouter(db *pgxpool.Pool) *gin.Engine {
	r := gin.Default()

	// Initialize handlers
	userHandler := handlers.NewUserHandler(db)
	healthHandler := handlers.NewHealthHandler(db)

	// Health check
	r.GET("/health", healthHandler.CheckHealth)

	// API v1 group
	v1 := r.Group("/api/v1")
	{
		// User routes
		users := v1.Group("/users")
		{
			users.POST("/register", userHandler.RegisterUser)
		}
	}

	return r
} 