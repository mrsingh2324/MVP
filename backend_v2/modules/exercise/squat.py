#!/usr/bin/env python3
"""
Squat exercise analyzer.
"""

from typing import List, Any
from modules.exercise.base import BaseExerciseAnalyzer, ExerciseConfig
from modules.utils.mediapipe_utils import calculate_angle, LandmarkIndices
from utils.logger import get_logger

logger = get_logger(__name__)


class SquatAnalyzer(BaseExerciseAnalyzer):
    """
    Analyzer for squat exercises.
    
    Detects squats by measuring the knee angle (hip-knee-ankle).
    - Up position: Knee angle > 160° (standing straight)
    - Down position: Knee angle < 90° (squatting down)
    """
    
    def __init__(self, 
                 leg: str = "left",
                 config: ExerciseConfig = None):
        """
        Initialize squat analyzer.
        
        Args:
            leg: Which leg to track ("left" or "right")
            config: Exercise configuration
        """
        if config is None:
            config = ExerciseConfig(
                up_threshold=170,     # Standing straight (170°+)
                down_threshold=160,   # Squatting down (160° and below) - much more realistic
                smoothing_window=5,   # More smoothing for stability
                min_visibility=0.6
            )
        
        super().__init__(config.smoothing_window, config.min_visibility)
        
        self.leg = leg.lower()
        self.up_threshold = config.up_threshold
        self.down_threshold = config.down_threshold
        
        # Set landmarks based on leg
        if self.leg == "left":
            self._hip_idx = LandmarkIndices.LEFT_HIP
            self._knee_idx = LandmarkIndices.LEFT_KNEE
            self._ankle_idx = LandmarkIndices.LEFT_ANKLE
        else:  # right
            self._hip_idx = LandmarkIndices.RIGHT_HIP
            self._knee_idx = LandmarkIndices.RIGHT_KNEE
            self._ankle_idx = LandmarkIndices.RIGHT_ANKLE
        
        logger.info(f"Initialized squat analyzer for {leg} leg")
    
    @property
    def exercise_name(self) -> str:
        """Return the name of the exercise."""
        return f"squat_{self.leg}"
    
    @property
    def required_landmarks(self) -> List[int]:
        """Return list of required landmark indices."""
        return [self._hip_idx, self._knee_idx, self._ankle_idx]
    
    def calculate_exercise_angle(self, landmarks: List[Any]) -> float:
        """
        Calculate knee angle for squat.
        
        Args:
            landmarks: MediaPipe pose landmarks
            
        Returns:
            Knee angle in degrees
        """
        # Get landmark coordinates
        hip = (landmarks[self._hip_idx].x, landmarks[self._hip_idx].y)
        knee = (landmarks[self._knee_idx].x, landmarks[self._knee_idx].y)
        ankle = (landmarks[self._ankle_idx].x, landmarks[self._ankle_idx].y)
        
        # Calculate angle at knee
        angle = calculate_angle(hip, knee, ankle)
        
        return angle
    
    def determine_stage(self, angle: float) -> str:
        """
        Determine squat stage based on knee angle.
        
        Args:
            angle: Knee angle in degrees
            
        Returns:
            Exercise stage ("up", "down", "ready")
        """
        if angle > self.up_threshold:
            return "up"
        elif angle < self.down_threshold:
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
        color = (0, 255, 255) if self.leg == "left" else (255, 165, 0)  # Cyan for left, Orange for right
        
        for idx in self.required_landmarks:
            landmark = landmarks[idx]
            if landmark.visibility > self.min_visibility:
                points.append((landmark.x, landmark.y, color))
        
        return points


class DualLegSquatAnalyzer(BaseExerciseAnalyzer):
    """
    Analyzer for tracking both legs simultaneously in squats.
    """
    
    def __init__(self, config: ExerciseConfig = None):
        """
        Initialize dual leg squat analyzer.
        
        Args:
            config: Exercise configuration
        """
        if config is None:
            config = ExerciseConfig(
                up_threshold=170,     # Standing straight (170°+)
                down_threshold=160,   # Squatting down (160° and below) - much more realistic
                smoothing_window=5,   # More smoothing for stability
                min_visibility=0.6
            )
        
        super().__init__(config.smoothing_window, config.min_visibility)
        
        self.up_threshold = config.up_threshold
        self.down_threshold = config.down_threshold
        
        # We'll use left leg as primary for angle calculation
        self._left_hip_idx = LandmarkIndices.LEFT_HIP
        self._left_knee_idx = LandmarkIndices.LEFT_KNEE
        self._left_ankle_idx = LandmarkIndices.LEFT_ANKLE
        
        # Right leg for validation
        self._right_hip_idx = LandmarkIndices.RIGHT_HIP
        self._right_knee_idx = LandmarkIndices.RIGHT_KNEE
        self._right_ankle_idx = LandmarkIndices.RIGHT_ANKLE
        
        logger.info("Initialized dual leg squat analyzer")
    
    @property
    def exercise_name(self) -> str:
        """Return the name of the exercise."""
        return "squat"
    
    @property
    def required_landmarks(self) -> List[int]:
        """Return list of required landmark indices."""
        return [
            self._left_hip_idx, self._left_knee_idx, self._left_ankle_idx,
            self._right_hip_idx, self._right_knee_idx, self._right_ankle_idx
        ]
    
    def calculate_exercise_angle(self, landmarks: List[Any]) -> float:
        """
        Calculate average knee angle for both legs.
        
        Args:
            landmarks: MediaPipe pose landmarks
            
        Returns:
            Average knee angle in degrees
        """
        # Calculate left leg angle
        left_hip = (landmarks[self._left_hip_idx].x, landmarks[self._left_hip_idx].y)
        left_knee = (landmarks[self._left_knee_idx].x, landmarks[self._left_knee_idx].y)
        left_ankle = (landmarks[self._left_ankle_idx].x, landmarks[self._left_ankle_idx].y)
        left_angle = calculate_angle(left_hip, left_knee, left_ankle)
        
        # Calculate right leg angle
        right_hip = (landmarks[self._right_hip_idx].x, landmarks[self._right_hip_idx].y)
        right_knee = (landmarks[self._right_knee_idx].x, landmarks[self._right_knee_idx].y)
        right_ankle = (landmarks[self._right_ankle_idx].x, landmarks[self._right_ankle_idx].y)
        right_angle = calculate_angle(right_hip, right_knee, right_ankle)
        
        # Return average angle (both legs should move together in squats)
        return (left_angle + right_angle) / 2
    
    def determine_stage(self, angle: float) -> str:
        """
        Determine squat stage based on average knee angle.
        
        Args:
            angle: Average knee angle in degrees
            
        Returns:
            Exercise stage ("up", "down", "ready")
        """
        if angle > self.up_threshold:
            return "up"
        elif angle < self.down_threshold:
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
        Get key points for visualization of both legs.
        
        Args:
            landmarks: MediaPipe pose landmarks
            
        Returns:
            List of (x, y, color) tuples for visualization
        """
        points = []
        
        # Left leg points (cyan)
        left_color = (0, 255, 255)
        for idx in [self._left_hip_idx, self._left_knee_idx, self._left_ankle_idx]:
            landmark = landmarks[idx]
            if landmark.visibility > self.min_visibility:
                points.append((landmark.x, landmark.y, left_color))
        
        # Right leg points (orange)
        right_color = (255, 165, 0)
        for idx in [self._right_hip_idx, self._right_knee_idx, self._right_ankle_idx]:
            landmark = landmarks[idx]
            if landmark.visibility > self.min_visibility:
                points.append((landmark.x, landmark.y, right_color))
        
        return points
