"""
Tests initialization for face_liveness_capture package
"""

import os
import django
from django.conf import settings

# Configure Django settings for tests if not already configured
if not settings.configured:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'test_project.settings')
    django.setup()
