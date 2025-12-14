#!/bin/bash

# Draycott Drams - Environment Setup Script
# This script helps new developers set up their environment variables

echo "🍶 Draycott Drams - Environment Setup"
echo "======================================"

# Check if .env.local already exists
if [ -f ".env.local" ]; then
    echo "⚠️  .env.local already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 1
    fi
fi

# Copy example file
cp .env.example .env.local
echo "✅ Created .env.local from .env.example"

echo ""
echo "📝 Next steps:"
echo "1. Edit .env.local with your actual values"
echo "2. Set up PostgreSQL database"
echo "3. Configure Google OAuth credentials"
echo "4. Get Gemini API key from Google AI Studio"
echo ""
echo "📚 For detailed instructions, see docs/ENVIRONMENT.md"
echo ""
echo "🚀 Once configured, run:"
echo "   bun run db:push  # Set up database schema"
echo "   bun run db:seed  # Seed with whisky data"
echo "   bun run dev      # Start development server"
