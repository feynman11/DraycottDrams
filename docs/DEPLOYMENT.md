# Deployment Guide

This guide covers deploying the Draycott Drams whisky club application to production.

## Prerequisites

- Docker and Docker Compose
- PostgreSQL database (local or cloud)
- Google OAuth credentials
- Google Gemini API key
- Domain name (optional)

## Quick Start with Docker Compose

### Development Deployment

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd draycott-drams-whisky-club
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your environment variables (see [ENVIRONMENT.md](ENVIRONMENT.md))

3. **Start with Docker Compose:**
   ```bash
   docker-compose up --build
   ```

4. **Access the application:**
   - Application: http://localhost:3000
   - Database: localhost:5432

### Production Deployment

1. **Update environment variables:**
   ```bash
   # Set production values in .env.local
   NEXTAUTH_URL=https://yourdomain.com
   DATABASE_URL=postgresql://user:password@host:5432/dbname
   ```

2. **Build for production:**
   ```bash
   docker-compose -f docker-compose.yml up --build -d
   ```

## Manual Deployment

### Using Docker

1. **Build the image:**
   ```bash
   docker build -t draycott-drams .
   ```

2. **Run the container:**
   ```bash
   docker run -p 3000:3000 \
     -e DATABASE_URL="postgresql://..." \
     -e NEXTAUTH_SECRET="..." \
     -e NEXTAUTH_URL="https://yourdomain.com" \
     -e GOOGLE_CLIENT_ID="..." \
     -e GOOGLE_CLIENT_SECRET="..." \
     -e GEMINI_API_KEY="..." \
     draycott-drams
   ```

### Using Bun Directly

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Set up database:**
   ```bash
   bun run db:push
   bun run db:seed
   ```

3. **Build and start:**
   ```bash
   bun run build
   bun run start
   ```

## Environment Configuration

### Production Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require

# Authentication
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-production-secret-here

# Google OAuth (Production)
GOOGLE_CLIENT_ID=your-production-client-id
GOOGLE_CLIENT_SECRET=your-production-client-secret

# AI Services
GEMINI_API_KEY=your-production-api-key

# Optional
APP_URL=https://yourdomain.com
```

### Database Setup

#### Using PostgreSQL Cloud Services

**Supabase:**
```env
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
```

**Neon:**
```env
DATABASE_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

**Railway:**
```env
DATABASE_URL=${{ Railway.DATABASE_URL }}
```

#### Local PostgreSQL

```bash
# Create database
createdb draycottdrams

# Or using Docker
docker run --name postgres -e POSTGRES_PASSWORD=password -d postgres:15
```

### SSL and Security

1. **Enable SSL for database connections:**
   ```env
   DATABASE_URL=postgresql://user:password@host:5432/db?sslmode=require
   ```

2. **Use secure secrets:**
   - Generate strong `NEXTAUTH_SECRET`
   - Use production OAuth credentials
   - Enable 2FA for Google Cloud Console

## Reverse Proxy Configuration

### Nginx Example

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Apache Example

```apache
<VirtualHost *:80>
    ServerName yourdomain.com

    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/

    <Location />
        Require all granted
        ProxyPassReverse /
        RequestHeader set X-Forwarded-Proto "https"
    </Location>
</VirtualHost>
```

## SSL Certificate (HTTPS)

### Using Let's Encrypt

```bash
# Install certbot
sudo apt install certbot

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Automatic renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Using CloudFlare

1. Sign up for CloudFlare
2. Add your domain
3. Update nameservers
4. Enable SSL/TLS encryption

## Monitoring and Maintenance

### Health Checks

The application includes health check endpoints:
- `GET /api/health` - Application health
- `GET /api/trpc/health` - API health

### Database Backups

```bash
# Manual backup
pg_dump draycottdrams > backup.sql

# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump draycottdrams > backup_$DATE.sql
# Upload to cloud storage...
```

### Logs

```bash
# View application logs
docker-compose logs -f app

# View database logs
docker-compose logs -f db
```

## Scaling Considerations

### Database Scaling

1. **Connection Pooling:** Use PgBouncer or similar
2. **Read Replicas:** For read-heavy operations
3. **Caching:** Redis for session and API caching

### Application Scaling

1. **Load Balancer:** Nginx or AWS ALB
2. **Multiple Instances:** Docker Swarm or Kubernetes
3. **CDN:** CloudFlare or AWS CloudFront for static assets

## Troubleshooting

### Common Issues

**Database Connection Failed:**
```bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT 1"

# Check Docker containers
docker-compose ps
```

**OAuth Issues:**
- Verify `NEXTAUTH_URL` matches your domain
- Check Google OAuth redirect URIs
- Ensure HTTPS in production

**Build Failures:**
```bash
# Clear build cache
rm -rf .next
bun run build
```

### Performance Optimization

1. **Database Indexes:**
   ```sql
   CREATE INDEX CONCURRENTLY idx_whiskies_region ON whiskies(region);
   CREATE INDEX CONCURRENTLY idx_tastings_user_date ON tastings(user_id, tasting_date);
   ```

2. **Image Optimization:**
   - Use Next.js Image component
   - Implement proper image sizing
   - Consider CDN for whisky images

3. **API Optimization:**
   - Implement proper caching
   - Use database connection pooling
   - Optimize queries with proper indexes

## Backup and Recovery

### Database Backup

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d)
pg_dump draycottdrams > /backups/draycottdrams_$DATE.sql

# Keep last 30 days
find /backups -name "draycottdrams_*.sql" -mtime +30 -delete
```

### Application Backup

```bash
# Backup user uploads and configuration
tar -czf backup_$(date +%Y%m%d).tar.gz \
  .env.local \
  public/uploads/ \
  --exclude=node_modules
```

### Recovery

```bash
# Restore database
psql draycottdrams < backup.sql

# Restore application files
tar -xzf backup.tar.gz
```

## Security Checklist

- [ ] HTTPS enabled
- [ ] Strong database password
- [ ] `NEXTAUTH_SECRET` is secure and unique
- [ ] OAuth credentials are production-only
- [ ] Database backups are encrypted
- [ ] Regular security updates
- [ ] Firewall configured
- [ ] Rate limiting implemented
- [ ] Input validation enabled
- [ ] CORS properly configured

## Support

For deployment issues:
1. Check application logs: `docker-compose logs app`
2. Verify environment variables
3. Test database connectivity
4. Check network/firewall settings
5. Review [troubleshooting section](#troubleshooting)
