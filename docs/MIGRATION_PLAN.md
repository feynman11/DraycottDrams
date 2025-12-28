# Draycott Drambusters - Production Application Migration Plan

## Overview

Transform the current React/Vite whisky club prototype into a full-stack production application using Next.js, Drizzle ORM, PostgreSQL, and Google SSO authentication.

## Current State Analysis

### Application Features
- **World Map Visualization**: Interactive D3.js map showing whisky distilleries
- **Whisky Library**: Grid view of all whiskies with filtering
- **Whisky Details**: Detailed tasting notes and flavour profiles
- **AI Sommelier**: Gemini-powered chat interface for whisky recommendations
- **Static Data**: 8 whisky entries stored in constants.ts

### Technical Stack (Current)
- React 19.2.3
- Vite 6.2.0
- TypeScript
- D3.js for maps
- Recharts for data visualization
- Lucide React icons
- Tailwind CSS (via class names)
- Gemini AI API

## Target Architecture

### Frontend
- **Framework**: Next.js 15+ with App Router
- **Runtime**: Bun
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: React Query (TanStack Query)
- **Maps**: D3.js (maintain existing implementation)
- **Charts**: Recharts (maintain existing implementation)

### Backend
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: NextAuth.js with Google OAuth
- **API**: tRPC (following spcc reference)
- **File Storage**: Local file system (for now, can be upgraded to MinIO later)

### Infrastructure
- **Deployment**: Docker + docker-compose
- **Environment**: Development and Production configs
- **Database**: PostgreSQL with connection pooling

## Migration Phases

### Phase 1: Project Setup & Infrastructure

1. **Initialize Next.js Project**
   - Create new Next.js app with Bun
   - Configure TypeScript
   - Set up Tailwind CSS and shadcn/ui
   - Copy existing components and styles

2. **Database Setup**
   - Configure Drizzle ORM
   - Design database schema for:
     - Users (authentication)
     - Whiskies (product catalog)
     - Tastings (user reviews/ratings)
     - Club Events (future feature)
   - Set up database migrations

3. **Authentication System**
   - Implement NextAuth.js with Google OAuth
   - User registration and profile management
   - Role-based access (member, admin)

### Phase 2: Data Migration & API Development

4. **Database Models & Seeding**
   - Convert static whisky data to database records
   - Create seed scripts for initial data
   - Implement data validation with Zod

5. **API Layer**
   - Set up tRPC procedures for:
     - Whisky CRUD operations
     - User management
     - Tasting submissions
     - AI sommelier integration

6. **Component Migration**
   - Port existing React components to Next.js
   - Implement proper SSR for map visualization
   - Add loading states and error handling

### Phase 3: Feature Enhancement & Production

7. **Enhanced Features**
   - User dashboards and tasting history
   - Whisky rating and review system
   - Advanced filtering and search
   - Club event management (future)

8. **Production Configuration**
   - Environment variable management
   - Docker containerization
   - Database connection pooling
   - Error monitoring and logging

9. **Documentation**
   - API documentation
   - Deployment guides
   - User manuals
   - Technical specifications

## Database Schema Design

### Core Entities

```sql
-- Users (authentication & profiles)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  image TEXT,
  role TEXT DEFAULT 'user',
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Whiskies (product catalog)
CREATE TABLE whiskies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  distillery TEXT NOT NULL,
  region TEXT NOT NULL,
  country TEXT NOT NULL,
  type TEXT NOT NULL,
  abv DECIMAL NOT NULL,
  age INTEGER,
  price_range TEXT,
  description TEXT NOT NULL,
  coordinates JSONB, -- [longitude, latitude]
  flavour_profile JSONB, -- {peat, fruit, floral, spice, wood, sweetness}
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tastings (user reviews)
CREATE TABLE tastings (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  whisky_id TEXT REFERENCES whiskies(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  tasting_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tasting Notes (detailed flavour notes per tasting)
CREATE TABLE tasting_notes (
  id TEXT PRIMARY KEY,
  tasting_id TEXT REFERENCES tastings(id),
  note TEXT NOT NULL,
  intensity INTEGER CHECK (intensity >= 1 AND intensity <= 5),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Indexes & Constraints

```sql
-- Performance indexes
CREATE INDEX idx_whiskies_region ON whiskies(region);
CREATE INDEX idx_whiskies_country ON whiskies(country);
CREATE INDEX idx_whiskies_type ON whiskies(type);
CREATE INDEX idx_tastings_user_id ON tastings(user_id);
CREATE INDEX idx_tastings_whisky_id ON tastings(whisky_id);
CREATE INDEX idx_tasting_notes_tasting_id ON tasting_notes(tasting_id);

-- Unique constraints
ALTER TABLE tastings ADD CONSTRAINT unique_user_whisky_tasting
  UNIQUE (user_id, whisky_id, tasting_date);
```

## API Architecture (tRPC)

### Whisky Procedures
- `whisky.getAll`: Get all whiskies with optional filtering
- `whisky.getById`: Get detailed whisky information
- `whisky.search`: Search whiskies by name/distillery
- `whisky.getNearby`: Find whiskies by location proximity

### User Procedures
- `user.getProfile`: Get current user profile
- `user.updateProfile`: Update user information
- `user.getTastings`: Get user's tasting history

### Tasting Procedures
- `tasting.create`: Submit a new tasting
- `tasting.update`: Update existing tasting
- `tasting.delete`: Remove tasting
- `tasting.getByWhisky`: Get all tastings for a whisky

### AI Procedures
- `ai.getRecommendation`: Get whisky recommendations based on preferences
- `ai.analyzeTasting`: Analyze user's tasting notes

## Authentication Flow

### Google OAuth Integration
1. User clicks "Sign in with Google"
2. NextAuth redirects to Google OAuth
3. Google returns user information
4. System creates/updates user record
5. User session is established
6. Protected routes become accessible

### Session Management
- JWT tokens for session persistence
- Automatic token refresh
- Secure cookie storage
- Role-based route protection

## Component Architecture

### Page Structure
```
app/
├── layout.tsx (root layout with auth provider)
├── page.tsx (homepage/dashboard)
├── signin/
│   └── page.tsx
├── whiskies/
│   ├── page.tsx (library view)
│   └── [id]/
│       └── page.tsx (detail view)
├── tastings/
│   ├── page.tsx (user tastings)
│   └── new/
│       └── page.tsx (add tasting)
└── api/
    └── trpc/[trpc] (tRPC handler)
```

### Shared Components
- `components/ui/` - shadcn/ui components
- `components/whisky/` - whisky-specific components
- `components/auth/` - authentication components
- `components/map/` - map visualization
- `components/ai/` - AI sommelier interface

## Deployment Strategy

### Development
- Local PostgreSQL database
- Hot reload with Bun
- Environment variables for local config
- Docker for isolated development

### Production
- Docker containerization
- PostgreSQL database
- Environment-based configuration
- Health checks and monitoring
- Database backups and migrations

## Documentation Structure

```
docs/
├── README.md (project overview)
├── ARCHITECTURE.md (technical architecture)
├── API.md (API documentation)
├── DEPLOYMENT.md (deployment guide)
├── ENVIRONMENT.md (environment variables)
├── DATABASE.md (database schema & migrations)
├── AUTHENTICATION.md (auth flow & security)
└── USER_GUIDE.md (user manual)
```

## Success Metrics

### Technical Metrics
- Page load times < 2 seconds
- API response times < 500ms
- 99.9% uptime
- Zero data loss in production

### User Experience Metrics
- Intuitive whisky discovery
- Fast map interactions
- Reliable AI recommendations
- Seamless authentication flow

### Business Metrics
- User registration conversion
- Tasting submission rate
- Club engagement metrics
- Feature adoption rates

## Risk Mitigation

### Technical Risks
- **Data Migration**: Thorough testing of data conversion
- **Performance**: Implement caching and optimization
- **Security**: Regular security audits and updates
- **Scalability**: Design for horizontal scaling

### Operational Risks
- **Downtime**: Implement blue-green deployments
- **Data Loss**: Regular backups and recovery testing
- **User Support**: Comprehensive logging and monitoring

## Timeline & Milestones

### Week 1-2: Foundation
- Next.js setup and configuration
- Database schema design and implementation
- Authentication system implementation
- Basic component migration

### Week 3-4: Core Features
- Complete API implementation
- Full component migration
- Data seeding and testing
- AI integration

### Week 5-6: Enhancement & Testing
- Advanced features implementation
- Performance optimization
- Comprehensive testing
- Documentation completion

### Week 7-8: Production & Launch
- Production deployment setup
- Security hardening
- User acceptance testing
- Go-live preparation

## Conclusion

This migration plan provides a comprehensive roadmap for transforming the Draycott Drambusters prototype into a production-ready whisky club management system. The phased approach ensures minimal disruption while building a scalable, maintainable application that can grow with the club's needs.
