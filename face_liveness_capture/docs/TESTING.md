# Testing Guide

## Overview

This guide explains how to run tests for the `face_liveness_capture` project, both locally and in CI/CD pipelines.

## Table of Contents

- [Local Testing](#local-testing)
- [GitHub Actions CI/CD](#github-actions-cicd)
- [Coverage Reports](#coverage-reports)
- [Test Categories](#test-categories)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Local Testing

### Prerequisites

Install development dependencies:

```bash
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

### Running All Tests

```bash
pytest tests/
```

### Running Specific Test File

```bash
pytest tests/test_detection.py
pytest tests/test_validation.py
pytest tests/test_api.py
pytest tests/test_django_integration.py
pytest tests/test_docker_deployment.py
```

### Running Specific Test

```bash
pytest tests/test_detection.py::TestFaceDetector::test_face_detector_initialization
```

### Running with Verbose Output

```bash
pytest tests/ -v
```

### Running with Output and Print Statements

```bash
pytest tests/ -v -s
```

### Running Tests in Parallel

```bash
pytest tests/ -n auto
```

This speeds up test execution by running multiple tests simultaneously.

## Coverage Reports

### Generate Coverage Report

```bash
pytest tests/ --cov=face_liveness_capture --cov-report=html --cov-report=term
```

This generates:
- Terminal report with coverage percentage
- `htmlcov/index.html` - Interactive HTML coverage report

### View HTML Coverage Report

```bash
# On Linux/Mac
open htmlcov/index.html

# On Windows
start htmlcov/index.html
```

### Coverage Requirements

- **Overall:** Minimum 70% coverage required for CI to pass
- **Critical modules:** 85% minimum
  - `backend/detection.py`
  - `backend/validation.py`
  - `django_integration/views.py`

### Coverage by Module

```bash
pytest tests/ --cov=face_liveness_capture --cov-report=term-missing
```

Shows which lines are not covered by tests.

## Test Categories

### Unit Tests

Test individual functions and classes in isolation.

```bash
pytest tests/ -m "not integration"
```

**Files:**
- `test_detection.py` - Face detection module
- `test_validation.py` - Liveness validation
- `test_api.py` - REST API endpoints

### Integration Tests

Test interaction between multiple components.

```bash
pytest tests/ -m integration
```

**Files:**
- `test_django_integration.py` - Django views and serializers
- `test_docker_deployment.py` - Docker configuration

### Security Tests

Test security aspects like authentication, input validation.

```bash
pytest tests/ -m security
```

### Docker Tests

Test Docker configuration and deployment.

```bash
pytest tests/test_docker_deployment.py -v
```

## GitHub Actions CI/CD

### Automated Test Runs

Tests automatically run on:

1. **Push to main/develop branches**
2. **Pull Requests** targeting main or develop
3. **Tag creation** (release)

### Test Matrix

Tests run on multiple Python and Django versions:

- Python: 3.8, 3.9, 3.10, 3.11
- Django: 4.2, 5.0

Total combinations: 8 test runs per commit

### CI Workflow Steps

1. **Checkout Code** - Fetch repository
2. **Setup Python** - Install Python version
3. **Install Dependencies** - Install requirements
4. **Lint Checks** - Code style validation (flake8, black)
5. **Run Tests** - Execute test suite with coverage
6. **Upload Coverage** - Send to Codecov
7. **Code Quality** - pylint, isort checks
8. **Security Scan** - bandit, safety checks

### Monitoring CI Status

1. Go to GitHub repository → **Actions** tab
2. Select workflow: **Tests** or **Build and Push Docker Image**
3. View status and logs

### Checking CI Results

- ✅ **All Checks Passed** - Safe to merge
- ❌ **Some Checks Failed** - Fix issues before merge
- ⏳ **In Progress** - Wait for completion

## Docker Testing

### Build Docker Image Locally

```bash
docker build -t face-liveness:latest .
```

### Test Docker Container

```bash
# Start all services
docker-compose up -d

# Run migrations
docker-compose exec web python manage.py migrate

# Run tests in container
docker-compose exec web pytest tests/

# Check service health
docker-compose ps

# View logs
docker-compose logs web

# Stop all services
docker-compose down
```

### Debug Docker Container

```bash
# Access container shell
docker-compose exec web bash

# Run Django shell
docker-compose exec web python manage.py shell

# Check database connection
docker-compose exec web python manage.py dbshell
```

## Test File Overview

### test_detection.py

**Purpose:** Test face detection module

**Key Tests:**
- `TestFaceDetector.test_face_detector_initialization()` - Detector setup
- `TestFaceDetector.test_detect_face_returns_landmarks()` - Landmark detection
- `TestLandmarkProcessing.test_landmark_extraction_from_mediapipe()` - MediaPipe integration

**Coverage:** 75%+

### test_validation.py

**Purpose:** Test liveness validation module

**Key Tests:**
- `TestEyeAspectRatio.test_calculate_eye_aspect_ratio()` - EAR calculation
- `TestFaceLivenessValidation.test_blink_detection()` - Blink detection
- `TestFaceLivenessValidation.test_head_turn_detection()` - Turn detection

**Coverage:** 80%+

### test_api.py

**Purpose:** Test REST API endpoints

**Key Tests:**
- `TestRESTAPIEndpoints.test_face_detection_endpoint()` - Detection API
- `TestRESTAPIEndpoints.test_liveness_verification_endpoint()` - Verification API
- `TestRESTAPISecurity.*` - Security tests

**Coverage:** 70%+

### test_django_integration.py

**Purpose:** Test Django integration

**Key Tests:**
- `TestDjangoIntegration.test_django_app_installed()` - App configuration
- `TestFaceCaptureViews.test_upload_face_image()` - Image upload
- `TestSerializers.test_face_capture_serializer()` - Serializers

**Coverage:** 75%+

### test_docker_deployment.py

**Purpose:** Test Docker configuration

**Key Tests:**
- `TestDockerBuild.test_dockerfile_syntax()` - Dockerfile validation
- `TestDockerCompose.test_docker_compose_syntax()` - docker-compose validation
- `TestProductionReadiness.*` - Production setup

**Coverage:** 85%+

## Troubleshooting

### Common Issues

**Issue: Tests fail with "module not found"**

```bash
# Solution: Install package in editable mode
pip install -e .
```

**Issue: Database errors during tests**

```bash
# Solution: Ensure test database is accessible
export DATABASE_URL=postgresql://user:pass@localhost/test_db
pytest tests/
```

**Issue: MediaPipe not found**

```bash
# Solution: Install MediaPipe
pip install mediapipe
```

**Issue: OpenCV errors**

```bash
# Solution: Install system dependencies
# Ubuntu/Debian
sudo apt-get install libsm6 libxext6 libxrender-dev

# macOS
brew install opencv
```

**Issue: Tests timeout**

```bash
# Solution: Increase timeout
pytest tests/ --timeout=300
```

### Debug Mode

Run tests with detailed output:

```bash
pytest tests/ -v -s --tb=long --capture=no
```

### Performance Profiling

Identify slow tests:

```bash
pytest tests/ --durations=10
```

Shows 10 slowest tests.

## Best Practices

### Writing Tests

1. **Use descriptive names:** `test_blink_detection_with_valid_landmarks()`
2. **One assertion per test:** Easier to debug failures
3. **Use fixtures:** Reuse common setup
4. **Mock external calls:** Use `@patch` decorator
5. **Test edge cases:** Empty input, invalid data, etc.

### Example Test

```python
import pytest
from unittest.mock import patch

@pytest.mark.django_db
def test_face_capture_success(api_client, sample_image):
    """Test successful face capture"""
    with patch('face_liveness_capture.backend.validation.validate_face_liveness') as mock_val:
        mock_val.return_value = {'is_live': True, 'confidence': 0.95}
        
        response = api_client.post('/api/capture/', 
                                   {'image': sample_image},
                                   format='multipart')
        
        assert response.status_code == 201
        assert response.data['success'] == True
```

### Test Organization

```
tests/
├── __init__.py
├── conftest.py              # Fixtures and configuration
├── test_detection.py        # Unit tests for detection
├── test_validation.py       # Unit tests for validation
├── test_api.py              # API endpoint tests
├── test_django_integration.py  # Django tests
└── test_docker_deployment.py   # Docker/deployment tests
```

### Pre-commit Checks

Run before pushing:

```bash
# Format code
black face_liveness_capture tests

# Sort imports
isort face_liveness_capture tests

# Lint
flake8 face_liveness_capture tests

# Run tests
pytest tests/ --cov=face_liveness_capture
```

## Continuous Integration Requirements

For CI to pass:

✅ All tests pass
✅ Coverage >= 70%
✅ No linting errors
✅ No security vulnerabilities
✅ Docker builds successfully

## Integration with CI/CD

### GitHub Actions Triggers

Tests run automatically on:

```
On: [push, pull_request]
Branches: [main, develop]
```

### Required Checks

Before merge:

```
- Tests (all matrix combinations)
- Docker Build
- Code Quality
- Security Scan
```

## Performance Benchmarking

Run performance benchmarks:

```bash
pytest tests/ --benchmark-only
```

Compare results between runs:

```bash
pytest tests/ --benchmark-compare
```

## Documentation

- **Full API Reference:** See `docs/API.md`
- **Deployment Guide:** See `docs/DEPLOYMENT.md`
- **Installation Guide:** See `docs/INSTALLATION.md`
- **Usage Guide:** See `docs/USAGE.md`

## Support

For test-related issues:

1. Check this guide for solutions
2. Review GitHub Actions logs for CI failures
3. Run tests locally with verbose output
4. Check `htmlcov/` for coverage gaps
5. Open issue on GitHub with test logs

---

**Last Updated:** December 2024
**Test Framework:** pytest
**Coverage Tool:** pytest-cov
**CI/CD:** GitHub Actions
