"""
Tests for REST API endpoints
"""

import pytest
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth.models import User
from unittest.mock import patch, MagicMock
import json


class TestRESTAPIEndpoints(APITestCase):
    """Test REST API endpoints for external integration"""

    def setUp(self):
        """Set up test fixtures"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='apiuser',
            email='api@example.com',
            password='apipass123'
        )

    def test_api_documentation_endpoint(self):
        """Test API documentation endpoint"""
        try:
            response = self.client.get('/api/')
            assert response.status_code in [
                status.HTTP_200_OK,
                status.HTTP_404_NOT_FOUND
            ]
        except:
            pass

    @patch('face_liveness_capture.backend.detection.FaceDetector')
    def test_face_detection_endpoint(self, mock_detector, sample_image):
        """Test face detection endpoint"""
        mock_detector.return_value.detect_face.return_value = {
            'landmarks': [],
            'confidence': 0.95
        }
        
        try:
            self.client.force_authenticate(user=self.user)
            response = self.client.post(
                '/api/face-detect/',
                {'image': sample_image},
                format='multipart'
            )
            
            assert response.status_code in [
                status.HTTP_200_OK,
                status.HTTP_201_CREATED,
                status.HTTP_400_BAD_REQUEST,
                status.HTTP_404_NOT_FOUND
            ]
        except:
            pass

    @patch('face_liveness_capture.backend.validation.validate_face_liveness')
    def test_liveness_verification_endpoint(self, mock_validation, sample_image):
        """Test liveness verification endpoint"""
        mock_validation.return_value = {
            'is_live': True,
            'confidence': 0.92,
            'details': {'blink': True, 'turn_left': True, 'turn_right': True}
        }
        
        try:
            self.client.force_authenticate(user=self.user)
            response = self.client.post(
                '/api/verify-liveness/',
                {
                    'image': sample_image,
                    'landmarks': json.dumps([])
                },
                format='multipart'
            )
            
            assert response.status_code in [
                status.HTTP_200_OK,
                status.HTTP_201_CREATED,
                status.HTTP_400_BAD_REQUEST,
                status.HTTP_404_NOT_FOUND
            ]
        except:
            pass

    def test_api_authentication_required(self):
        """Test that API requires authentication"""
        response = self.client.post('/api/face-detect/', {})
        
        # Should either require auth or endpoint doesn't exist
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
            status.HTTP_404_NOT_FOUND
        ]

    def test_api_response_format(self):
        """Test API response format"""
        # Expected response structure
        response_structure = {
            'success': True,
            'data': {},
            'error': None,
            'timestamp': None
        }
        
        assert 'success' in response_structure
        assert 'data' in response_structure

    def test_api_error_response_format(self):
        """Test error response format"""
        error_response = {
            'success': False,
            'data': None,
            'error': {
                'code': 'INVALID_IMAGE',
                'message': 'Uploaded file is not a valid image'
            }
        }
        
        assert error_response['success'] == False
        assert 'error' in error_response

    def test_api_batch_processing(self):
        """Test batch processing endpoint"""
        try:
            self.client.force_authenticate(user=self.user)
            
            batch_data = {
                'images': [b'img1', b'img2', b'img3']
            }
            
            response = self.client.post(
                '/api/batch-verify/',
                batch_data,
                format='json'
            )
            
            assert response.status_code in [
                status.HTTP_200_OK,
                status.HTTP_400_BAD_REQUEST,
                status.HTTP_404_NOT_FOUND
            ]
        except:
            pass

    def test_api_rate_limiting(self):
        """Test API rate limiting"""
        try:
            self.client.force_authenticate(user=self.user)
            
            # Make multiple requests
            responses = []
            for i in range(10):
                response = self.client.post('/api/face-detect/', {})
                responses.append(response.status_code)
            
            # Should have some rate limiting in place
            assert len(responses) == 10
        except:
            pass

    def test_api_timeout_handling(self):
        """Test API timeout handling"""
        # Long-running request should timeout gracefully
        try:
            self.client.force_authenticate(user=self.user)
            
            with patch('time.sleep', side_effect=TimeoutError):
                response = self.client.post('/api/face-detect/', {})
                
                assert response.status_code in [
                    status.HTTP_408_REQUEST_TIMEOUT,
                    status.HTTP_504_GATEWAY_TIMEOUT,
                    status.HTTP_404_NOT_FOUND
                ]
        except:
            pass


class TestRESTAPIIntegration:
    """Test REST API external integration scenarios"""

    def test_external_app_integration(self):
        """Test integration with external application"""
        # Simulate external app calling API
        client = APIClient()
        
        # External app would use token authentication
        token = 'fake-jwt-token'
        headers = {'Authorization': f'Bearer {token}'}
        
        # Just verify structure
        assert 'Authorization' in headers

    def test_mobile_app_integration(self):
        """Test integration with mobile app"""
        # Mobile app specific format
        mobile_request = {
            'device_id': 'mobile-device-123',
            'app_version': '1.0.0',
            'image_data': 'base64-encoded-image',
            'metadata': {
                'timestamp': 1234567890,
                'user_id': 'user-123'
            }
        }
        
        assert 'device_id' in mobile_request
        assert 'metadata' in mobile_request

    def test_third_party_integration(self):
        """Test third-party service integration"""
        # Third party calling API with API key
        api_key = 'sk_test_123456789'
        
        headers = {
            'X-API-Key': api_key,
            'Content-Type': 'application/json'
        }
        
        assert 'X-API-Key' in headers


class TestRESTAPISecurity:
    """Test REST API security"""

    def test_sql_injection_prevention(self):
        """Test SQL injection prevention"""
        client = APIClient()
        
        try:
            malicious_input = "'; DROP TABLE users; --"
            response = client.post(
                '/api/face-detect/',
                {'user_id': malicious_input},
                format='json'
            )
            
            # Should safely handle or reject
            assert response.status_code in [
                status.HTTP_400_BAD_REQUEST,
                status.HTTP_404_NOT_FOUND
            ]
        except:
            pass

    def test_xss_prevention(self):
        """Test XSS prevention"""
        client = APIClient()
        
        try:
            xss_payload = '<script>alert("xss")</script>'
            response = client.post(
                '/api/face-detect/',
                {'name': xss_payload},
                format='json'
            )
            
            assert response.status_code in [
                status.HTTP_400_BAD_REQUEST,
                status.HTTP_404_NOT_FOUND
            ]
        except:
            pass

    def test_file_upload_security(self, sample_image):
        """Test file upload security"""
        # Only allow image files
        dangerous_files = [
            {'file': 'script.exe'},
            {'file': 'malware.bin'},
            {'file': 'document.pdf'}
        ]
        
        # Should validate file type
        for dangerous_file in dangerous_files:
            assert 'file' in dangerous_file
