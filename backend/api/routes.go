package api

import (
	"github.com/gin-gonic/gin"
)

// SetupRouter configures all the routes for the application
func SetupRouter() *gin.Engine {
	r := gin.Default()

	// API v1 group
	v1 := r.Group("/api/v1")
	{
		// Health check
		v1.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"status": "ok",
			})
		})

		// Add more routes here
	}

	return r
} 