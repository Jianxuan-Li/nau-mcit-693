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
    JWT_SECRET=$JWT_SECRET

# Expose port
EXPOSE $PORT

# Run the application
CMD ["./main"] 