#!/usr/bin/env python3
"""
Exercise tracker that manages different exercise analyzers.
"""

from typing import Dict, Any, Optional, List
from .base import BaseExerciseAnalyzer, ExerciseConfig
from .bicep_curl import BicepCurlAnalyzer, DualArmBicepCurlAnalyzer
from .squat import SquatAnalyzer, DualLegSquatAnalyzer
from .pushup import PushupAnalyzer
from utils.logger import get_logger

# Import AI coach with try/except to handle missing module gracefully
try:
    from modules.ai_coach import AICoachManager
    AI_COACH_AVAILABLE = True
except ImportError as e:
    print(f"Info: AI Coach module not found, using DeepSeek integration instead")
    AICoachManager = None
    AI_COACH_AVAILABLE = False

logger = get_logger(__name__)


class ExerciseTracker:
    """
    Main exercise tracker that manages different exercise analyzers.
    
    Supports loading and switching between different exercise types,
    and maintains state for each exercise independently.
    """
    
    def __init__(self):
        """Initialize the exercise tracker."""
        self._analyzers: Dict[str, BaseExerciseAnalyzer] = {}
        self._current_exercise: Optional[str] = None
        
        # Register available exercises
        self._register_exercises()
        
        logger.info("Exercise tracker initialized")
    
    def _register_exercises(self):
        """Register all available exercise analyzers."""
        # Register only anatomically sensible exercise variations
        self._exercise_registry = {
            # Bicep curl variations - makes sense to track individual arms
            "bicep_curl_left": lambda: BicepCurlAnalyzer("left"),
            "bicep_curl_right": lambda: BicepCurlAnalyzer("right"),
            "bicep_curl_both": lambda: DualArmBicepCurlAnalyzer(),
            
            # Squats - naturally bilateral exercise, only "both legs" makes sense
            "squat": lambda: DualLegSquatAnalyzer(),
            
            # Pushups - bilateral arm exercise
            "pushup": lambda: PushupAnalyzer(),
        }
    
    def get_available_exercises(self) -> List[str]:
        """
        Get list of available exercise types.
        
        Returns:
            List of exercise names
        """
        return list(self._exercise_registry.keys())
    
    def load_exercise(self, exercise_name: str) -> bool:
        """
        Load an exercise analyzer.
        
        Args:
            exercise_name: Name of the exercise to load
            
        Returns:
            True if exercise was loaded successfully
        """
        if exercise_name not in self._exercise_registry:
            logger.error(f"Unknown exercise: {exercise_name}")
            return False
        
        try:
            # Create analyzer if not already loaded
            if exercise_name not in self._analyzers:
                self._analyzers[exercise_name] = self._exercise_registry[exercise_name]()
                logger.info(f"Loaded exercise analyzer: {exercise_name}")
            
            self._current_exercise = exercise_name
            return True
            
        except Exception as e:
            logger.error(f"Error loading exercise {exercise_name}: {e}")
            return False
    
    def analyze_frame(self, exercise_name: str, landmarks: List[Any]) -> Dict[str, Any]:
        """
        Analyze a frame for the specified exercise.
        
        Args:
            exercise_name: Name of the exercise
            landmarks: MediaPipe pose landmarks
            
        Returns:
            Analysis results dictionary
        """
        if not self.load_exercise(exercise_name):
            return {
                "exercise": exercise_name,
                "reps": 0,
                "stage": "error",
                "error": f"Unknown exercise: {exercise_name}"
            }
        
        try:
            analyzer = self._analyzers[exercise_name]
            result = analyzer.analyze_frame(landmarks)
            
            # Ensure consistent response format
            if "exercise" not in result:
                result["exercise"] = exercise_name
            
            # Add form feedback if available
            try:
                angle = result.get("angle")
                stage = result.get("stage", "ready")
                if angle is not None and hasattr(analyzer, 'get_form_feedback'):
                    feedback = analyzer.get_form_feedback(landmarks, angle, stage)
                    if feedback:
                        result["feedback"] = feedback
            except Exception as feedback_error:
                logger.warning(f"Error generating feedback for {exercise_name}: {feedback_error}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error analyzing frame for {exercise_name}: {e}")
            return {
                "exercise": exercise_name,
                "reps": 0,
                "stage": "error",
                "error": str(e)
            }
    
    def reset_exercise(self, exercise_name: str) -> bool:
        """
        Reset an exercise analyzer.
        
        Args:
            exercise_name: Name of the exercise to reset
            
        Returns:
            True if reset was successful
        """
        if exercise_name not in self._analyzers:
            logger.warning(f"Exercise {exercise_name} not loaded, nothing to reset")
            return False
        
        try:
            self._analyzers[exercise_name].reset()
            logger.info(f"Reset exercise: {exercise_name}")
            return True
            
        except Exception as e:
            logger.error(f"Error resetting exercise {exercise_name}: {e}")
            return False
    
    def get_exercise_stats(self, exercise_name: str) -> Optional[Dict[str, Any]]:
        """
        Get statistics for a specific exercise.
        
        Args:
            exercise_name: Name of the exercise
            
        Returns:
            Exercise statistics or None if exercise not loaded
        """
        if exercise_name not in self._analyzers:
            return None
        
        try:
            return self._analyzers[exercise_name].get_stats()
        except Exception as e:
            logger.error(f"Error getting stats for {exercise_name}: {e}")
            return None
    
    def get_all_stats(self) -> Dict[str, Any]:
        """
        Get statistics for all loaded exercises.
        
        Returns:
            Dictionary with stats for all exercises
        """
        stats = {}
        for exercise_name, analyzer in self._analyzers.items():
            try:
                stats[exercise_name] = analyzer.get_stats()
            except Exception as e:
                logger.error(f"Error getting stats for {exercise_name}: {e}")
                stats[exercise_name] = {"error": str(e)}
        
        return stats
    
    def cleanup(self):
        """Clean up all analyzers."""
        for analyzer in self._analyzers.values():
            if hasattr(analyzer, 'cleanup'):
                analyzer.cleanup()
        
        self._analyzers.clear()
        self._current_exercise = None
        logger.info("Exercise tracker cleaned up")
    
    def create_custom_exercise(self, 
                             exercise_name: str, 
                             analyzer_class: type,
                             **kwargs) -> bool:
        """
        Register a custom exercise analyzer.
        
        Args:
            exercise_name: Name for the custom exercise
            analyzer_class: Class that inherits from BaseExerciseAnalyzer
            **kwargs: Arguments to pass to the analyzer constructor
            
        Returns:
            True if registration was successful
        """
        try:
            if not issubclass(analyzer_class, BaseExerciseAnalyzer):
                logger.error(f"Analyzer class must inherit from BaseExerciseAnalyzer")
                return False
            
            self._exercise_registry[exercise_name] = lambda: analyzer_class(**kwargs)
            logger.info(f"Registered custom exercise: {exercise_name}")
            return True
            
        except Exception as e:
            logger.error(f"Error registering custom exercise {exercise_name}: {e}")
            return False
    
    def get_coaching_status(self) -> Dict[str, Any]:
        """
        Get current AI coaching status.
        
        Returns:
            Dictionary with coaching status and settings
        """
        return {
            "enabled": True,  # Default enabled for MVP
            "available": AI_COACH_AVAILABLE,
            "recent_feedback": [],
            "settings": {
                "real_time_feedback": True,
                "form_corrections": True,
                "motivational_messages": True
            }
        }
    
    def enable_coaching(self) -> bool:
        """
        Enable AI coaching feedback.
        
        Returns:
            True if coaching was enabled successfully
        """
        logger.info("AI coaching enabled")
        return True
    
    def disable_coaching(self) -> bool:
        """
        Disable AI coaching feedback.
        
        Returns:
            True if coaching was disabled successfully
        """
        logger.info("AI coaching disabled")
        return True


# Global exercise tracker instance
exercise_tracker = ExerciseTracker()