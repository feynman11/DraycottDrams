# Draycott Drambusters - Whisky Club Management System

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://developers.cloudflare.com/workers/)
[![D1](https://img.shields.io/badge/Cloudflare-D1-orange)](https://developers.cloudflare.com/d1/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![Drizzle](https://img.shields.io/badge/Drizzle-ORM-blue)](https://orm.drizzle.team/)
[![Better Auth](https://img.shields.io/badge/Better_Auth-Google-red)](https://www.better-auth.com/)

A modern, full-stack whisky club management application running entirely on Cloudflare, featuring an interactive world map, AI-powered sommelier recommendations, tasting notes, and Google sign-in.

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
- **AI-powered recommendations** based on preferences
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

- **Node 26 + pnpm 12** (`mise install` reads `mise.toml`)
- **Google Cloud** OAuth client (for sign-in)
- **Cloudflare** account (only to deploy, or to use the AI sommelier locally)

### Installation

```bash
git clone https://github.com/feynman11/DraycottDrams.git
cd DraycottDrams
pnpm install
cp .dev.vars.example .dev.vars   # fill in the values
pnpm db:migrate:local            # local D1 database, no server needed
pnpm db:seed                     # optional sample data
pnpm dev                         # http://localhost:5173
```

See [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) for the variables and local workflow.

## 🛠️ Tech Stack

### Frontend
- **Vite + React 19** single-page app with **TanStack Router**
- **Tailwind CSS 4** and **shadcn/ui**
- **D3.js**, **Recharts** and **MapLibre GL** for maps and charts
- **TanStack Query** through tRPC

### Backend
- **Cloudflare Workers** with **Hono**, one Worker for both the app and the API
- **tRPC** for type-safe API calls
- **Cloudflare D1** (SQLite) with **Drizzle ORM** and checked-in migrations
- **Better Auth** for Google sign-in, with sessions stored in D1

### AI
- **Workers AI** (gpt-oss-120b) through **Cloudflare AI Gateway**, which handles caching, rate limits and logs

### Delivery
- **GitHub Actions**: checks on every PR, a preview URL per PR, staging on every merge, and production deploys by hand
- **Renovate**: dependency updates each week

## 🗂️ Project Structure

```
src/          React app (entry, router, pages)
components/   UI components
lib/          Shared, browser-safe code; auth and tRPC clients
worker/       Cloudflare Worker: Hono entry, tRPC routers, Better Auth, D1
db/           Drizzle schema and SQL migrations
scripts/      Seed/import scripts and Cloudflare bootstrap
docs/         Deployment, environment and API docs
```

## 📖 Available Scripts

```bash
pnpm dev                 # app + Worker locally (local D1)
pnpm dev:ai              # same, with Workers AI (needs `wrangler login`)
pnpm build               # production build
pnpm typecheck           # TypeScript
pnpm db:generate         # new migration from db/schema.ts
pnpm db:migrate:local    # apply migrations locally
pnpm db:seed             # seed sample data
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

Deploys run from GitHub Actions only:
- **Previews:** each PR gets one at `pr-<n>-draycottdrams-staging.<sub>.workers.dev`.
- **Staging:** every merge to `main` deploys there.
- **Production:** run the *deploy* workflow by hand with target `production`.

First-time setup is `scripts/bootstrap-cloudflare.sh`. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full guide, including moving data from the old Postgres database.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `pnpm typecheck` and `pnpm build`
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

- **Draycott Drambusters** whisky club members for inspiration
- **Open source community** for the amazing tools and libraries
- **Whisky enthusiasts** worldwide for sharing knowledge

## 📞 Support

For support or questions:
- Open an issue on GitHub
- Check the documentation in the `docs/` folder
- Review the troubleshooting section in deployment docs

---

**Enjoy exploring the world of whisky! 🥃**