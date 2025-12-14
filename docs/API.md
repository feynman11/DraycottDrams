# API Documentation

This document describes the tRPC API endpoints available in the Draycott Drams application.

## Overview

The application uses [tRPC](https://trpc.io/) for type-safe API communication between the frontend and backend. All API calls are made through the `/api/trpc` endpoint.

## Authentication

Most API endpoints require authentication. The application uses NextAuth.js with Google OAuth. Include authentication headers automatically handled by the tRPC client.

## API Endpoints

### Whisky Management

#### `whisky.getAll`

Get all whiskies with optional filtering and pagination.

**Parameters:**
```typescript
{
  search?: string;     // Search by name or distillery
  region?: string;     // Filter by region
  type?: string;       // Filter by whisky type
  limit?: number;      // Max results (default: 50)
  offset?: number;     // Pagination offset (default: 0)
}
```

**Response:**
```typescript
{
  id: string;
  name: string;
  distillery: string;
  region: string;
  country: string;
  type: string;
  abv: string;
  age?: number;
  priceRange: string;
  description: string;
  tastingNotes: string[];
  coordinates: [number, number];
  flavorProfile: {
    peat: number;
    fruit: number;
    floral: number;
    spice: number;
    wood: number;
    sweetness: number;
  };
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}[]
```

#### `whisky.getById`

Get detailed information about a specific whisky.

**Parameters:**
```typescript
{
  id: string;  // Whisky ID
}
```

**Response:** Single whisky object (same as above)

#### `whisky.getNearby`

Find whiskies near a geographic location.

**Parameters:**
```typescript
{
  lat: number;      // Latitude
  lng: number;      // Longitude
  radius?: number;  // Search radius in km (default: 1000)
  limit?: number;   // Max results (default: 20)
}
```

**Response:** Array of whisky objects

#### `whisky.getStats`

Get whisky statistics and aggregations.

**Response:**
```typescript
{
  total: number;
  regions: { region: string; count: number }[];
  types: { type: string; count: number }[];
}
```

### User Management

#### `user.getProfile`

Get current user profile information.

**Authentication:** Required

**Response:**
```typescript
{
  id: string;
  email: string;
  name?: string;
  image?: string;
  role: "public" | "user" | "member" | "admin";
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

#### `user.updateProfile`

Update user profile information.

**Authentication:** Required

**Parameters:**
```typescript
{
  name?: string;
  image?: string;
}
```

**Response:** Updated user object

### Tasting Management

#### `tasting.create`

Create a new tasting entry.

**Authentication:** Required

**Parameters:**
```typescript
{
  whiskyId: string;
  rating: number;     // 1-5
  notes?: string;
  tastingDate: Date;
  tastingNotes?: {
    note: string;
    intensity: number;  // 1-5
  }[];
}
```

**Response:** Created tasting object

#### `tasting.update`

Update an existing tasting.

**Authentication:** Required (user must own the tasting)

**Parameters:**
```typescript
{
  id: string;
  rating?: number;
  notes?: string;
  tastingDate?: Date;
  tastingNotes?: {
    note: string;
    intensity: number;
  }[];
}
```

**Response:** Updated tasting object

#### `tasting.delete`

Delete a tasting entry.

**Authentication:** Required (user must own the tasting)

**Parameters:**
```typescript
{
  id: string;
}
```

**Response:**
```typescript
{
  success: boolean;
}
```

#### `tasting.getUserTastings`

Get user's tasting history.

**Authentication:** Required

**Parameters:**
```typescript
{
  limit?: number;   // Default: 20
  offset?: number;  // Default: 0
}
```

**Response:**
```typescript
{
  tasting: {
    id: string;
    userId: string;
    whiskyId: string;
    rating: number;
    notes?: string;
    tastingDate: Date;
    createdAt: Date;
    updatedAt: Date;
  };
  whisky: {
    id: string;
    name: string;
    distillery: string;
    region: string;
  };
}[]
```

#### `tasting.getByWhisky`

Get all tastings for a specific whisky.

**Parameters:**
```typescript
{
  whiskyId: string;
  limit?: number;  // Default: 10
}
```

**Response:** Array of tasting objects with user information

### AI Features

#### `ai.getRecommendation`

Get whisky recommendations based on user preferences.

**Parameters:**
```typescript
{
  preferences: {
    flavorProfile?: {
      peat?: number;
      fruit?: number;
      floral?: number;
      spice?: number;
      wood?: number;
      sweetness?: number;
    };
    regions?: string[];
    types?: string[];
    priceRange?: string;
    experience?: "beginner" | "intermediate" | "advanced";
  };
  context?: string;  // Additional context
}
```

**Response:**
```typescript
{
  recommendations: {
    name: string;
    reason: string;
  }[];
}
```

#### `ai.analyzeTasting`

Analyze a tasting experience and provide insights.

**Authentication:** Required

**Parameters:**
```typescript
{
  whiskyName: string;
  tastingNotes: string[];
  rating: number;
  personalNotes?: string;
}
```

**Response:**
```typescript
{
  analysis: string;
  whiskyName: string;
  tastingNotes: string[];
  rating: number;
}
```

#### `ai.chat`

Have a conversation with the AI sommelier.

**Parameters:**
```typescript
{
  message: string;
  context?: {
    role: "user" | "assistant";
    content: string;
  }[];  // Previous conversation context
}
```

**Response:**
```typescript
{
  response: string;
  timestamp: string;
}
```

## Error Handling

All API endpoints return errors in a consistent format:

```typescript
{
  error: {
    message: string;
    code: string;
    data?: any;
  }
}
```

### Common Error Codes

- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `BAD_REQUEST` - Invalid input data
- `INTERNAL_SERVER_ERROR` - Server error

## Rate Limiting

API endpoints are rate limited to prevent abuse:
- Authenticated users: 100 requests per minute
- Unauthenticated users: 20 requests per minute

## Data Types

### Whisky Types

```typescript
enum WhiskyType {
  "Single Malt" = "Single Malt",
  "Single Grain" = "Single Grain",
  "Single Pot Still" = "Single Pot Still",
  "Single Blend" = "Single Blend",
  "Blended Malt" = "Blended Malt",
  "Blended Grain" = "Blended Grain",
  "Bourbon" = "Bourbon",
  "Rye" = "Rye",
  "Corn" = "Corn",
  "Wheat" = "Wheat"
}
```

### Regions

Common whisky regions include:
- Scotland: Islay, Speyside, Highlands, Lowlands, Campbeltown
- Ireland: Cork, Dublin
- Japan: Various prefectures
- USA: Kentucky, Tennessee, etc.
- Other: Taiwan, India, etc.

### Flavor Profile Scale

All flavor characteristics are rated 0-100:
- 0-20: Not present
- 21-40: Subtle
- 41-60: Noticeable
- 61-80: Prominent
- 81-100: Dominant

## Client Usage

### React Query Integration

The application uses TanStack Query for client-side data management:

```typescript
import { api } from "@/lib/trpc-client";

// Get whiskies
const { data: whiskies, isLoading } = api.whisky.getAll.useQuery({
  region: "Islay"
});

// Create tasting
const createTasting = api.tasting.create.useMutation();
await createTasting.mutateAsync({
  whiskyId: "w1",
  rating: 4,
  tastingDate: new Date()
});
```

### Type Safety

All API calls are fully type-safe. The TypeScript types are automatically generated from the tRPC router definitions.

## Webhooks and Events

Currently, the API does not support webhooks. All interactions are synchronous through the tRPC endpoints.

## Versioning

The API follows semantic versioning. Breaking changes will be communicated in advance with migration guides.

## Support

For API-related issues:
1. Check the browser network tab for detailed error messages
2. Verify authentication status
3. Ensure correct parameter types
4. Review the type definitions in the codebase
