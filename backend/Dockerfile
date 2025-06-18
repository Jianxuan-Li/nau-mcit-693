# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# Final stage
FROM alpine:latest

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/main .

# Create directory for GPX files
RUN mkdir -p /app/gpx_files

# Create volume mount point
VOLUME ["/app/gpx_files"]

# Define build arguments with default values
ARG PORT=8000
ARG ENV=development
ARG DB_HOST=host.docker.internal
ARG DB_PORT=5432
ARG DB_USER=postgres
ARG DB_PASSWORD=postgres
ARG DB_NAME=gpxbase_dev
ARG DB_SSL_MODE=disable
ARG DB_MAX_CONNS=10
ARG DB_MIN_CONNS=1
ARG DB_MAX_CONN_LIFETIME=1800
ARG DB_MAX_CONN_IDLE_TIME=300
ARG JWT_SECRET=your-256-bit-secret
ARG GPX_FILES_DIR=/app/gpx_files
ARG R2_ACCOUNT_ID=xxxxxxxxxxxx
ARG R2_ACCESS_KEY_ID=xxxxxxxxxxx
ARG R2_SECRET_ACCESS_KEY=xxxxxxxxxxx
ARG R2_BUCKET_NAME=gpxbase
ARG R2_S3_ENDPOINT=https://xxxxxxxxx.r2.cloudflarestorage.com/

# Set environment variables from build arguments
ENV PORT=$PORT \
    ENV=$ENV \
    DB_HOST=$DB_HOST \
    DB_PORT=$DB_PORT \
    DB_USER=$DB_USER \
    DB_PASSWORD=$DB_PASSWORD \
    DB_NAME=$DB_NAME \
    DB_SSL_MODE=$DB_SSL_MODE \
    DB_MAX_CONNS=$DB_MAX_CONNS \
    DB_MIN_CONNS=$DB_MIN_CONNS \
    DB_MAX_CONN_LIFETIME=$DB_MAX_CONN_LIFETIME \
    DB_MAX_CONN_IDLE_TIME=$DB_MAX_CONN_IDLE_TIME \
    JWT_SECRET=$JWT_SECRET \
    GPX_FILES_DIR=$GPX_FILES_DIR \
    R2_ACCOUNT_ID=$R2_ACCOUNT_ID \
    R2_ACCESS_KEY_ID=$R2_ACCESS_KEY_ID \
    R2_SECRET_ACCESS_KEY=$R2_SECRET_ACCESS_KEY \
    R2_BUCKET_NAME=$R2_BUCKET_NAME \
    R2_S3_ENDPOINT=$R2_S3_ENDPOINT

# Expose port
EXPOSE $PORT

# Run the application
CMD ["./main"] 