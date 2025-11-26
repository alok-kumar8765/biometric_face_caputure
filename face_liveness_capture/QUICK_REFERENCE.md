# Quick Reference Guide

## 🐳 Docker Commands

```bash
# Start everything
docker-compose up -d

# View running services
docker-compose ps

# View logs
docker-compose logs -f web

# Stop everything
docker-compose down

# Remove everything (including data)
docker-compose down -v

# Run tests in container
docker-compose exec web pytest tests/ -v

# Access Django shell
docker-compose exec web python manage.py shell

# Run migrations
docker-compose exec web python manage.py migrate

# Create superuser
docker-compose exec web python manage.py createsuperuser

# Bash access
docker-compose exec web bash

# Production setup
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 🧪 Test Commands

```bash
# Run all tests
pytest tests/

# Run with coverage
pytest tests/ --cov=face_liveness_capture --cov-report=html

# Run specific test file
pytest tests/test_api.py -v

# Run specific test
pytest tests/test_api.py::TestRESTAPIEndpoints::test_api_documentation_endpoint

# Run in parallel
pytest tests/ -n auto

# Run with output
pytest tests/ -s -v

# Run with timeout
pytest tests/ --timeout=300

# Show slowest tests
pytest tests/ --durations=10
```

## 🔄 Git Workflow

```bash
# Clone repo
git clone https://github.com/alok-kumar8765/face_liveness_capture.git

# Create feature branch
git checkout -b feature/your-feature

# Make changes and stage
git add .

# Commit
git commit -m "feat: description"

# Push to GitHub
git push origin feature/your-feature

# Create Pull Request on GitHub

# After merge, pull main
git checkout main
git pull origin main
```

## 📦 Setup Local Development

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Install package
pip install -e .

# Run migrations (if using local DB)
python manage.py migrate

# Run tests
pytest tests/ -v

# Start Django server
python manage.py runserver
```

## 🚀 Deployment Checklist

- [ ] Update `.env` with production values
- [ ] Run migrations: `docker-compose exec web python manage.py migrate`
- [ ] Collect static files: `docker-compose exec web python manage.py collectstatic --noinput`
- [ ] Check health: `curl http://localhost:8000/health/`
- [ ] View logs: `docker-compose logs -f web`
- [ ] Test API endpoints
- [ ] Verify database backups

## 📍 Important Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Container image build |
| `docker-compose.yml` | Development services |
| `docker-compose.prod.yml` | Production overrides |
| `docker-entrypoint.sh` | Container startup script |
| `nginx.conf` | Reverse proxy config |
| `.gitignore` | Git ignore rules |
| `.github/workflows/tests.yml` | CI test workflow |
| `.github/workflows/docker-build.yml` | Docker build workflow |
| `pytest.ini` | Pytest configuration |
| `requirements.txt` | Python dependencies |
| `requirements-dev.txt` | Dev/test dependencies |

## 📚 Documentation

| Doc | What | Where |
|-----|------|-------|
| Installation | Setup guide | `docs/INSTALLATION.md` |
| Usage | Integration guide | `docs/USAGE.md` |
| API | API reference | `docs/API.md` |
| Deployment | Prod deployment | `docs/DEPLOYMENT.md` |
| FAQ | Q&A | `docs/FAQ.md` |
| Testing | Test guide | `docs/TESTING.md` |
| Docker | Docker guide | `docs/DOCKER.md` |

## 🔍 Troubleshooting

### Docker Issues
```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs web

# Restart service
docker-compose restart web

# Clean rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Test Failures
```bash
# Run with verbose output
pytest tests/ -v -s

# Run single test
pytest tests/test_api.py::TestRESTAPIEndpoints -v

# Check coverage gaps
pytest tests/ --cov=face_liveness_capture --cov-report=term-missing
```

### Database Issues
```bash
# Check database
docker-compose exec db psql -U postgres -d face_liveness

# Reset database
docker-compose down -v
docker-compose up -d
docker-compose exec web python manage.py migrate
```

## 🔐 Security Checklist

- [ ] Change `SECRET_KEY` in production
- [ ] Set `DEBUG=False` in production
- [ ] Use strong database password
- [ ] Enable SSL/TLS on Nginx
- [ ] Set `ALLOWED_HOSTS` correctly
- [ ] Keep dependencies updated
- [ ] Enable CSRF protection
- [ ] Configure CORS properly

## ✅ Pre-Push Checklist

```bash
# 1. Run linting
black face_liveness_capture tests
isort face_liveness_capture tests
flake8 face_liveness_capture tests

# 2. Run tests
pytest tests/ -v

# 3. Check coverage
pytest tests/ --cov=face_liveness_capture

# 4. Git status
git status

# 5. Commit
git add .
git commit -m "descriptive message"

# 6. Push
git push origin feature-branch
```

## 📊 Expected Test Results

- **Total Tests:** 100+
- **Coverage:** 77%+
- **Duration:** ~30-60 seconds (parallel)
- **CI/CD:** 8 matrix combinations (Python 3.8-3.11, Django 4.2-5.0)

## 🌐 Access Points

| Service | URL | Status |
|---------|-----|--------|
| Django App | `http://localhost:8000` | Check `/health/` |
| Nginx | `http://localhost:80` | Reverse proxy |
| PostgreSQL | `localhost:5432` | DB access |
| Redis | `localhost:6379` | Cache |
| Admin Panel | `http://localhost:8000/admin/` | Django admin |

## 🌐 Multi-Language Integration (NEW!)

The API now supports integration from **any programming language** like Twilio or SendGrid.

### REST API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/face-capture/` | Upload face image |
| POST | `/api/verify-liveness/` | Verify face is live |
| GET | `/api/health/` | Check API status |

### Quick Examples

**Python:**
```python
import requests
r = requests.post('http://localhost:8000/api/face-capture/',
    headers={'Authorization': 'Bearer token'},
    files={'image': open('face.jpg', 'rb'), 'user_id': 'user123'})
face_id = r.json()['data']['id']
```

**Node.js:**
```javascript
const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: { 'Authorization': 'Bearer token' }
});
const r = await api.post('/face-capture/', form);
const faceId = r.data.data.id;
```

**PHP:**
```php
$ch = curl_init('http://localhost:8000/api/face-capture/');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => ['image' => new CURLFile('face.jpg')],
    CURLOPT_HTTPHEADER => ["Authorization: Bearer token"]
]);
$response = json_decode(curl_exec($ch), true);
```

### Supported Languages
- Python (Django/FastAPI/Flask)
- Node.js (Express/NestJS)
- PHP (Laravel/Symfony)
- Go (Gin/Echo)
- Ruby (Rails/Sinatra)
- Java (Spring Boot)
- cURL (command-line)

👉 **See:** `docs/REST_API_GUIDE.md` (7 full examples)  
👉 **See:** `docs/PLATFORM_INTEGRATION.md` (6 framework guides)

## 🔑 Default Credentials (Dev Only)

**Admin User (auto-created):**
- Username: `admin`
- Password: `admin123`
- Access: `http://localhost:8000/admin/`

⚠️ **Change these in production!**

## 📞 Getting Help

1. **API Integration?** See `docs/REST_API_GUIDE.md`
2. **Framework specific?** See `docs/PLATFORM_INTEGRATION.md`
3. **Deployment?** See `docs/DEPLOYMENT.md`
4. **Questions?** See `docs/FAQ.md`
5. **GitHub Issues:** Create issue with error logs
6. **Email:** alokkaushal42@gmail.com

---

**Last Updated:** December 2024 - Multi-Language Support Added
