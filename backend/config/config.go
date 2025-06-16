package config

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Config struct {
	Port     string
	Env      string
	Database DatabaseConfig
	JWT      JWTConfig
}

type DatabaseConfig struct {
	Host            string
	Port            string
	User            string
	Password        string
	DBName          string
	SSLMode         string
	MaxConns        int32
	MinConns        int32
	MaxConnLifetime time.Duration
	MaxConnIdleTime time.Duration
}

type JWTConfig struct {
	SecretKey []byte
}

func LoadConfig() *Config {
	jwtSecret := getEnv("JWT_SECRET", "your-256-bit-secret")
	if len(jwtSecret) < 32 {
		log.Fatal("JWT_SECRET must be at least 32 characters long")
	}

	return &Config{
		Port: getEnv("PORT", "8000"),
		Env:  getEnv("ENV", "development"),
		Database: DatabaseConfig{
			Host:            getEnv("DB_HOST", "localhost"),
			Port:            getEnv("DB_PORT", "5432"),
			User:            getEnv("DB_USER", "postgres"),
			Password:        getEnv("DB_PASSWORD", ""),
			DBName:          getEnv("DB_NAME", "mydb"),
			SSLMode:         getEnv("DB_SSL_MODE", "disable"),
			MaxConns:        10, // default max connections
			MinConns:        1,  // default min connections
			MaxConnLifetime: time.Hour,
			MaxConnIdleTime: time.Minute * 30,
		},
		JWT: JWTConfig{
			SecretKey: []byte(jwtSecret),
		},
	}
}

func (c *DatabaseConfig) GetDSN() string {
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s",
		c.User, c.Password, c.Host, c.Port, c.DBName, c.SSLMode)
}

func (c *DatabaseConfig) Connect() (*pgxpool.Pool, error) {
	dsn := c.GetDSN()
	log.Printf("INFO: Parsing database configuration")
	config, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		log.Printf("ERROR: Unable to parse database config: %v", err)
		return nil, fmt.Errorf("unable to parse database config: %v", err)
	}

	config.MaxConns = c.MaxConns
	config.MinConns = c.MinConns
	config.MaxConnLifetime = c.MaxConnLifetime
	config.MaxConnIdleTime = c.MaxConnIdleTime
	
	log.Printf("INFO: Creating database connection pool (min: %d, max: %d)", c.MinConns, c.MaxConns)
	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		log.Printf("ERROR: Unable to create connection pool: %v", err)
		return nil, fmt.Errorf("unable to create connection pool: %v", err)
	}

	log.Printf("INFO: Testing database connection with ping")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := pool.Ping(ctx); err != nil {
		log.Printf("ERROR: Unable to ping database: %v", err)
		return nil, fmt.Errorf("unable to ping database: %v", err)
	}

	log.Printf("INFO: Successfully connected to database with pool size: %d", c.MaxConns)
	return pool, nil
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
} 