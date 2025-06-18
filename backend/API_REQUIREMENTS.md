# API Requirements Documentation

## Overview
This document outlines the API requirements for the Track Management System backend. The API follows RESTful principles and uses JSON for data exchange.

## Base URL
```
https://api.example.com/v1
```

## Authentication
All API endpoints except for public routes require authentication using JWT tokens. Include the token in the Authorization header:
```
Authorization: Bearer <token>
```

## API Endpoints

### Authentication

#### Login
- **POST** `/auth/login`
- **Description**: Authenticate user and get access token
- **Request Body**:
  ```json
  {
    "email": "string",
    "password": "string",
    "rememberMe": boolean
  }
  ```
- **Response**:
  ```json
  {
    "token": "string",
    "user": {
      "id": "string",
      "email": "string",
      "name": "string"
    }
  }
  ```

#### Register
- **POST** `/auth/register`
- **Description**: Create new user account
- **Request Body**:
  ```json
  {
    "email": "string",
    "password": "string",
    "name": "string"
  }
  ```
- **Response**: Same as login response

#### Forgot Password
- **POST** `/auth/forgot-password`
- **Description**: Request password reset
- **Request Body**:
  ```json
  {
    "email": "string"
  }
  ```

#### Reset Password
- **POST** `/auth/reset-password`
- **Description**: Reset password with token
- **Request Body**:
  ```json
  {
    "token": "string",
    "newPassword": "string"
  }
  ```

#### Get Current User
- **GET** `/auth/me`
- **Description**: Get current user information
- **Response**:
  ```json
  {
    "id": "string",
    "email": "string",
    "name": "string",
    "settings": {
      // user settings
    }
  }
  ```

### Tracks

#### Upload Track
- **POST** `/tracks/upload`
- **Description**: Upload new GPX track file
- **Content-Type**: `multipart/form-data`
- **Request Body**:
  ```json
  {
    "file": "File (GPX)",
    "name": "string",
    "difficulty": "easy|medium|hard",
    "scenery": "string",
    "description": "string"
  }
  ```
- **Response**:
  ```json
  {
    "id": "string",
    "name": "string",
    "preview": {
      "coordinates": [[number, number]],
      "distance": "string",
      "elevation": "string"
    }
  }
  ```

#### List Tracks
- **GET** `/tracks`
- **Description**: Get list of tracks
- **Query Parameters**:
  - `page`: number (default: 1)
  - `limit`: number (default: 20)
  - `difficulty`: string
  - `search`: string
- **Response**:
  ```json
  {
    "tracks": [
      {
        "id": "string",
        "name": "string",
        "difficulty": "string",
        "distance": "string",
        "elevation": "string",
        "createdAt": "string",
        "userId": "string"
      }
    ],
    "total": number,
    "page": number,
    "limit": number
  }
  ```

#### Get Track
- **GET** `/tracks/:id`
- **Description**: Get single track details
- **Response**:
  ```json
  {
    "id": "string",
    "name": "string",
    "difficulty": "string",
    "scenery": "string",
    "description": "string",
    "distance": "string",
    "elevation": "string",
    "coordinates": [[number, number]],
    "createdAt": "string",
    "userId": "string"
  }
  ```

#### Update Track
- **PUT** `/tracks/:id`
- **Description**: Update track information
- **Request Body**:
  ```json
  {
    "name": "string",
    "difficulty": "string",
    "scenery": "string",
    "description": "string"
  }
  ```

#### Delete Track
- **DELETE** `/tracks/:id`
- **Description**: Delete track

### User Settings

#### Get Settings
- **GET** `/settings`
- **Description**: Get user settings
- **Response**:
  ```json
  {
    "theme": "string",
    "notifications": boolean,
    "units": "metric|imperial"
  }
  ```

#### Update Settings
- **PUT** `/settings`
- **Description**: Update user settings
- **Request Body**:
  ```json
  {
    "theme": "string",
    "notifications": boolean,
    "units": "string"
  }
  ```

## Error Responses

All error responses follow this format:
```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": object
  }
}
```

## Public Route Browsing

### Public Routes Endpoint

#### GET /api/v1/public/routes
Get all routes from all active users. This is a public endpoint that doesn't require authentication.

**Query Parameters:**
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of routes per page (default: 20, max: 100)
- `difficulty` (optional): Filter by difficulty level (easy, moderate, hard, expert)
- `search` (optional): Search in route name and description

**Response:**
```json
{
  "routes": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "Route Name",
      "difficulty": "moderate",
      "scenery_description": "Beautiful mountain trail",
      "additional_notes": "Best in spring",
      "total_distance": 15.5,
      "max_elevation_gain": 800.0,
      "estimated_duration": 180,
      "filename": "route.gpx",
      "file_size": 1024,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "user": {
        "id": "uuid",
        "name": "User Name"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total_count": 100,
    "total_pages": 5
  }
}
```

**Example Requests:**
- `GET /api/v1/public/routes` - Get first 20 routes
- `GET /api/v1/public/routes?page=2&limit=10` - Get 10 routes from page 2
- `GET /api/v1/public/routes?difficulty=hard` - Get only hard difficulty routes
- `GET /api/v1/public/routes?search=mountain` - Search for routes with "mountain" in name or description
- `GET /api/v1/public/routes?page=1&limit=5&difficulty=moderate&search=trail` - Combined filters with pagination

## Route Download Management

### Generate Download URL

#### GET /api/v1/routes/:id/download
Generate a presigned URL for downloading a GPX file. Users must be authenticated but can download any user's GPX file.

**Authentication:** Required (JWT token)

**Path Parameters:**
- `id` (required): Route ID

**Query Parameters:**
- `expiration` (optional): URL expiration time in minutes (default: 15, max: 60)

**Response:**
```json
{
  "download_url": "https://presigned-url-to-gpx-file",
  "expires_at": "2024-01-01T00:15:00Z",
  "route_info": {
    "id": "uuid",
    "name": "Route Name",
    "filename": "route.gpx",
    "file_size": 1024,
    "creator_name": "Creator Name"
  }
}
```

**Example Requests:**
- `GET /api/v1/routes/123/download` - Generate download URL with default 15-minute expiration
- `GET /api/v1/routes/123/download?expiration=30` - Generate download URL with 30-minute expiration
- `GET /api/v1/routes/123/download?expiration=5` - Generate download URL with 5-minute expiration

**Error Responses:**
- `401 Unauthorized` - User not authenticated
- `400 Bad Request` - Route ID is required
- `404 Not Found` - Route not found
- `500 Internal Server Error` - Failed to generate download URL
