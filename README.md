# Draycott Drams - Whisky Club Management System

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black)](https://nextjs.org/)
[![Bun](https://img.shields.io/badge/Bun-1.3.4-yellow)](https://bun.sh/)
[![Drizzle](https://img.shields.io/badge/Drizzle-ORM-blue)](https://orm.drizzle.team/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)](https://postgresql.org/)
[![Google OAuth](https://img.shields.io/badge/Google-OAuth-red)](https://developers.google.com/identity/protocols/oauth2)
[![Gemini AI](https://img.shields.io/badge/Gemini-AI-orange)](https://ai.google.dev/)

A modern, full-stack whisky club management application built with Next.js, featuring an interactive world map, AI-powered sommelier recommendations, tasting notes, and Google SSO authentication.

## ✨ Features

### 🗺️ Interactive World Map
- **D3.js-powered visualization** of whisky distilleries worldwide
- **Interactive pins** showing distillery locations
- **Zoom and pan controls** for detailed exploration
- **Real-time tooltips** with whisky information

### 🍶 Whisky Library
- **Comprehensive database** of whiskies with detailed profiles
- **Advanced filtering** by region, type, and characteristics
- **Tasting notes** and flavour profiles
- **Price range information**

### 🤖 AI Sommelier
- **Gemini-powered recommendations** based on preferences
- **Tasting analysis** and insights
- **Conversational chat** interface
- **Personalized suggestions**

### 👥 User Management
- **Google OAuth authentication**
- **User profiles** and preferences
- **Tasting history** tracking
- **Club member management**

### 📊 Data & Analytics
- **flavour profile visualization**
- **Tasting statistics**
- **Club activity tracking**
- **Regional whisky distribution**

## 🚀 Quick Start

### Prerequisites

- **Bun** (runtime and package manager)
- **PostgreSQL** database
- **Google Cloud** account (for OAuth)
- **Google AI Studio** account (for Gemini API)

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd draycott-drams-whisky-club
   bun install
   ```

2. **Set up environment variables:**
   ```bash
   # Option 1: Use the setup script (recommended)
   bun run setup:env
   # or
   ./scripts/setup-env.sh

   # Option 2: Manual setup
   cp .env.example .env.local
   ```
   Fill in the required values (see [Environment Setup](#environment-setup))

3. **Set up the database:**
   ```bash
   # Push schema to database
   bun run db:push

   # Seed with initial whisky data
   bun run db:seed
   ```

4. **Start the development server:**
   ```bash
   bun run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)** in your browser

## 🛠️ Tech Stack

### Frontend
- **[Next.js 15](https://nextjs.org/)** - React framework with App Router
- **[React 19](https://react.dev/)** - UI library
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com/)** - Modern UI components
- **[D3.js](https://d3js.org/)** - Data visualization
- **[Recharts](https://recharts.org/)** - Chart library

### Backend
- **[tRPC](https://trpc.io/)** - Type-safe API layer
- **[Drizzle ORM](https://orm.drizzle.team/)** - Database ORM
- **[PostgreSQL](https://postgresql.org/)** - Primary database
- **[NextAuth.js](https://next-auth.js.org/)** - Authentication
- **[Zod](https://zod.dev/)** - Schema validation

### AI & External Services
- **[Google Gemini](https://ai.google.dev/)** - AI sommelier functionality
- **[Google OAuth](https://developers.google.com/identity/protocols/oauth2)** - Authentication

### Development & Deployment
- **[Bun](https://bun.sh/)** - Runtime and package manager
- **[TypeScript](https://typescriptlang.org/)** - Type safety
- **[ESLint](https://eslint.org/)** - Code linting
- **[Drizzle Kit](https://orm.drizzle.team/kit)** - Database migrations

## 🗂️ Project Structure

```
draycott-drams-whisky-club/
├── app/                          # Next.js App Router
│   ├── api/
│   │   └── trpc/                # tRPC API routes
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Homepage
│   └── globals.css              # Global styles
├── components/                   # React components
│   ├── ui/                      # shadcn/ui components
│   ├── whisky/                  # Whisky-related components
│   ├── ai/                      # AI sommelier components
│   └── layout/                  # Layout components
├── db/                          # Database layer
│   ├── schema.ts                # Drizzle schema
│   ├── seed.ts                  # Database seeding
│   └── migrations/              # Generated migrations
├── lib/                         # Utility libraries
│   ├── auth.ts                  # NextAuth configuration
│   ├── db.ts                    # Database connection
│   ├── trpc.ts                  # tRPC configuration
│   └── utils.ts                 # Helper functions
├── docs/                        # Documentation
│   ├── ENVIRONMENT.md           # Environment variables
│   ├── API.md                   # API documentation
│   └── DEPLOYMENT.md            # Deployment guide
└── public/                      # Static assets
```

## 🌍 Environment Setup

### Required Environment Variables

Create a `.env.local` file with the following variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/draycottdrams"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-generated-secret-here"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# AI Services
GEMINI_API_KEY="your-gemini-api-key"
```

See [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) for detailed setup instructions.

### Database Setup

1. **Install PostgreSQL** locally or use a cloud service
2. **Create a database** named `draycottdrams`
3. **Update DATABASE_URL** in your environment variables
4. **Run migrations:**
   ```bash
   bun run db:push
   ```
5. **Seed the database:**
   ```bash
   bun run db:seed
   ```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs for your domain
6. Copy credentials to environment variables

### AI Setup

1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Generate a Gemini API key
3. Add to `GEMINI_API_KEY` environment variable

## 📖 Available Scripts

```bash
# Development
bun run dev          # Start development server
bun run build        # Build for production
bun run start        # Start production server
bun run lint         # Run ESLint

# Database
bun run db:push      # Push schema changes
bun run db:studio    # Open Drizzle Studio
bun run db:seed      # Seed database with whisky data

# Code Generation
bun run db:generate  # Generate migrations
```

## 🎯 API Reference

The application uses tRPC for type-safe API communication. Key procedures:

### Whisky Management
- `whisky.getAll` - Get all whiskies with filtering
- `whisky.getById` - Get detailed whisky information
- `whisky.getNearby` - Find whiskies by location

### User Management
- `user.getProfile` - Get current user profile
- `user.updateProfile` - Update user information

### Tasting Management
- `tasting.create` - Submit a new tasting
- `tasting.getUserTastings` - Get user's tasting history
- `tasting.getByWhisky` - Get tastings for a whisky

### AI Features
- `ai.getRecommendation` - Get whisky recommendations
- `ai.analyzeTasting` - Analyze tasting experiences
- `ai.chat` - Conversational AI sommelier

See [docs/API.md](docs/API.md) for complete API documentation.

## 🚀 Deployment

### Production Build

```bash
bun run build
bun run start
```

### Environment Considerations

- Set `NEXTAUTH_URL` to your production domain
- Use secure secrets for production
- Configure PostgreSQL connection pooling
- Set up proper CORS policies

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment instructions.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

### Development Guidelines

- Use TypeScript for all new code
- Follow the existing component patterns
- Add proper error handling
- Update documentation for API changes
- Test database migrations thoroughly

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Draycott Drams** whisky club members for inspiration
- **Open source community** for the amazing tools and libraries
- **Whisky enthusiasts** worldwide for sharing knowledge

## 📞 Support

For support or questions:
- Open an issue on GitHub
- Check the documentation in the `docs/` folder
- Review the troubleshooting section in deployment docs

---

**Enjoy exploring the world of whisky! 🥃**