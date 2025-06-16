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
	r := gin.New()
	
	// Add custom logging middleware
	r.Use(middleware.RequestResponseLogger())
	r.Use(gin.Recovery())

	// Initialize handlers
	userHandler := handlers.NewUserHandler(db, cfg.JWT.SecretKey)
	healthHandler := handlers.NewHealthHandler(db)
	gpxHandler := handlers.NewGPXHandler(db)
	trailHandler := handlers.NewTrailHandler(db)

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

			// GPX routes (protected)
			gpx := v1.Group("/gpx")
			gpx.Use(middleware.AuthMiddleware(cfg.JWT.SecretKey))
			{
				gpx.POST("/upload", gpxHandler.UploadGPX)
				gpx.GET("/", gpxHandler.GetUserGPXFiles)
				gpx.GET("/:id", gpxHandler.GetGPXFile)
				gpx.DELETE("/:id", gpxHandler.DeleteGPXFile)
			}

			// Trail routes (protected)
			trails := v1.Group("/trails")
			trails.Use(middleware.AuthMiddleware(cfg.JWT.SecretKey))
			{
				trails.POST("/", trailHandler.CreateTrail)
				trails.GET("/", trailHandler.GetUserTrails)
				trails.GET("/:id", trailHandler.GetTrail)
				trails.PUT("/:id", trailHandler.UpdateTrail)
				trails.DELETE("/:id", trailHandler.DeleteTrail)
			}
		}
	}

	return r
} 