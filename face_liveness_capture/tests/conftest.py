"""
Pytest configuration and fixtures
"""

import os
import pytest
import django
from django.conf import settings
from django.test.utils import get_runner
from io import BytesIO
from PIL import Image
import numpy as np

# Configure Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'test_project.settings')
django.setup()


@pytest.fixture(scope='session')
def django_db_setup():
    """Setup test database"""
    from django.core.management import call_command
    call_command('migrate', verbosity=0, interactive=False)


@pytest.fixture
def sample_image():
    """Create a sample image for testing"""
    img = Image.new('RGB', (640, 480), color='red')
    img_bytes = BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes.seek(0)
    return img_bytes.getvalue()


@pytest.fixture
def sample_face_image():
    """Create a sample image with face-like pattern for testing"""
    img_array = np.ones((480, 640, 3), dtype=np.uint8) * 255
    
    # Draw a simple face-like pattern
    # Face oval
    center_y, center_x = 240, 320
    radius = 100
    for y in range(center_y - radius, center_y + radius):
        for x in range(center_x - radius, center_x + radius):
            if (x - center_x) ** 2 + (y - center_y) ** 2 <= radius ** 2:
                img_array[y, x] = [210, 180, 140]  # Skin tone
    
    img = Image.fromarray(img_array)
    img_bytes = BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes.seek(0)
    return img_bytes.getvalue()


@pytest.fixture
def sample_landmarks():
    """Create sample MediaPipe landmarks"""
    # 468 landmarks as per MediaPipe FaceMesh
    landmarks = []
    for i in range(468):
        landmarks.append({
            'x': np.random.random(),
            'y': np.random.random(),
            'z': np.random.random() * 0.1,
            'visibility': 0.9 if i < 400 else 0.5
        })
    return landmarks


@pytest.fixture
def django_client():
    """Provide Django test client"""
    from django.test import Client
    return Client()


@pytest.fixture
def authenticated_user():
    """Create authenticated test user"""
    from django.contrib.auth.models import User
    user, _ = User.objects.get_or_create(
        username='testuser',
        defaults={'email': 'test@example.com'}
    )
    user.set_password('testpass123')
    user.save()
    return user


@pytest.fixture
def api_client():
    """Provide API test client with authentication"""
    from rest_framework.test import APIClient
    from django.contrib.auth.models import User
    
    client = APIClient()
    user = User.objects.create_user(
        username='apitest',
        email='apitest@example.com',
        password='apipass123'
    )
    client.force_authenticate(user=user)
    return client
