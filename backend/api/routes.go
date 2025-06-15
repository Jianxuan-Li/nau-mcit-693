package api

import (
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"gpxbase/backend/config"
	"gpxbase/backend/handlers"
	"gpxbase/backend/middleware"
)

// SetupRouter configures all the routes for the application
func SetupRouter(db *pgxpool.Pool, cfg *config.Config) *gin.Engine {
	r := gin.Default()

	// Initialize handlers
	userHandler := handlers.NewUserHandler(db, cfg.JWT.SecretKey)
	healthHandler := handlers.NewHealthHandler(db)

	// API group
	api := r.Group("/api")
	{
		// Health check
		api.GET("/health", healthHandler.CheckHealth)

		// API v1 group
		v1 := api.Group("/v1")
		{
			// Public routes
			users := v1.Group("/users")
			{
				users.POST("/register", userHandler.RegisterUser)
				users.POST("/login", userHandler.LoginUser)
			}

			// Protected routes
			auth := v1.Group("/auth")
			auth.Use(middleware.AuthMiddleware(cfg.JWT.SecretKey))
			{
				auth.GET("/me", userHandler.GetCurrentUser)
			}
		}
	}

	return r
} 