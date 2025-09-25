#!/usr/bin/env python3
"""
Bicep curl exercise analyzer.
"""

from typing import List, Any
from modules.exercise.base import BaseExerciseAnalyzer, ExerciseConfig
from modules.utils.mediapipe_utils import calculate_angle, LandmarkIndices
from utils.logger import get_logger

logger = get_logger(__name__)


class BicepCurlAnalyzer(BaseExerciseAnalyzer):
    """
    Analyzer for bicep curl exercises.
    
    Detects bicep curls by measuring the elbow angle (shoulder-elbow-wrist).
    - Up position: Elbow angle < 30° (arm curled)
    - Down position: Elbow angle > 160° (arm extended)
    """
    
    def __init__(self, 
                 arm: str = "left",
                 config: ExerciseConfig = None):
        """
        Initialize bicep curl analyzer.
        
        Args:
            arm: Which arm to track ("left" or "right")
            config: Exercise configuration
        """
        if config is None:
            config = ExerciseConfig(
                up_threshold=60,      # Arm fully curled (60° and below) - bicep fully contracted
                down_threshold=160,   # Arm fully extended (160° and above) - arm straight
                smoothing_window=3,   # Moderate smoothing for responsiveness
                min_visibility=0.6    # Minimum landmark visibility threshold
            )
        
        super().__init__(config.smoothing_window, config.min_visibility)
        
        self.arm = arm.lower()
        self.up_threshold = config.up_threshold
        self.down_threshold = config.down_threshold
        
        # Set landmarks based on arm
        if self.arm == "left":
            self._shoulder_idx = LandmarkIndices.LEFT_SHOULDER
            self._elbow_idx = LandmarkIndices.LEFT_ELBOW
            self._wrist_idx = LandmarkIndices.LEFT_WRIST
            logger.info(f"👈 Initialized LEFT arm bicep curl analyzer")
        else:  # right
            self._shoulder_idx = LandmarkIndices.RIGHT_SHOULDER
            self._elbow_idx = LandmarkIndices.RIGHT_ELBOW
            self._wrist_idx = LandmarkIndices.RIGHT_WRIST
            logger.info(f"👉 Initialized RIGHT arm bicep curl analyzer")
        
        logger.info(f"  - Up threshold: {self.up_threshold}° (fully curled)")
        logger.info(f"  - Down threshold: {self.down_threshold}° (arm extended)")
        logger.info(f"  - Smoothing window: {self.smoothing_window} frames")
    
    @property
    def exercise_name(self) -> str:
        """Return the name of the exercise."""
        return f"bicep_curl_{self.arm}"
    
    @property
    def required_landmarks(self) -> List[int]:
        """Return list of required landmark indices."""
        return [self._shoulder_idx, self._elbow_idx, self._wrist_idx]
    
    def calculate_exercise_angle(self, landmarks: List[Any]) -> float:
        """
        Calculate elbow angle for bicep curl.
        
        Args:
            landmarks: MediaPipe pose landmarks
            
        Returns:
            Elbow angle in degrees
        """
        # Get landmark coordinates
        shoulder = (landmarks[self._shoulder_idx].x, landmarks[self._shoulder_idx].y)
        elbow = (landmarks[self._elbow_idx].x, landmarks[self._elbow_idx].y)
        wrist = (landmarks[self._wrist_idx].x, landmarks[self._wrist_idx].y)
        
        # Calculate angle at elbow
        angle = calculate_angle(shoulder, elbow, wrist)
        
        return angle
    
    def determine_stage(self, angle: float) -> str:
        """
        Determine bicep curl stage based on elbow angle.
        
        Args:
            angle: Elbow angle in degrees
            
        Returns:
            Exercise stage ("up", "down", "ready")
        """
        if angle < self.up_threshold:
            return "up"
        elif angle > self.down_threshold:
            return "down"
        else:
            return "ready"
    
    def get_visualization_points(self, landmarks: List[Any]) -> List[tuple]:
        """
        Get key points for visualization.
        
        Args:
            landmarks: MediaPipe pose landmarks
            
        Returns:
            List of (x, y, color) tuples for visualization
        """
        points = []
        color = (255, 255, 0) if self.arm == "left" else (255, 0, 255)  # Yellow for left, Magenta for right
        
        for idx in self.required_landmarks:
            landmark = landmarks[idx]
            if landmark.visibility > self.min_visibility:
                points.append((landmark.x, landmark.y, color))
        
        return points


class DualArmBicepCurlAnalyzer(BaseExerciseAnalyzer):
    """
    Analyzer for tracking both arms simultaneously in bicep curls.
    """
    
    def __init__(self, config: ExerciseConfig = None):
        """
        Initialize dual arm bicep curl analyzer.
        
        Args:
            config: Exercise configuration
        """
        if config is None:
            config = ExerciseConfig(
                up_threshold=60,      # Arm fully curled (60° and below) - bicep fully contracted
                down_threshold=160,   # Arm fully extended (160° and above) - arm straight
                smoothing_window=3,   # Moderate smoothing for responsiveness
                min_visibility=0.6    # Minimum landmark visibility threshold
            )
        
        super().__init__(config.smoothing_window, config.min_visibility)
        
        self.up_threshold = config.up_threshold
        self.down_threshold = config.down_threshold
        
        # Left arm landmarks
        self._left_shoulder_idx = LandmarkIndices.LEFT_SHOULDER
        self._left_elbow_idx = LandmarkIndices.LEFT_ELBOW
        self._left_wrist_idx = LandmarkIndices.LEFT_WRIST
        
        # Right arm landmarks
        self._right_shoulder_idx = LandmarkIndices.RIGHT_SHOULDER
        self._right_elbow_idx = LandmarkIndices.RIGHT_ELBOW
        self._right_wrist_idx = LandmarkIndices.RIGHT_WRIST
        
        logger.info("💪 Initialized DUAL ARM bicep curl analyzer")
        logger.info(f"  - Up threshold: {self.up_threshold}° (fully curled)")
        logger.info(f"  - Down threshold: {self.down_threshold}° (arm extended)")
        logger.info(f"  - Smoothing window: {self.smoothing_window} frames")
    
    @property
    def exercise_name(self) -> str:
        """Return the name of the exercise."""
        return "bicep_curl_both"
    
    @property
    def required_landmarks(self) -> List[int]:
        """Return list of required landmark indices."""
        return [
            self._left_shoulder_idx, self._left_elbow_idx, self._left_wrist_idx,
            self._right_shoulder_idx, self._right_elbow_idx, self._right_wrist_idx
        ]
    
    def calculate_exercise_angle(self, landmarks: List[Any]) -> float:
        """
        Calculate average elbow angle for both arms.
        
        Args:
            landmarks: MediaPipe pose landmarks
            
        Returns:
            Average elbow angle in degrees
        """
        # Calculate left arm angle
        left_shoulder = (landmarks[self._left_shoulder_idx].x, landmarks[self._left_shoulder_idx].y)
        left_elbow = (landmarks[self._left_elbow_idx].x, landmarks[self._left_elbow_idx].y)
        left_wrist = (landmarks[self._left_wrist_idx].x, landmarks[self._left_wrist_idx].y)
        left_angle = calculate_angle(left_shoulder, left_elbow, left_wrist)
        
        # Calculate right arm angle
        right_shoulder = (landmarks[self._right_shoulder_idx].x, landmarks[self._right_shoulder_idx].y)
        right_elbow = (landmarks[self._right_elbow_idx].x, landmarks[self._right_elbow_idx].y)
        right_wrist = (landmarks[self._right_wrist_idx].x, landmarks[self._right_wrist_idx].y)
        right_angle = calculate_angle(right_shoulder, right_elbow, right_wrist)
        
        # Return average angle (both arms should move together)
        return (left_angle + right_angle) / 2
    
    def determine_stage(self, angle: float) -> str:
        """
        Determine bicep curl stage based on average elbow angle.
        
        Args:
            angle: Average elbow angle in degrees
            
        Returns:
            Exercise stage ("up", "down", "ready")
        """
        if angle < self.up_threshold:  # Small angle = curled up
            return "up"
        elif angle > self.down_threshold:  # Large angle = extended down
            return "down"
        else:
            return "ready"
    
    def analyze_frame(self, landmarks: List[Any]) -> dict:
        """
        Analyze frame using base class functionality.
        
        Args:
            landmarks: MediaPipe pose landmarks
            
        Returns:
            Analysis results with proper rep counting
        """
        # Use the base class analyze_frame which handles all the rep counting logic
        return super().analyze_frame(landmarks)
    
    def get_visualization_points(self, landmarks: List[Any]) -> List[tuple]:
        """
        Get key points for visualization of both arms.
        
        Args:
            landmarks: MediaPipe pose landmarks
            
        Returns:
            List of (x, y, color) tuples for visualization
        """
        points = []
        
        # Left arm points (yellow)
        left_color = (255, 255, 0)
        for idx in [self._left_shoulder_idx, self._left_elbow_idx, self._left_wrist_idx]:
            landmark = landmarks[idx]
            if landmark.visibility > self.min_visibility:
                points.append((landmark.x, landmark.y, left_color))
        
        # Right arm points (magenta)
        right_color = (255, 0, 255)
        for idx in [self._right_shoulder_idx, self._right_elbow_idx, self._right_wrist_idx]:
            landmark = landmarks[idx]
            if landmark.visibility > self.min_visibility:
                points.append((landmark.x, landmark.y, right_color))
        
        return points
