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
