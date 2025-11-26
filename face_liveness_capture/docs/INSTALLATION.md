# Installation Guide

This guide covers all methods to install `face_liveness_capture` in your project.

## Table of Contents
- [PyPI Installation](#pypi-installation)
- [GitHub Installation](#github-installation)
- [Local Development Installation](#local-development-installation)
- [Docker Setup](#docker-setup)
- [Troubleshooting](#troubleshooting)

## PyPI Installation

### Stable Release (Recommended)

Once the package is published to PyPI, install via pip:

```bash
pip install face_liveness_capture
```

### Specific Version

```bash
pip install face_liveness_capture==0.1.0
```

### Upgrade Existing Installation

```bash
pip install --upgrade face_liveness_capture
```

## GitHub Installation

### Install Latest Development Version

Install directly from the GitHub repository:

```bash
pip install git+https://github.com/alok-kumar8765/face_liveness_capture.git
```

### Install from a Specific Branch

```bash
pip install git+https://github.com/alok-kumar8765/face_liveness_capture.git@branch-name
```

### Install from a Release Tag

```bash
pip install git+https://github.com/alok-kumar8765/face_liveness_capture.git@v0.1.0
```

### Clone and Install Locally

```bash
git clone https://github.com/alok-kumar8765/face_liveness_capture.git
cd face_liveness_capture
pip install -e .
```

The `-e` flag installs the package in editable mode (development mode), meaning changes to the source code are immediately reflected without reinstalling.

## Local Development Installation

Perfect for contributing or testing locally:

```bash
# Clone repository
git clone https://github.com/alok-kumar8765/face_liveness_capture.git
cd face_liveness_capture

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate          # On Windows: venv\Scripts\activate

# Install package in editable mode with dev dependencies
pip install -e ".[dev]"

# Run demo
python test_project/manage.py migrate
python test_project/manage.py runserver
```

Then visit `http://127.0.0.1:8000` to see the demo.

## Docker Setup

### Build Docker Image

Create a `Dockerfile` in your project root:

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libopencv-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy project
COPY . .

# Install Python package
RUN pip install --no-cache-dir -e .

# Run Django test project
CMD ["python", "test_project/manage.py", "runserver", "0.0.0.0:8000"]
```

### Run Docker Container

```bash
docker build -t face_liveness_capture .
docker run -p 8000:8000 face_liveness_capture
```

## Troubleshooting

### Issue: `ModuleNotFoundError: No module named 'mediapipe'`

**Solution:** Ensure all dependencies are installed:

```bash
pip install -r requirements.txt
```

Or reinstall the package:

```bash
pip install --force-reinstall face_liveness_capture
```

### Issue: OpenCV Import Error

**Solution:** Install OpenCV system dependencies:

```bash
# Ubuntu/Debian
sudo apt-get install python3-opencv libopencv-dev

# macOS
brew install opencv

# Windows
# Usually works out of the box; if not, reinstall: pip install --force-reinstall opencv-python
```

### Issue: Django App Not Found

**Solution:** Ensure package is added to `INSTALLED_APPS` in `settings.py`:

```python
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'face_liveness_capture.django_integration',  # Add this
    # ... other apps
]
```

### Issue: Static Files Not Loading

**Solution:** Collect static files:

```bash
python manage.py collectstatic --noinput
```

And add to `settings.py`:

```python
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'node_modules'),  # if using npm
    os.path.join(BASE_DIR, 'static'),
]
```

### Issue: Permission Denied When Installing

**Solution:** Use virtual environment or `--user` flag:

```bash
pip install --user face_liveness_capture
```

## Virtual Environment Setup (Recommended)

### Using venv (Python 3.3+)

```bash
# Create environment
python -m venv venv

# Activate environment
# On Unix/macOS:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install package
pip install face_liveness_capture

# Deactivate when done
deactivate
```

### Using conda

```bash
# Create environment
conda create -n face_liveness python=3.10

# Activate environment
conda activate face_liveness

# Install package
pip install face_liveness_capture
```

## Verify Installation

```bash
python -c "import face_liveness_capture; print('Installation successful!')"
```

Or in Django shell:

```bash
python manage.py shell
>>> from face_liveness_capture.backend.detection import verify_liveness
>>> print("Package loaded successfully!")
```

## Next Steps

After installation, check out:
- [USAGE.md](USAGE.md) — how to integrate in your Django project
- [docs/API.md](API.md) — API reference and configuration
- [docs/DEPLOYMENT.md](DEPLOYMENT.md) — production deployment guide
