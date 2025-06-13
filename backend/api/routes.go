package api

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/Jianxuan-Li/nau-mcit-693/backend/handlers"
)

// SetupRouter configures all the routes for the application
func SetupRouter(db *pgxpool.Pool) *gin.Engine {
	r := gin.Default()

	// Initialize handlers
	userHandler := handlers.NewUserHandler(db)
	healthHandler := handlers.NewHealthHandler(db)

	// API v1 group
	v1 := r.Group("/api/v1")
	{
		// Health check
		v1.GET("/health", healthHandler.CheckHealth)

		// User routes
		users := v1.Group("/users")
		{
			users.POST("/register", userHandler.RegisterUser)
		}
	}

	return r
} 