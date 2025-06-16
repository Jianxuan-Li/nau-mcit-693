package middleware

import (
	"log"
	"time"

	"github.com/gin-gonic/gin"
)

// CustomLogger provides detailed request/response logging
func CustomLogger() gin.HandlerFunc {
	return gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		// Format log output with more details
		log.Printf("INFO: %s - [%s] \"%s %s %s\" %d %s \"%s\" \"%s\" %s",
			param.ClientIP,
			param.TimeStamp.Format(time.RFC3339),
			param.Method,
			param.Path,
			param.Request.Proto,
			param.StatusCode,
			param.Latency,
			param.Request.UserAgent(),
			param.Request.Referer(),
			param.ErrorMessage,
		)
		return ""
	})
}

// RequestResponseLogger logs detailed request and response information
func RequestResponseLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Log incoming request
		log.Printf("INFO: Incoming request - Method: %s, Path: %s, IP: %s, UserAgent: %s", 
			c.Request.Method, c.Request.URL.Path, c.ClientIP(), c.Request.UserAgent())
		
		// Log query parameters if any
		if len(c.Request.URL.RawQuery) > 0 {
			log.Printf("INFO: Query parameters: %s", c.Request.URL.RawQuery)
		}
		
		// Log form data for POST/PUT requests (excluding file uploads)
		if c.Request.Method == "POST" || c.Request.Method == "PUT" {
			contentType := c.Request.Header.Get("Content-Type")
			if contentType != "" && contentType != "multipart/form-data" {
				log.Printf("INFO: Content-Type: %s", contentType)
			}
		}

		// Record start time
		start := time.Now()

		// Process request
		c.Next()

		// Log response details
		latency := time.Since(start)
		log.Printf("INFO: Response - Status: %d, Latency: %s, Path: %s", 
			c.Writer.Status(), latency, c.Request.URL.Path)

		// Log errors if any
		if len(c.Errors) > 0 {
			for _, err := range c.Errors {
				log.Printf("ERROR: Request error - %s", err.Error())
			}
		}
	}
}