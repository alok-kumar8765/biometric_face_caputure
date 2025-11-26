# django_integration/urls.py
from django.urls import path
from face_liveness_capture.django_integration.views import upload_face
from face_liveness_capture.django_integration.views import widget_view

urlpatterns = [
    path('', widget_view, name='widget'),
    path('upload/', upload_face, name='upload-face'),
]

