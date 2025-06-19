package storage

import (
	"context"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// R2Storage implements FileStorage interface for Cloudflare R2
type R2Storage struct {
	client     *s3.Client
	bucketName string
}

// NewR2Storage creates a new R2 storage client
func NewR2Storage() (*R2Storage, error) {
	accountID := os.Getenv("R2_ACCOUNT_ID")
	accessKeyID := os.Getenv("R2_ACCESS_KEY_ID")
	secretAccessKey := os.Getenv("R2_SECRET_ACCESS_KEY")
	bucketName := os.Getenv("R2_BUCKET_NAME")

	if accountID == "" || accessKeyID == "" || secretAccessKey == "" || bucketName == "" {
		return nil, fmt.Errorf("missing required R2 environment variables: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME")
	}

	// Create R2 endpoint URL
	endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID)

	// Create AWS config for R2
	r2Resolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		return aws.Endpoint{
			URL:               endpoint,
			SigningRegion:     "auto",
			HostnameImmutable: true,
		}, nil
	})

	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithEndpointResolverWithOptions(r2Resolver),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKeyID, secretAccessKey, "")),
		config.WithRegion("auto"),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load R2 config: %w", err)
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.UsePathStyle = false
		o.UseARNRegion = true
	})

	return &R2Storage{
		client:     client,
		bucketName: bucketName,
	}, nil
}

// UploadFile uploads a file to R2 storage
func (r *R2Storage) UploadFile(key string, file io.Reader, contentType string) error {
	ctx := context.Background()

	_, err := r.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(r.bucketName),
		Key:         aws.String(key),
		Body:        file,
		ContentType: aws.String(contentType),
	})

	if err != nil {
		return fmt.Errorf("failed to upload file to R2: %w", err)
	}

	return nil
}

// GetPresignedURL generates a presigned URL for file access
func (r *R2Storage) GetPresignedURL(key string, duration time.Duration) (string, error) {
	ctx := context.Background()

	presignClient := s3.NewPresignClient(r.client)

	// Set ResponseContentDisposition to specify the filename for download
	input := &s3.GetObjectInput{
		Bucket: aws.String(r.bucketName),
		Key:    aws.String(key),
	}

	req, err := presignClient.PresignGetObject(ctx, input, func(opts *s3.PresignOptions) {
		opts.Expires = duration
		opts.ClientOptions = append(opts.ClientOptions, func(o *s3.Options) {
			o.UsePathStyle = false
			o.UseARNRegion = true
		})
	})

	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL: %w", err)
	}

	url := req.URL
	if strings.Contains(url, "\\u0026") {
		url = strings.ReplaceAll(url, "\\u0026", "&")
	}

	return url, nil
}

func (r *R2Storage) GetPresignedURLWithFilename(key string, duration time.Duration, filename string) (string, error) {
	ctx := context.Background()

	presignClient := s3.NewPresignClient(r.client)

	input := &s3.GetObjectInput{
		Bucket: aws.String(r.bucketName),
		Key:    aws.String(key),
		ResponseContentDisposition: aws.String(fmt.Sprintf(`attachment; filename="%s"`, filename)),
	}

	req, err := presignClient.PresignGetObject(ctx, input, func(opts *s3.PresignOptions) {
		opts.Expires = duration
		opts.ClientOptions = append(opts.ClientOptions, func(o *s3.Options) {
			o.UsePathStyle = false
			o.UseARNRegion = true
		})
	})

	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL with filename: %w", err)
	}

	url := req.URL
	if strings.Contains(url, "\\u0026") {
		url = strings.ReplaceAll(url, "\\u0026", "&")
	}

	return url, nil
}

// DeleteFile removes a file from R2 storage
func (r *R2Storage) DeleteFile(key string) error {
	ctx := context.Background()

	_, err := r.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(r.bucketName),
		Key:    aws.String(key),
	})

	if err != nil {
		return fmt.Errorf("failed to delete file from R2: %w", err)
	}

	return nil
}

// FileExists checks if a file exists in R2 storage
func (r *R2Storage) FileExists(key string) (bool, error) {
	ctx := context.Background()

	_, err := r.client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(r.bucketName),
		Key:    aws.String(key),
	})

	if err != nil {
		// Check if it's a "not found" error by checking error message
		if strings.Contains(err.Error(), "NoSuchKey") || strings.Contains(err.Error(), "404") {
			return false, nil
		}
		return false, fmt.Errorf("failed to check file existence: %w", err)
	}

	return true, nil
}