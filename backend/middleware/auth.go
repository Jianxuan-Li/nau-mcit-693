package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gpxbase/backend/utils"
)

func AuthMiddleware(secretKey []byte) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header is required"})
			c.Abort()
			return
		}

		// Check if the Authorization header has the correct format
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		tokenString := parts[1]
		claims, err := utils.ValidateToken(tokenString, secretKey)
		if err != nil {
			status := http.StatusUnauthorized
			if err == utils.ErrExpiredToken {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			c.Abort()
			return
		}

		// Set user information in the context
		c.Set("userID", claims.UserID)
		c.Set("email", claims.Email)
		c.Next()
	}
} 