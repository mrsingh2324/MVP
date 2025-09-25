#!/usr/bin/env python3
"""
Pushup exercise analyzer using MediaPipe pose detection.

Analyzes pushup form by tracking elbow and shoulder angles to determine
exercise stages and count repetitions.
"""

from typing import List, Any, Dict, Optional
import numpy as np
from .base import BaseExerciseAnalyzer, ExerciseConfig
from utils.logger import get_logger

logger = get_logger(__name__)


class PushupAnalyzer(BaseExerciseAnalyzer):
    """
    Analyzer for pushup exercises.
    
    Tracks elbow angle and body alignment to detect pushup stages:
    - "up": Arms extended, body straight (plank position)
    - "down": Arms bent, chest near ground
    - "ready": Transitional position
    """
    
    def __init__(self):
        """Initialize pushup analyzer with appropriate thresholds."""
        config = ExerciseConfig(
            up_threshold=160.0,      # Arms nearly straight
            down_threshold=90.0,     # Arms bent at 90 degrees
            smoothing_window=5,
            min_visibility=0.6
        )
        super().__init__(config.smoothing_window, config.min_visibility)
        
        self.up_threshold = config.up_threshold
        self.down_threshold = config.down_threshold
        
        logger.info("Pushup analyzer initialized")
    
    @property
    def exercise_name(self) -> str:
        """Return the name of the exercise."""
        return "pushup"
    
    @property
    def required_landmarks(self) -> List[int]:
        """
        Required MediaPipe pose landmarks for pushup analysis.
        
        Returns:
            List of landmark indices: shoulders, elbows, wrists
        """
        return [
            11, 12,  # Left and right shoulders
            13, 14,  # Left and right elbows  
            15, 16,  # Left and right wrists
            23, 24   # Left and right hips (for body alignment)
        ]
    
    def calculate_exercise_angle(self, landmarks: List[Any]) -> Optional[float]:
        """
        Calculate the primary angle for pushup analysis.
        
        Uses the average elbow angle from both arms to determine pushup stage.
        
        Args:
            landmarks: MediaPipe pose landmarks
            
        Returns:
            Average elbow angle in degrees, or None if calculation fails
        """
        try:
            # Get landmark coordinates
            left_shoulder = np.array([landmarks[11].x, landmarks[11].y])
            left_elbow = np.array([landmarks[13].x, landmarks[13].y])
            left_wrist = np.array([landmarks[15].x, landmarks[15].y])
            
            right_shoulder = np.array([landmarks[12].x, landmarks[12].y])
            right_elbow = np.array([landmarks[14].x, landmarks[14].y])
            right_wrist = np.array([landmarks[16].x, landmarks[16].y])
            
            # Calculate elbow angles for both arms
            left_elbow_angle = self._calculate_angle(left_shoulder, left_elbow, left_wrist)
            right_elbow_angle = self._calculate_angle(right_shoulder, right_elbow, right_wrist)
            
            # Check landmark visibility
            left_visible = (landmarks[11].visibility > 0.5 and 
                          landmarks[13].visibility > 0.5 and 
                          landmarks[15].visibility > 0.5)
            right_visible = (landmarks[12].visibility > 0.5 and 
                           landmarks[14].visibility > 0.5 and 
                           landmarks[16].visibility > 0.5)
            
            if left_visible and right_visible:
                # Use average of both arms
                angle = (left_elbow_angle + right_elbow_angle) / 2
            elif left_visible:
                # Use left arm only
                angle = left_elbow_angle
            elif right_visible:
                # Use right arm only  
                angle = right_elbow_angle
            else:
                # No arms visible
                return None
            
            return float(angle)
            
        except (IndexError, AttributeError, ZeroDivisionError) as e:
            logger.warning(f"Error calculating pushup angle: {e}")
            return None
    
    def determine_stage(self, angle: float) -> str:
        """
        Determine pushup stage based on elbow angle.
        
        Args:
            angle: Current elbow angle in degrees
            
        Returns:
            Exercise stage: "up", "down", or "ready"
        """
        if angle >= self.config.up_threshold:
            return "up"
        elif angle <= self.config.down_threshold:
            return "down"
        else:
            return "ready"
    
    def get_exercise_name(self) -> str:
        """Get the exercise name."""
        return "pushup"
    
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
    
    def _calculate_angle(self, point1: np.ndarray, point2: np.ndarray, point3: np.ndarray) -> float:
        """
        Calculate angle between three points.
        
        Args:
            point1: First point (shoulder)
            point2: Middle point (elbow) 
            point3: Third point (wrist)
            
        Returns:
            Angle in degrees
        """
        # Create vectors
        vector1 = point1 - point2  # shoulder to elbow
        vector2 = point3 - point2  # wrist to elbow
        
        # Calculate angle using dot product
        cos_angle = np.dot(vector1, vector2) / (np.linalg.norm(vector1) * np.linalg.norm(vector2))
        
        # Clamp to valid range to avoid numerical errors
        cos_angle = np.clip(cos_angle, -1.0, 1.0)
        
        # Convert to degrees
        angle = np.degrees(np.arccos(cos_angle))
        
        return angle
    
    def get_form_feedback(self, landmarks: List[Any], angle: float, stage: str) -> List[Dict[str, str]]:
        """
        Provide form feedback for pushups.
        
        Args:
            landmarks: MediaPipe pose landmarks
            angle: Current elbow angle
            stage: Current exercise stage
            
        Returns:
            List of feedback messages
        """
        feedback = []
        
        try:
            # Check body alignment
            left_shoulder = np.array([landmarks[11].x, landmarks[11].y])
            right_shoulder = np.array([landmarks[12].x, landmarks[12].y])
            left_hip = np.array([landmarks[23].x, landmarks[23].y])
            right_hip = np.array([landmarks[24].x, landmarks[24].y])
            
            # Calculate body alignment (should be straight line)
            shoulder_center = (left_shoulder + right_shoulder) / 2
            hip_center = (left_hip + right_hip) / 2
            
            # Check if body is aligned (simplified check)
            body_angle_diff = abs(shoulder_center[1] - hip_center[1])
            
            if stage == "down":
                if angle > 110:
                    feedback.append({
                        "level": "warning",
                        "message": "Go lower! Chest should nearly touch the ground",
                        "suggestion": "Bend your elbows more to get a full range of motion"
                    })
                else:
                    feedback.append({
                        "level": "good", 
                        "message": "Good depth! Nice form",
                        "suggestion": "Push back up with control"
                    })
            
            elif stage == "up":
                if angle < 150:
                    feedback.append({
                        "level": "warning",
                        "message": "Extend your arms fully",
                        "suggestion": "Push all the way up to complete the rep"
                    })
                else:
                    feedback.append({
                        "level": "excellent",
                        "message": "Perfect extension! Great form",
                        "suggestion": "Keep your core tight and lower down slowly"
                    })
            
            # Body alignment feedback
            if body_angle_diff > 0.1:  # Threshold for body alignment
                feedback.append({
                    "level": "warning",
                    "message": "Keep your body straight",
                    "suggestion": "Engage your core and maintain a plank position"
                })
            
        except Exception as e:
            logger.warning(f"Error generating pushup feedback: {e}")
        
        return feedback
    
    def get_exercise_tips(self) -> List[str]:
        """
        Get exercise-specific tips for pushups.
        
        Returns:
            List of helpful tips
        """
        return [
            "Keep your body in a straight line from head to heels",
            "Lower your chest until it nearly touches the ground", 
            "Push up with control, fully extending your arms",
            "Engage your core throughout the entire movement",
            "Keep your head in a neutral position",
            "Don't let your hips sag or pike up",
            "Breathe in on the way down, out on the way up"
        ]
