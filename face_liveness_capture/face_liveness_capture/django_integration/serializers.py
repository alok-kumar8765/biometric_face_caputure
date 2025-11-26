"""
Django REST Framework serializers for face liveness capture
"""

from rest_framework import serializers
import base64
from django.core.files.base import ContentFile
from PIL import Image
from io import BytesIO


class FaceCaptureSerializer(serializers.Serializer):
    """
    Serializer for face capture requests
    
    Accepts:
    - image: Base64 encoded image or file upload
    - landmarks: JSON array of MediaPipe landmarks
    - metadata: Optional metadata (user_id, session_id, etc.)
    """
    
    image = serializers.ImageField(
        required=True,
        help_text="Face image as file upload or base64 encoded"
    )
    landmarks = serializers.JSONField(
        required=False,
        default=None,
        help_text="MediaPipe face landmarks (468 points)"
    )
    user_id = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Optional user identifier"
    )
    session_id = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Optional session identifier"
    )
    metadata = serializers.JSONField(
        required=False,
        default=dict,
        help_text="Additional metadata"
    )
    
    def validate_image(self, value):
        """Validate image file"""
        # Check file size (max 10MB)
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("Image too large. Max 10MB.")
        
        # Check file format
        allowed_formats = ['JPEG', 'PNG', 'WEBP']
        try:
            img = Image.open(value)
            if img.format not in allowed_formats:
                raise serializers.ValidationError(
                    f"Invalid format. Allowed: {', '.join(allowed_formats)}"
                )
            
            # Check minimum dimensions
            if img.width < 100 or img.height < 100:
                raise serializers.ValidationError(
                    "Image too small. Minimum 100x100 pixels."
                )
        except Exception as e:
            raise serializers.ValidationError(f"Invalid image: {str(e)}")
        
        return value
    
    def validate_landmarks(self, value):
        """Validate MediaPipe landmarks"""
        if value is None:
            return value
        
        if not isinstance(value, list):
            raise serializers.ValidationError("Landmarks must be a list")
        
        if len(value) != 468:
            raise serializers.ValidationError(
                "Landmarks must contain exactly 468 points"
            )
        
        return value


class LivenessVerificationSerializer(serializers.Serializer):
    """
    Serializer for liveness verification response
    
    Returns:
    - is_live: Boolean indicating if face is live
    - confidence: Confidence score (0-1)
    - details: Detailed detection results
    - timestamp: Server timestamp
    """
    
    is_live = serializers.BooleanField(
        help_text="Whether the face is detected as live"
    )
    confidence = serializers.FloatField(
        min_value=0.0,
        max_value=1.0,
        help_text="Confidence score (0-1)"
    )
    details = serializers.DictField(
        child=serializers.BooleanField(),
        help_text="Detailed checks (blink, turn_left, turn_right, etc.)"
    )
    timestamp = serializers.DateTimeField(
        help_text="Server timestamp of verification"
    )
    message = serializers.CharField(
        required=False,
        help_text="Optional message"
    )


class FaceDataSerializer(serializers.Serializer):
    """
    Serializer for captured face data
    
    Used for storing face data with metadata
    """
    
    image = serializers.ImageField()
    user_id = serializers.CharField(max_length=255, required=False)
    session_id = serializers.CharField(max_length=255, required=False)
    landmarks = serializers.JSONField(required=False)
    is_live = serializers.BooleanField(default=False)
    confidence = serializers.FloatField(default=0.0)
    metadata = serializers.JSONField(required=False)
    created_at = serializers.DateTimeField(read_only=True)


class BatchFaceVerificationSerializer(serializers.Serializer):
    """
    Serializer for batch face verification requests
    
    Allows verifying multiple faces in one request
    """
    
    images = serializers.ListField(
        child=serializers.ImageField(),
        help_text="List of face images"
    )
    user_ids = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        help_text="Optional user IDs corresponding to images"
    )
    
    def validate(self, data):
        """Validate batch data"""
        images = data.get('images', [])
        user_ids = data.get('user_ids', [])
        
        # If user_ids provided, must match image count
        if user_ids and len(user_ids) != len(images):
            raise serializers.ValidationError(
                "Number of user_ids must match number of images"
            )
        
        return data


class ErrorResponseSerializer(serializers.Serializer):
    """
    Serializer for error responses
    
    Standard error format across all endpoints
    """
    
    success = serializers.BooleanField(default=False)
    error = serializers.DictField()
    timestamp = serializers.DateTimeField()


class HealthCheckSerializer(serializers.Serializer):
    """
    Serializer for health check responses
    """
    
    status = serializers.CharField(
        choices=['healthy', 'degraded', 'unhealthy']
    )
    timestamp = serializers.DateTimeField()
    services = serializers.DictField(
        child=serializers.CharField(),
        help_text="Status of each service (db, cache, etc.)"
    )
    version = serializers.CharField()
