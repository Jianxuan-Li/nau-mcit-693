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
	routeHandler := handlers.NewRouteHandler(db)
	publicRouteHandler := handlers.NewPublicRouteHandler(db)
	spatialRouteHandler := handlers.NewSpatialRouteHandler(db)

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

			// Private route routes (protected) - user's own routes
			routes := v1.Group("/routes")
			routes.Use(middleware.AuthMiddleware(cfg.JWT.SecretKey))
			{
				routes.POST("/", routeHandler.CreateRoute)      // Upload GPX + create route
				routes.GET("/", routeHandler.GetUserRoutes)     // Get all user routes
				routes.GET("/:id", routeHandler.GetRoute)       // Get route + download URL
				routes.PUT("/:id", routeHandler.UpdateRoute)    // Update route metadata
				routes.DELETE("/:id", routeHandler.DeleteRoute) // Delete route + GPX file
			}

			// Public routes for browsing all routes
			public := v1.Group("/public")
			{
				public.GET("/routes", publicRouteHandler.GetAllRoutes) // Get all routes from all users
				public.GET("/routes/spatial", spatialRouteHandler.GetRoutesInBounds) // Get routes within map bounds
			}

			// Download routes (authenticated but can download any route)
			download := v1.Group("/download")
			download.Use(middleware.AuthMiddleware(cfg.JWT.SecretKey))
			{
				download.GET("/routes/:id", publicRouteHandler.GenerateDownloadURL) // Generate download URL for any route
			}
		}
	}

	return r
} 