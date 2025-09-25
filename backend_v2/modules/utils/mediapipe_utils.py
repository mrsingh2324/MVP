#!/usr/bin/env python3
"""
MediaPipe utilities for pose landmark extraction and processing.
"""

import cv2
try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    mp = None
    MEDIAPIPE_AVAILABLE = False
    print("Warning: MediaPipe not available. Exercise detection features will be limited.")
import numpy as np
from typing import Dict, List, Optional, Tuple, Any
from utils.logger import get_logger

logger = get_logger(__name__)


class MediaPipeProcessor:
    """Handles MediaPipe pose detection and landmark extraction."""
    
    def __init__(self, 
                 min_detection_confidence: float = 0.5,
                 min_tracking_confidence: float = 0.5,
                 model_complexity: int = 1):
        """
        Initialize MediaPipe pose detection.
        
        Args:
            min_detection_confidence: Minimum confidence for pose detection
            min_tracking_confidence: Minimum confidence for pose tracking
            model_complexity: Model complexity (0, 1, or 2)
        """
        if not MEDIAPIPE_AVAILABLE:
            logger.warning("MediaPipe not available - pose detection disabled")
            self.mp_pose = None
            self.mp_drawing = None
            self.mp_drawing_styles = None
            self.pose = None
            return
            
        self.mp_pose = mp.solutions.pose
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles
        
        self.pose = self.mp_pose.Pose(
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence,
            model_complexity=model_complexity
        )
        
        logger.info(f"MediaPipe processor initialized with complexity {model_complexity}")
    
    def extract_landmarks(self, image: np.ndarray) -> Optional[List[Any]]:
        """
        Extract pose landmarks from an image.
        
        Args:
            image: Input image as numpy array (BGR format)
            
        Returns:
            List of pose landmarks or None if no pose detected
        """
        try:
            # Convert BGR to RGB
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            rgb_image.flags.writeable = False
            
            # Process image
            results = self.pose.process(rgb_image)
            
            if results.pose_landmarks:
                return results.pose_landmarks.landmark
            
            return None
            
        except Exception as e:
            logger.error(f"Error extracting landmarks: {e}")
            return None
    
    def get_landmark_coordinates(
        self, 
        landmarks: List[Any], 
        landmark_indices: List[int],
        image_shape: Optional[Tuple[int, int]] = None
    ) -> List[Tuple[float, float]]:
        """
        Get coordinates for specific landmarks.
        
        Args:
            landmarks: MediaPipe landmarks
            landmark_indices: List of landmark indices to extract
            image_shape: Optional (height, width) to convert to pixel coordinates
            
        Returns:
            List of (x, y) coordinates
        """
        coordinates = []
        
        for idx in landmark_indices:
            landmark = landmarks[idx]
            x, y = landmark.x, landmark.y
            
            # Convert to pixel coordinates if image shape provided
            if image_shape:
                h, w = image_shape
                x = int(x * w)
                y = int(y * h)
            
            coordinates.append((x, y))
        
        return coordinates
    
    def check_landmark_visibility(
        self, 
        landmarks: List[Any], 
        landmark_indices: List[int],
        min_visibility: float = 0.6
    ) -> bool:
        """
        Check if landmarks are visible with sufficient confidence.
        
        Args:
            landmarks: MediaPipe landmarks
            landmark_indices: Landmark indices to check
            min_visibility: Minimum visibility threshold
            
        Returns:
            True if all landmarks are sufficiently visible
        """
        for idx in landmark_indices:
            if landmarks[idx].visibility < min_visibility:
                return False
        return True
    
    def draw_landmarks(
        self, 
        image: np.ndarray, 
        landmarks: List[Any],
        connections: Optional[Any] = None
    ) -> np.ndarray:
        """
        Draw pose landmarks on image.
        
        Args:
            image: Input image
            landmarks: MediaPipe landmarks
            connections: Optional pose connections
            
        Returns:
            Image with landmarks drawn
        """
        if connections is None:
            connections = self.mp_pose.POSE_CONNECTIONS
        
        # Create a fake results object for drawing
        class FakeResults:
            def __init__(self, landmarks):
                self.pose_landmarks = type('obj', (object,), {'landmark': landmarks})()
        
        fake_results = FakeResults(landmarks)
        
        self.mp_drawing.draw_landmarks(
            image,
            fake_results.pose_landmarks,
            connections,
            self.mp_drawing.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=2),
            self.mp_drawing.DrawingSpec(color=(0, 0, 255), thickness=2, circle_radius=2)
        )
        
        return image
    
    def cleanup(self):
        """Clean up MediaPipe resources."""
        if hasattr(self, 'pose'):
            self.pose.close()
            logger.info("MediaPipe processor cleaned up")


# Landmark indices for common body parts
class LandmarkIndices:
    """MediaPipe pose landmark indices."""
    
    # Arms
    LEFT_SHOULDER = 11
    LEFT_ELBOW = 13
    LEFT_WRIST = 15
    RIGHT_SHOULDER = 12
    RIGHT_ELBOW = 14
    RIGHT_WRIST = 16
    
    # Legs
    LEFT_HIP = 23
    LEFT_KNEE = 25
    LEFT_ANKLE = 27
    RIGHT_HIP = 24
    RIGHT_KNEE = 26
    RIGHT_ANKLE = 28
    
    # Torso
    NOSE = 0
    LEFT_EYE = 1
    RIGHT_EYE = 2
    LEFT_EAR = 3
    RIGHT_EAR = 4


def calculate_angle(point_a: Tuple[float, float], 
                   point_b: Tuple[float, float], 
                   point_c: Tuple[float, float]) -> float:
    """
    Calculate angle between three points.
    
    Args:
        point_a: First point (x, y)
        point_b: Middle point (vertex of angle)
        point_c: Third point (x, y)
        
    Returns:
        Angle in degrees
    """
    a = np.array(point_a)
    b = np.array(point_b)
    c = np.array(point_c)
    
    # Calculate vectors
    ba = a - b
    bc = c - b
    
    # Calculate angle using dot product
    cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
    
    # Clamp to avoid numerical errors
    cosine_angle = np.clip(cosine_angle, -1.0, 1.0)
    
    # Convert to degrees
    angle = np.arccos(cosine_angle) * 180.0 / np.pi
    
    return angle
