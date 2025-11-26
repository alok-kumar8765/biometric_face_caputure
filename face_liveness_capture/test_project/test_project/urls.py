"""
URL configuration for test_project project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
import sys
import os

# Add parent directory to path to import views
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from views import index, submit_form

urlpatterns = [
    path('', index, name='index'),
    path('submit-form/', submit_form, name='submit_form'),
    path('admin/', admin.site.urls),
    path('face-capture/', include('face_liveness_capture.django_integration.urls')),

]


