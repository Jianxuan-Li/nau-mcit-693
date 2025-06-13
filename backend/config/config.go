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

func LoadConfig() *Config {
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
			MaxConns:        25, // 默认最大连接数
			MinConns:        5,  // 默认最小连接数
			MaxConnLifetime: time.Hour,
			MaxConnIdleTime: time.Minute * 30,
		},
	}
}

func (c *DatabaseConfig) GetDSN() string {
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s",
		c.User, c.Password, c.Host, c.Port, c.DBName, c.SSLMode)
}

func (c *DatabaseConfig) Connect() (*pgxpool.Pool, error) {
	config, err := pgxpool.ParseConfig(c.GetDSN())
	if err != nil {
		return nil, fmt.Errorf("unable to parse database config: %v", err)
	}

	// 配置连接池参数
	config.MaxConns = c.MaxConns
	config.MinConns = c.MinConns
	config.MaxConnLifetime = c.MaxConnLifetime
	config.MaxConnIdleTime = c.MaxConnIdleTime

	// 创建连接池
	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return nil, fmt.Errorf("unable to create connection pool: %v", err)
	}

	// 测试连接
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("unable to ping database: %v", err)
	}

	log.Printf("Successfully connected to database with pool size: %d", c.MaxConns)
	return pool, nil
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
} 