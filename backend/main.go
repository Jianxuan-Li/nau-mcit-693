package main

import (
	"log"

	"github.com/joho/godotenv"
	"gpxbase/backend/api"
	"gpxbase/backend/config"
)

func main() {
	log.Printf("INFO: Starting GPX Backend Application")
	
	// Load .env file if it exists
	if err := godotenv.Load(); err != nil {
		log.Printf("WARN: No .env file found: %v", err)
	} else {
		log.Printf("INFO: Loaded .env file successfully")
	}

	// Load configuration
	log.Printf("INFO: Loading configuration")
	cfg := config.LoadConfig()
	log.Printf("INFO: Configuration loaded - Port: %s, Env: %s, DB Host: %s", cfg.Port, cfg.Env, cfg.Database.Host)

	// Initialize database connection pool
	log.Printf("INFO: Connecting to PostgreSQL database at %s:%s", cfg.Database.Host, cfg.Database.Port)
	pool, err := cfg.Database.Connect()
	if err != nil {
		log.Fatalf("ERROR: Failed to connect to database: %v", err)
	}
	defer pool.Close()
	log.Printf("INFO: Database connection established successfully")

	// Setup router with database connections and config
	log.Printf("INFO: Setting up HTTP router and handlers")
	r := api.SetupRouter(pool, cfg)

	log.Printf("INFO: HTTP middleware configured in router")

	// Start server
	log.Printf("INFO: Starting HTTP server on port %s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("ERROR: Failed to start server on port %s: %v", cfg.Port, err)
	}
} 