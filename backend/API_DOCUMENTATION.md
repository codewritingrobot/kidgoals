# Goalaroo API Documentation

## Overview

The Goalaroo API provides a comprehensive set of endpoints for managing child goal tracking. The API uses JWT authentication and supports various goal types including timers, countdown, and countup goals.

## Accessing the Documentation

### Production
- **Swagger UI**: https://api.goalaroo.mcsoko.com/api-docs
- **API Base URL**: https://api.goalaroo.mcsoko.com

### Development
- **Swagger UI**: http://localhost:3000/api-docs
- **API Base URL**: http://localhost:3000

## Authentication

The API uses JWT (JSON Web Token) authentication with magic code email verification:

1. **Send Magic Code**: `POST /api/auth/send-code`
   - Send your email address to receive a 6-digit code
   
2. **Verify Code**: `POST /api/auth/verify-code`
   - Submit the code to receive a JWT token
   
3. **Use Token**: Include the token in the `Authorization` header:
   ```
   Authorization: Bearer <your-jwt-token>
   ```

## API Endpoints

### Authentication
- `POST /api/auth/send-code` - Send magic code to email
- `POST /api/auth/verify-code` - Verify code and get JWT token

### Children Management
- `GET /api/children` - Get all children
- `POST /api/children` - Create a new child
- `PUT /api/children/{id}` - Update a child
- `DELETE /api/children/{id}` - Delete a child

### Goals Management
- `GET /api/goals` - Get all goals
- `POST /api/goals` - Create new goals
- `PUT /api/goals/{id}` - Update a goal
- `DELETE /api/goals/{id}` - Delete a goal

### User Data (Backward Compatibility)
- `GET /api/user/data` - Get all user data (children + goals)

## Goal Types

### Timer Goals
- **Type**: `timer`
- **Properties**: `duration`, `unit`, `timerType`, `totalDuration`
- **Timer Types**: `countdown`, `countup`
- **Units**: `seconds`, `minutes`, `hours`, `days`

### Count Goals
- **Types**: `countdown`, `countup`
- **Properties**: `target`, `current`
- **Countdown**: Decrease from target to 0
- **Countup**: Increase from 0 to target

## Data Models

### Child
```json
{
  "id": "uuid",
  "name": "string",
  "avatar": "string (emoji)",
  "color": "#hexcolor",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Goal
```json
{
  "id": "uuid",
  "groupId": "uuid",
  "childId": "uuid",
  "name": "string",
  "type": "timer|countdown|countup",
  "color": "#hexcolor",
  "status": "active|paused|completed|waiting",
  "progress": "number (0-100)",
  "startTime": "timestamp",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

API requests are rate limited to 100 requests per 15 minutes per IP address.

## Testing with Swagger UI

1. Open the Swagger UI at `/api-docs`
2. Click "Authorize" and enter your JWT token
3. Test endpoints directly from the browser
4. View request/response schemas and examples

## Examples

### Creating a Timer Goal
```json
POST /api/goals
{
  "name": "Practice Piano",
  "type": "timer",
  "childIds": ["child-uuid"],
  "color": "#FF6B6B",
  "duration": 30,
  "unit": "minutes",
  "timerType": "countdown"
}
```

### Creating a Count Goal
```json
POST /api/goals
{
  "name": "Read Books",
  "type": "countup",
  "childIds": ["child-uuid"],
  "color": "#4ECDC4",
  "target": 10
}
```

## Support

For API support or questions, contact: support@goalaroo.mcsoko.com 