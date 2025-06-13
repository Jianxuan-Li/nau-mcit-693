# Go Gin Backend

This is a backend service built with Go and the Gin framework.

## Prerequisites

- Go 1.24 or higher
- Git

## Getting Started

1. Clone the repository
2. Copy `.env.example` to `.env` and update the values
3. Install dependencies:
   ```bash
   go mod download
   ```
4. Run the server:
   ```bash
   go run main.go
   ```

The server will start on port 8080 by default. You can change this in the `.env` file.

## Project Structure

```
.
├── api/            # API routes and handlers
├── config/         # Configuration
├── internal/       # Private application code
├── pkg/           # Public library code
├── main.go        # Application entry point
├── go.mod         # Go module file
└── .env           # Environment variables
```

## API Endpoints

- `GET /api/v1/health` - Health check endpoint

## Development

To run the server in development mode:

```bash
go run main.go
```

## Testing

To run tests:

```bash
go test ./...
``` 

local container, need to add manual host for container

```
docker build -t test:latest .
HOST=$(ip route | grep default  | awk -F' ' '{print $3}')
docker run --add-host="host.docker.internal:$HOST" -p 8000:8000 test:latest
curl http://localhost:8000/health
```