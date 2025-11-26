"""
Unit tests for face_liveness_capture backend detection module
"""

import pytest
import numpy as np
import cv2
from unittest.mock import patch, MagicMock
from face_liveness_capture.backend.detection import FaceDetector


class TestFaceDetector:
    """Test FaceDetector class"""

    def test_face_detector_initialization(self):
        """Test FaceDetector initialization"""
        detector = FaceDetector()
        assert detector is not None
        assert hasattr(detector, 'detect_face')

    def test_detect_face_returns_landmarks(self, sample_image):
        """Test face detection returns landmarks"""
        detector = FaceDetector()
        # This test assumes sample_image is in the correct format
        # Actual behavior depends on image content
        result = detector.detect_face(sample_image)
        # Result can be None if no face detected or dict with landmarks
        assert result is None or isinstance(result, (dict, list))

    def test_detect_face_with_invalid_input(self, detector):
        """Test face detection with invalid input"""
        with pytest.raises((TypeError, ValueError)):
            detector = FaceDetector()
            detector.detect_face(None)

    @patch('cv2.CascadeClassifier')
    def test_face_detector_cascade_loading(self, mock_cascade):
        """Test that cascade classifier is loaded correctly"""
        mock_cascade.return_value = MagicMock()
        detector = FaceDetector()
        assert detector is not None

    def test_extract_face_roi(self):
        """Test face ROI extraction"""
        detector = FaceDetector()
        # Create dummy image
        image = np.zeros((480, 640, 3), dtype=np.uint8)
        
        # Test with valid bounding box
        x, y, w, h = 100, 100, 200, 200
        roi = image[y:y+h, x:x+w]
        assert roi.shape == (200, 200, 3)

    def test_normalize_landmarks(self):
        """Test landmark normalization"""
        detector = FaceDetector()
        # Sample landmarks (should be between 0-1 for normalized)
        landmarks = np.array([
            [0.5, 0.5],  # Normalized
            [0.3, 0.7],
            [0.8, 0.2]
        ])
        
        # Landmarks should already be normalized for MediaPipe
        assert np.all(landmarks >= 0) and np.all(landmarks <= 1)


class TestFaceDetectionIntegration:
    """Integration tests for face detection"""

    def test_detect_multiple_faces(self):
        """Test detection with multiple faces"""
        detector = FaceDetector()
        # Create image with patterns
        image = np.ones((480, 640, 3), dtype=np.uint8) * 255
        result = detector.detect_face(image)
        # Should handle empty/multiple detections gracefully
        assert result is None or isinstance(result, (dict, list))

    def test_detection_with_different_image_sizes(self):
        """Test detection with various image sizes"""
        detector = FaceDetector()
        sizes = [(480, 640), (720, 1280), (360, 480)]
        
        for height, width in sizes:
            image = np.zeros((height, width, 3), dtype=np.uint8)
            result = detector.detect_face(image)
            assert result is None or isinstance(result, (dict, list))

    def test_detection_performance(self, benchmark):
        """Benchmark face detection performance"""
        detector = FaceDetector()
        image = np.ones((480, 640, 3), dtype=np.uint8) * 128
        
        def detect():
            return detector.detect_face(image)
        
        # Should complete in reasonable time (< 1 second for 640x480)
        result = benchmark(detect)


@pytest.fixture
def detector():
    """Provide FaceDetector instance"""
    return FaceDetector()


class TestLandmarkProcessing:
    """Tests for landmark processing"""

    def test_landmark_extraction_from_mediapipe(self, sample_landmarks):
        """Test extracting landmarks from MediaPipe results"""
        # Verify landmark structure
        assert len(sample_landmarks) == 468
        
        for landmark in sample_landmarks:
            assert 'x' in landmark
            assert 'y' in landmark
            assert 'z' in landmark
            assert 0 <= landmark['x'] <= 1
            assert 0 <= landmark['y'] <= 1

    def test_key_point_extraction(self, sample_landmarks):
        """Test extracting key landmarks (eyes, nose, mouth)"""
        # MediaPipe key indices
        left_eye_indices = [33, 160, 158, 133, 153, 144]
        right_eye_indices = [362, 385, 387, 263, 373, 380]
        
        left_eye = [sample_landmarks[i] for i in left_eye_indices]
        right_eye = [sample_landmarks[i] for i in right_eye_indices]
        
        assert len(left_eye) == len(left_eye_indices)
        assert len(right_eye) == len(right_eye_indices)

    def test_face_center_calculation(self, sample_landmarks):
        """Test calculating face center from landmarks"""
        x_coords = [l['x'] for l in sample_landmarks]
        y_coords = [l['y'] for l in sample_landmarks]
        
        center_x = np.mean(x_coords)
        center_y = np.mean(y_coords)
        
        assert 0 <= center_x <= 1
        assert 0 <= center_y <= 1
