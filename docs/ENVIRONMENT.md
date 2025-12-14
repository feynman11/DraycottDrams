# Environment Variables

This document describes all environment variables required for the Draycott Drams whisky club application.

## Getting Started

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env.local
   ```
   Or use the setup script:
   ```bash
   bun run setup:env
   ```

2. **Fill in your actual values** in `.env.local`

3. **Never commit `.env.local`** to version control!

## Required Variables

### Database
```env
DATABASE_URL="postgresql://user:password@localhost:5432/draycottdrams?schema=public"
```
PostgreSQL connection string. Format: `postgresql://[user]:[password]@[host]:[port]/[database]?schema=[schema]`

### Authentication
```env
NEXTAUTH_URL="http://localhost:3000"
```
The base URL of your application. Used for OAuth callbacks and session management.

```env
NEXTAUTH_SECRET="your-secret-key-here-change-in-production"
```
Secret key for JWT signing and encryption. Generate a secure random string for production.

### Google OAuth
```env
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```
Google OAuth credentials. Obtain these from the [Google Cloud Console](https://console.cloud.google.com/).

### AI Services
```env
GEMINI_API_KEY="your-gemini-api-key"
```
API key for Google Gemini AI. Obtain from [Google AI Studio](https://aistudio.google.com/).

## Optional Variables

```env
APP_URL="http://localhost:3000"
```
Application URL (can be used for generating absolute URLs).

### MapTiler (Maps)
```env
MAPTILER_API_KEY="your-maptiler-api-key"
```
API key for MapTiler map tiles. Obtain from [MapTiler Cloud](https://cloud.maptiler.com/). 
This key is stored server-side and exposed via `/api/map-key` route for security.
If not provided, the map will use a demo style (limited functionality).

## Generating Secrets

### NEXTAUTH_SECRET

You can generate a secure secret using:

**Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**OpenSSL:**
```bash
openssl rand -base64 32
```

**Online:**
Use a secure random string generator or password manager.

## Setting up Google OAuth

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" in the left sidebar
5. Click "Create Credentials" > "OAuth client ID"
6. Configure the OAuth consent screen if prompted
7. Set the application type to "Web application"
8. Add authorized redirect URIs:
   - For development: `http://localhost:3000/api/auth/callback/google`
   - For production: `https://yourdomain.com/api/auth/callback/google`
9. Copy the Client ID and Client Secret to your environment variables

## Example .env File

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/draycottdrams"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-generated-secret-here"

# Google OAuth
GOOGLE_CLIENT_ID="123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-abcdefghijklmnopqrstuvwxyz"

# AI Services
GEMINI_API_KEY="AIzaSyabcdefghijklmnopqrstuvwxyz"

# Optional
APP_URL="http://localhost:3000"
MAPTILER_API_KEY="your-maptiler-api-key"
```

## Production Considerations

1. **Never commit `.env` files** to version control
2. **Use strong secrets** for `NEXTAUTH_SECRET` in production
3. **Enable secure OAuth callbacks** for production domains
4. **Use environment-specific values** for different deployment environments
5. **Consider using a secrets manager** (AWS Secrets Manager, HashiCorp Vault, etc.) for production

## Local Development Setup

1. Copy `.env.example` to `.env.local`
2. Fill in the required values
3. Set up a PostgreSQL database
4. Run database migrations: `bun run db:push`
5. Seed the database: `bun run db:seed`
