#!/usr/bin/env python3
"""
Base exercise analyzer with shared functionality for all exercise types.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Tuple, Any
import numpy as np
import time
from utils.logger import get_logger
from modules.utils.mediapipe_utils import calculate_angle, LandmarkIndices

logger = get_logger(__name__)


class BaseExerciseAnalyzer(ABC):
    """
    Abstract base class for exercise analyzers.
    
    All exercise analyzers should inherit from this class and implement
    the required abstract methods.
    """
    
    def __init__(self, 
                 smoothing_window: int = 3,
                 min_visibility: float = 0.6):
        """
        Initialize base exercise analyzer.
        
        Args:
            smoothing_window: Number of frames for angle smoothing
            min_visibility: Minimum landmark visibility threshold
        """
        self.smoothing_window = smoothing_window
        self.min_visibility = min_visibility
        
        # Exercise state
        self.rep_count = 0
        self.current_stage = "ready"
        self.previous_stage = "ready"
        self.angle_history: List[float] = []
        
        # Rep counting state
        self.has_been_up = False
        self.has_been_down = False
        self.stage_change_count = 0
        self.last_stage_change_time = 0
        
        # Exercise-specific thresholds (to be set by subclasses)
        self.up_threshold = 0
        self.down_threshold = 0
        
        logger.info(f"Initialized {self.__class__.__name__}")
    
    @property
    @abstractmethod
    def exercise_name(self) -> str:
        """Return the name of the exercise."""
        pass
    
    @property
    @abstractmethod
    def required_landmarks(self) -> List[int]:
        """Return list of required landmark indices for this exercise."""
        pass
    
    @abstractmethod
    def calculate_exercise_angle(self, landmarks: List[Any]) -> float:
        """
        Calculate the primary angle for this exercise.
        
        Args:
            landmarks: MediaPipe pose landmarks
            
        Returns:
            Calculated angle in degrees
        """
        pass
    
    @abstractmethod
    def determine_stage(self, angle: float) -> str:
        """
        Determine exercise stage based on angle.
        
        Args:
            angle: Current exercise angle
            
        Returns:
            Exercise stage ("up", "down", "ready")
        """
        pass
    
    def check_landmarks_visible(self, landmarks: List[Any]) -> bool:
        """
        Check if required landmarks are visible.
        
        Args:
            landmarks: MediaPipe pose landmarks
            
        Returns:
            True if all required landmarks are visible
        """
        for idx in self.required_landmarks:
            if landmarks[idx].visibility < self.min_visibility:
                return False
        return True
    
    def smooth_angle(self, angle: float) -> float:
        """
        Apply smoothing to angle measurements.
        
        Args:
            angle: Raw angle measurement
            
        Returns:
            Smoothed angle
        """
        self.angle_history.append(angle)
        
        # Keep only recent angles
        if len(self.angle_history) > self.smoothing_window:
            self.angle_history.pop(0)
        
        # Return moving average
        return sum(self.angle_history) / len(self.angle_history)
    
    def update_rep_count(self, current_stage: str, previous_stage: str) -> bool:
        """
        Count one rep for each DOWN -> UP transition.
        """
        current_time = time.time()

        # Prevent noisy rapid flips
        if current_stage != previous_stage:
            if current_time - self.last_stage_change_time < 0.5:
                return False
            self.last_stage_change_time = current_time

        rep_completed = False

        # Count a rep whenever user goes DOWN -> UP
        if current_stage == "up" and previous_stage == "down":
            self.rep_count += 1
            rep_completed = True
            logger.info(f"🎉 {self.exercise_name}: REP COMPLETED! Total: {self.rep_count}")

        return rep_completed

    def analyze_frame(self, landmarks: List[Any]) -> Dict[str, Any]:
        """
        Analyze a single frame for exercise detection.
        
        Args:
            landmarks: MediaPipe pose landmarks
            
        Returns:
            Dictionary with analysis results
        """
        try:
            # Log frame analysis start
            frame_start_time = time.time()
            
            # Check if required landmarks are visible
            if not self.check_landmarks_visible(landmarks):
                logger.warning(f"{self.exercise_name}: Required landmarks not visible")
                return {
                    "exercise": self.exercise_name,
                    "reps": self.rep_count,
                    "stage": self.current_stage,
                    "angle": None,
                    "error": "Required landmarks not visible"
                }
            
            # Calculate exercise angle
            raw_angle = self.calculate_exercise_angle(landmarks)
            smoothed_angle = self.smooth_angle(raw_angle)
            
            # Log angle calculation
            logger.debug(f"{self.exercise_name}: Angle - Raw: {raw_angle:.1f}°, Smoothed: {smoothed_angle:.1f}°")
            
            # Determine stage
            previous_stage = self.current_stage
            self.current_stage = self.determine_stage(smoothed_angle)
            
            # Log stage determination
            if self.current_stage != previous_stage:
                logger.info(f"{self.exercise_name}: Stage changed from {previous_stage} to {self.current_stage}")
            
            # Update rep count if stage changed
            rep_completed = False
            if self.current_stage != previous_stage:
                rep_completed = self.update_rep_count(self.current_stage, previous_stage)
                if rep_completed:
                    logger.info(f"{self.exercise_name}: Rep {self.rep_count} completed!")
            
            # Prepare response
            result = {
                "exercise": self.exercise_name,
                "reps": self.rep_count,
                "stage": self.current_stage,
                "angle": float(smoothed_angle),
                "rep_completed": rep_completed,
                "timestamp": time.time()
            }
            
            # Add debug info
            result["debug"] = {
                "raw_angle": float(raw_angle),
                "smoothed_angle": float(smoothed_angle),
                "previous_stage": previous_stage,
                "has_been_up": self.has_been_up,
                "has_been_down": self.has_been_down,
                "processing_time_ms": (time.time() - frame_start_time) * 1000
            }
            
            # Log frame processing summary
            logger.debug(f"{self.exercise_name}: Frame processed - {result}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error in analyze_frame: {str(e)}", exc_info=True)
            return {
                "exercise": self.exercise_name,
                "reps": self.rep_count,
                "stage": "error",
                "angle": None,
                "error": str(e),
                "debug": {
                    "error_type": type(e).__name__,
                    "timestamp": time.time()
                }
            }
    
    def reset(self):
        """Reset exercise state."""
        self.rep_count = 0
        self.current_stage = "ready"
        self.previous_stage = "ready"
        self.angle_history.clear()
        
        # Reset rep counting state
        self.has_been_up = False
        self.has_been_down = False
        self.stage_change_count = 0
        self.last_stage_change_time = 0
        
        logger.info(f"{self.exercise_name}: Exercise state reset")
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get current exercise statistics.
        
        Returns:
            Dictionary with current stats
        """
        return {
            "exercise": self.exercise_name,
            "reps": self.rep_count,
            "stage": self.current_stage,
            "angle_history_length": len(self.angle_history)
        }
    
    def get_form_feedback(self, landmarks: List[Any], angle: float, stage: str) -> List[Dict[str, str]]:
        """
        Generate form feedback for the current exercise state.
        
        This is a default implementation that subclasses can override.
        
        Args:
            landmarks: MediaPipe pose landmarks
            angle: Current exercise angle
            stage: Current exercise stage
            
        Returns:
            List of feedback messages with level, message, and suggestion
        """
        feedback = []
        
        # Basic motivational feedback based on reps
        if self.rep_count > 0:
            if self.rep_count % 5 == 0:
                feedback.append({
                    "level": "excellent",
                    "message": f"Great job! {self.rep_count} reps completed!",
                    "suggestion": "Keep up the excellent form!"
                })
            elif self.rep_count % 3 == 0:
                feedback.append({
                    "level": "good",
                    "message": "You're doing great!",
                    "suggestion": "Focus on controlled movements"
                })
        
        # Stage-specific feedback
        if stage == "ready":
            feedback.append({
                "level": "info",
                "message": "Get ready for your next rep",
                "suggestion": "Maintain proper form and control"
            })
        
        return feedback


class ExerciseConfig:
    """Configuration class for exercise parameters."""
    
    def __init__(self,
                 up_threshold: float,
                 down_threshold: float,
                 smoothing_window: int = 3,
                 min_visibility: float = 0.6):
        """
        Initialize exercise configuration.
        
        Args:
            up_threshold: Angle threshold for "up" position
            down_threshold: Angle threshold for "down" position
            smoothing_window: Number of frames for smoothing
            min_visibility: Minimum landmark visibility
        """
        self.up_threshold = up_threshold
        self.down_threshold = down_threshold
        self.smoothing_window = smoothing_window
        self.min_visibility = min_visibility
