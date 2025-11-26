# Docker Deployment Guide

## Overview

This guide explains how to deploy `face_liveness_capture` using Docker and Docker Compose.

## Table of Contents

- [Quick Start](#quick-start)
- [Development Setup](#development-setup)
- [Production Setup](#production-setup)
- [Docker Compose Services](#docker-compose-services)
- [Environment Variables](#environment-variables)
- [Common Commands](#common-commands)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

### Start Application

```bash
# Clone the repository
git clone https://github.com/alok-kumar8765/face_liveness_capture.git
cd face_liveness_capture

# Copy environment file
cp .env.example .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f web
```

Application will be available at: `http://localhost:8000`

## Development Setup

### Build Image

```bash
docker build -t face-liveness:dev .
```

### Start Development Environment

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL** on localhost:5432
- **Django** app on localhost:8000
- **Redis** on localhost:6379
- **Nginx** on localhost:80

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f web
docker-compose logs -f db
docker-compose logs -f nginx
```

### Access Container Shell

```bash
docker-compose exec web bash
```

### Run Django Commands

```bash
# Migrations
docker-compose exec web python manage.py migrate

# Create superuser
docker-compose exec web python manage.py createsuperuser

# Django shell
docker-compose exec web python manage.py shell

# Collect static files
docker-compose exec web python manage.py collectstatic --noinput
```

### Run Tests

```bash
docker-compose exec web pytest tests/ -v
```

## Production Setup

### Production Docker Compose

Use production-specific configuration:

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Production Environment Variables

Create `.env.production`:

```env
DEBUG=False
SECRET_KEY=your-secure-secret-key-here
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Database
DATABASE_ENGINE=django.db.backends.postgresql
DATABASE_NAME=face_liveness_prod
DATABASE_USER=prod_user
DATABASE_PASSWORD=secure_password_here
DATABASE_HOST=db
DATABASE_PORT=5432

# Security
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000

# Email
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

### Production Deployment

```bash
# Set environment
export ENV=production

# Start services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# View status
docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

### Health Checks

```bash
# Check service health
curl http://localhost:8000/health/

# Expected response
{"status": "healthy", "timestamp": "2024-01-15T10:30:00Z"}
```

## Docker Compose Services

### Web Service

Django application server.

**Configuration:**
- Image: Custom build from Dockerfile
- Port: 8000
- Environment: Django settings
- Volumes: Source code, static files, media

**Commands:**
```bash
# Restart
docker-compose restart web

# View logs
docker-compose logs -f web

# Stop
docker-compose stop web
```

### Database Service

PostgreSQL database.

**Configuration:**
- Image: postgres:15-alpine
- Port: 5432
- Volume: postgres_data (persistent)
- Health check: Enabled

**Commands:**
```bash
# Access database
docker-compose exec db psql -U postgres -d face_liveness

# Backup database
docker-compose exec db pg_dump -U postgres face_liveness > backup.sql

# Restore database
docker-compose exec -T db psql -U postgres face_liveness < backup.sql
```

### Redis Service

In-memory data store for caching and sessions.

**Configuration:**
- Image: redis:7-alpine
- Port: 6379
- Health check: Enabled

**Commands:**
```bash
# Connect to Redis
docker-compose exec redis redis-cli

# Check Redis memory
docker-compose exec redis redis-cli INFO memory
```

### Nginx Service

Reverse proxy and static file server.

**Configuration:**
- Image: nginx:alpine
- Port: 80 (http), 443 (https)
- Volume: nginx.conf, static files, media

**Commands:**
```bash
# Restart Nginx
docker-compose restart nginx

# Check Nginx configuration
docker-compose exec nginx nginx -t

# View Nginx logs
docker-compose logs -f nginx
```

## Environment Variables

### Essential Variables

```env
# Django Settings
DEBUG=False
SECRET_KEY=django-insecure-your-secret-key

# Database
DATABASE_ENGINE=django.db.backends.postgresql
DATABASE_NAME=face_liveness
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres123
DATABASE_HOST=db
DATABASE_PORT=5432

# Application
ALLOWED_HOSTS=localhost,127.0.0.1
```

### Optional Variables

```env
# Redis
REDIS_URL=redis://redis:6379/0

# Email
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

# Logging
LOG_LEVEL=INFO

# Security
SECURE_SSL_REDIRECT=False
SESSION_COOKIE_SECURE=False

# Features
ENABLE_DEBUG_PANEL=False
MAX_UPLOAD_SIZE=10485760  # 10 MB
```

### Loading Environment

Option 1: `.env` file (automatically loaded)

```bash
cp .env.example .env
# Edit .env with your settings
docker-compose up -d
```

Option 2: Command line

```bash
docker-compose -e DEBUG=False -e SECRET_KEY=xxx up -d
```

## Common Commands

### Service Management

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose stop

# Stop and remove containers
docker-compose down

# Remove all data (reset database)
docker-compose down -v

# Restart specific service
docker-compose restart web

# View running services
docker-compose ps
```

### Logs

```bash
# View all logs
docker-compose logs

# Follow logs (real-time)
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific service
docker-compose logs web

# Timestamps
docker-compose logs --timestamps
```

### Maintenance

```bash
# Database migrations
docker-compose exec web python manage.py migrate

# Create cache table
docker-compose exec web python manage.py createcachetable

# Clear cache
docker-compose exec web python manage.py shell -c "from django.core.cache import cache; cache.clear()"

# Database backup
docker-compose exec db pg_dump -U postgres face_liveness > backup-$(date +%Y%m%d).sql

# Clean old logs
docker-compose exec web python manage.py clean_expired_data
```

### Performance

```bash
# View resource usage
docker stats

# Check disk usage
docker system df

# Prune unused images
docker image prune

# Prune unused containers
docker container prune

# Prune all unused resources
docker system prune -a
```

## Troubleshooting

### Service won't start

```bash
# Check logs
docker-compose logs web

# Common issues:
# 1. Port already in use
docker-compose down
docker-compose up -d

# 2. Database connection failed
docker-compose logs db

# 3. Out of memory
# Increase Docker resources or limit container memory
```

### Database connection errors

```bash
# Check database service
docker-compose logs db

# Check connection
docker-compose exec web python manage.py dbshell

# Reset database
docker-compose down -v
docker-compose up -d
```

### Static files not loading

```bash
# Collect static files
docker-compose exec web python manage.py collectstatic --noinput

# Check volume mount
docker-compose exec web ls -la /app/static/

# Restart Nginx
docker-compose restart nginx
```

### High CPU/Memory usage

```bash
# Check resource usage
docker stats

# View logs for errors
docker-compose logs -f web

# Restart service
docker-compose restart web

# Scale if running Kubernetes
# (future enhancement)
```

### Dockerfile Build Fails

```bash
# Clean build cache
docker system prune -a

# Rebuild without cache
docker build --no-cache -t face-liveness:latest .

# Check Dockerfile syntax
docker run --rm -i hadolint/hadolint < Dockerfile
```

## Advanced Configuration

### Custom Network

```bash
# Create custom network
docker network create face_liveness_net

# Use in docker-compose
docker-compose --network face_liveness_net up -d
```

### Volume Management

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect face_liveness_capture_postgres_data

# Backup volume
docker run --rm -v volume_name:/data -v $(pwd):/backup \
  alpine tar czf /backup/volume_backup.tar.gz -C /data .

# Restore volume
docker run --rm -v volume_name:/data -v $(pwd):/backup \
  alpine tar xzf /backup/volume_backup.tar.gz -C /data
```

### Multi-Host Deployment

For multiple servers, use Docker Swarm or Kubernetes:

```bash
# Initialize Swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml face_liveness
```

## Security Best Practices

1. **Change default passwords** in `.env`
2. **Use strong SECRET_KEY** in production
3. **Enable SSL/TLS** on Nginx
4. **Set DEBUG=False** in production
5. **Use environment variables** for secrets
6. **Regular backups** of database and media
7. **Keep Docker images updated**
8. **Use read-only filesystems** where possible

## Monitoring and Logging

### View Logs

```bash
# Real-time logs
docker-compose logs -f web

# Structured logging
docker-compose logs --no-color > logs.txt
```

### Health Monitoring

```bash
# Check service health
curl http://localhost:8000/health/

# Prometheus metrics (if configured)
curl http://localhost:8000/metrics/
```

## Cleanup

### Remove Containers

```bash
docker-compose down
```

### Remove Volumes

```bash
docker-compose down -v
```

### Remove Images

```bash
docker rmi face-liveness:latest
```

### Complete Cleanup

```bash
# WARNING: This removes everything
docker-compose down -v
docker system prune -a
```

---

**For more information:**
- Docker Docs: https://docs.docker.com
- Docker Compose: https://docs.docker.com/compose
- Django Deployment: `docs/DEPLOYMENT.md`
- Testing: `docs/TESTING.md`
