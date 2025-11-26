# Deployment Guide

Guide to deploying `face_liveness_capture` in production environments.

## Table of Contents
- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Production Settings](#production-settings)
- [Security Considerations](#security-considerations)
- [Docker Deployment](#docker-deployment)
- [Heroku Deployment](#heroku-deployment)
- [AWS Deployment](#aws-deployment)
- [Nginx Configuration](#nginx-configuration)
- [Performance Tuning](#performance-tuning)
- [Monitoring](#monitoring)

## Pre-Deployment Checklist

- [ ] All dependencies installed (`pip install -r requirements.txt`)
- [ ] `DEBUG = False` in `settings.py`
- [ ] `SECRET_KEY` set to random value (not in version control)
- [ ] `ALLOWED_HOSTS` configured for your domain
- [ ] Database migrations applied (`python manage.py migrate`)
- [ ] Static files collected (`python manage.py collectstatic --noinput`)
- [ ] HTTPS/SSL certificate installed
- [ ] CSRF, CORS, security headers configured
- [ ] Media/captured faces folder has proper permissions
- [ ] Logging configured and monitored
- [ ] Backups scheduled

## Production Settings

### Django Settings (`settings.py`)

```python
import os
from pathlib import Path

# Security
DEBUG = False
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')  # Use environment variable
ALLOWED_HOSTS = ['example.com', 'www.example.com']
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_SECURITY_POLICY = {
    'default-src': ("'self'",),
    'script-src': ("'self'", "cdn.jsdelivr.net"),
    'style-src': ("'self'", "'unsafe-inline'"),
}

# Database (use environment variables)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

# Static Files
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_DIRS = [os.path.join(BASE_DIR, 'static')]
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.ManifestStaticFilesStorage'

# Media (Captured Faces)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
CAPTURED_FACES_DIR = os.path.join(MEDIA_ROOT, 'captured_faces')

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'django.log'),
            'maxBytes': 1024 * 1024 * 15,  # 15MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': True,
        },
        'face_liveness_capture': {
            'handlers': ['file'],
            'level': 'INFO',
        },
    },
}

# CSRF and CORS
CSRF_TRUSTED_ORIGINS = ['https://example.com']
CORS_ALLOWED_ORIGINS = ['https://example.com']
```

## Security Considerations

### 1. Input Validation

Always validate image data on server-side:

```python
# views.py
from django.views.decorators.csrf import csrf_protect
from django.http import JsonResponse
import json

@csrf_protect
def upload_face(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=400)
    
    try:
        data = json.loads(request.body)
        image_data = data.get('image')
        
        if not image_data:
            return JsonResponse({'error': 'No image'}, status=400)
        
        # Validate base64 format
        if not image_data.startswith('data:image/'):
            return JsonResponse({'error': 'Invalid format'}, status=400)
        
        # Process image...
    except Exception as e:
        logger.exception("Upload error")
        return JsonResponse({'error': 'Processing failed'}, status=500)
```

### 2. Rate Limiting

Use Django Ratelimit or similar:

```bash
pip install django-ratelimit
```

```python
from django_ratelimit.decorators import ratelimit

@ratelimit(key='user', rate='5/h', method='POST')
def upload_face(request):
    # Only 5 uploads per hour per user
    pass
```

### 3. File Storage Security

Store captured faces in a private directory:

```python
import os

# Ensure directory is not web-accessible
CAPTURED_FACES_DIR = os.path.join(BASE_DIR, 'private', 'captured_faces')
os.makedirs(CAPTURED_FACES_DIR, exist_ok=True)
os.chmod(CAPTURED_FACES_DIR, 0o700)  # Read/write/execute only by owner
```

### 4. HTTPS & SSL

Use Let's Encrypt for free SSL:

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d example.com
```

Configure in Nginx (see [Nginx Configuration](#nginx-configuration) below).

## Docker Deployment

### Dockerfile

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    postgresql-client \
    libopencv-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy project
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput

# Run gunicorn
CMD ["gunicorn", "test_project.wsgi:application", "--bind", "0.0.0.0:8000"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  db:
    image: postgres:14
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  web:
    build: .
    command: gunicorn test_project.wsgi:application --bind 0.0.0.0:8000
    environment:
      DEBUG: 'False'
      DJANGO_SECRET_KEY: ${DJANGO_SECRET_KEY}
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_HOST: db
    ports:
      - "8000:8000"
    depends_on:
      - db
    volumes:
      - ./media:/app/media

volumes:
  postgres_data:
```

### Deploy

```bash
# Build and run
docker-compose up -d

# Run migrations
docker-compose exec web python manage.py migrate

# Create superuser
docker-compose exec web python manage.py createsuperuser
```

## Heroku Deployment

### 1. Install Heroku CLI

```bash
# macOS
brew install heroku/brew/heroku

# Ubuntu
curl https://cli-assets.heroku.com/install.sh | sh
```

### 2. Create `Procfile`

```
web: gunicorn test_project.wsgi:application --log-file -
```

### 3. Create `runtime.txt`

```
python-3.10.8
```

### 4. Create `requirements.txt`

```bash
pip freeze > requirements.txt
```

### 5. Deploy

```bash
# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set DEBUG=False
heroku config:set DJANGO_SECRET_KEY=$(python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')
heroku config:set ALLOWED_HOSTS=your-app-name.herokuapp.com

# Push code
git push heroku main

# Run migrations
heroku run python manage.py migrate

# Create superuser
heroku run python manage.py createsuperuser
```

## AWS Deployment

### Using Elastic Beanstalk

```bash
# Install EB CLI
pip install awsebcli

# Initialize EB
eb init -p python-3.10 face_liveness_capture

# Create environment
eb create production

# Deploy
git push
eb deploy

# Open application
eb open
```

### Using EC2

```bash
# SSH into EC2 instance
ssh -i key.pem ec2-user@your-instance.amazonaws.com

# Install dependencies
sudo yum update
sudo yum install python3-pip python3-devel postgresql-devel
sudo yum install gcc libopencv-devel

# Clone repository
git clone https://github.com/alok-kumar8765/face_liveness_capture.git
cd face_liveness_capture

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install package
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

# Run with gunicorn
gunicorn test_project.wsgi:application --bind 0.0.0.0:8000
```

## Nginx Configuration

### Basic Nginx Config

```nginx
upstream django {
    server web:8000;
}

server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com www.example.com;

    # SSL certificates from Let's Encrypt
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    client_max_body_size 10M;

    location /static/ {
        alias /app/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /media/ {
        alias /app/media/;
        expires 7d;
    }

    location / {
        proxy_pass http://django;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }
}
```

## Performance Tuning

### 1. Database Connection Pooling

Use PgBouncer or Django connection pooling:

```bash
pip install psycopg2-binary
```

### 2. Caching

Enable Django caching:

```python
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
    }
}
```

### 3. Asynchronous Tasks

Use Celery for background jobs:

```bash
pip install celery redis
```

### 4. Image Optimization

The widget already compresses to ~50 KB. For further optimization:

```python
# settings.py
PASSPORT_PX_WIDTH = 280  # Reduce size further
PASSPORT_PX_HEIGHT = 360
```

## Monitoring

### Application Performance

Use tools like:
- **New Relic**: `pip install newrelic`
- **Datadog**: `pip install datadog`
- **Sentry**: `pip install sentry-sdk`

```python
# settings.py
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

sentry_sdk.init(
    dsn=os.environ.get('SENTRY_DSN'),
    integrations=[DjangoIntegration()],
    traces_sample_rate=0.1,
    send_default_pii=False,
)
```

### Logging

View logs in production:

```bash
# Docker
docker-compose logs -f web

# Heroku
heroku logs --tail

# AWS EB
eb logs
```

### Health Checks

Add a health check endpoint:

```python
# urls.py
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({'status': 'ok'})

urlpatterns = [
    path('health/', health_check),
]
```

Monitor uptime with services like:
- Pingdom
- UptimeRobot
- New Relic

## Backups

### Database Backups

```bash
# PostgreSQL backup
pg_dump -U user -h host dbname > backup.sql

# Restore
psql -U user -h host dbname < backup.sql
```

### Media Files Backups

```bash
# Backup captured faces
tar -czf captured_faces_backup.tar.gz /path/to/media/captured_faces/

# Upload to S3
aws s3 cp captured_faces_backup.tar.gz s3://your-bucket/backups/
```

### Automated Backups

Set up cron job:

```bash
0 2 * * * /path/to/backup.sh  # Daily at 2 AM
```

`backup.sh`:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U $DB_USER -h $DB_HOST $DB_NAME | gzip > /backups/db_$DATE.sql.gz
aws s3 cp /backups/db_$DATE.sql.gz s3://your-bucket/backups/
```

## Support & Troubleshooting

See [FAQ.md](FAQ.md) for common issues and solutions.
