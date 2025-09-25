#!/usr/bin/env python3
"""
Workout session manager for tracking exercise sessions and generating summaries.
"""

import time
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from utils.logger import get_logger

logger = get_logger(__name__)


class WorkoutSession:
    """
    Manages a single workout session with exercise tracking and summary generation.
    """
    
    def __init__(self, session_id: str = None):
        """Initialize a new workout session."""
        self.session_id = session_id or f"session_{int(time.time())}"
        self.start_time = datetime.now()
        self.end_time = None
        self.exercises_performed = {}
        self.total_reps = 0
        self.is_active = True
        
        logger.info(f"Started workout session: {self.session_id}")
    
    def add_exercise_rep(self, exercise_name: str, stage: str = None, angle: float = None):
        """
        Add a rep for an exercise.
        
        Args:
            exercise_name: Name of the exercise
            stage: Current exercise stage
            angle: Exercise angle if available
        """
        if not self.is_active:
            return
        
        if exercise_name not in self.exercises_performed:
            self.exercises_performed[exercise_name] = {
                "reps": 0,
                "start_time": datetime.now(),
                "last_rep_time": None,
                "stages_tracked": [],
                "angles": []
            }
        
        # Only count actual completed reps (not stage changes)
        if stage and stage != "ready":
            self.exercises_performed[exercise_name]["stages_tracked"].append({
                "stage": stage,
                "timestamp": datetime.now(),
                "angle": angle
            })
    
    def increment_rep(self, exercise_name: str):
        """
        Increment rep count for an exercise.
        
        Args:
            exercise_name: Name of the exercise
        """
        if not self.is_active:
            return
        
        if exercise_name not in self.exercises_performed:
            self.exercises_performed[exercise_name] = {
                "reps": 0,
                "start_time": datetime.now(),
                "last_rep_time": None,
                "stages_tracked": [],
                "angles": []
            }
        
        self.exercises_performed[exercise_name]["reps"] += 1
        self.exercises_performed[exercise_name]["last_rep_time"] = datetime.now()
        self.total_reps += 1
        
        logger.info(f"Rep completed: {exercise_name} - Total: {self.exercises_performed[exercise_name]['reps']}")
    
    def end_session(self) -> Dict[str, Any]:
        """
        End the workout session and generate summary.
        
        Returns:
            Workout session summary
        """
        if not self.is_active:
            return self.get_summary()
        
        self.end_time = datetime.now()
        self.is_active = False
        
        logger.info(f"Ended workout session: {self.session_id}")
        return self.get_summary()
    
    def get_summary(self) -> Dict[str, Any]:
        """
        Generate workout session summary.
        
        Returns:
            Complete session summary with stats and recommendations
        """
        duration = self._get_duration()
        calories_estimate = self._estimate_calories()
        
        summary = {
            "session_id": self.session_id,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "duration_minutes": duration.total_seconds() / 60,
            "is_active": self.is_active,
            "total_reps": self.total_reps,
            "exercises_performed": self._format_exercises_summary(),
            "calories_estimate": calories_estimate,
            "performance_metrics": self._calculate_performance_metrics(),
            "recommendations": self._generate_recommendations()
        }
        
        return summary
    
    def _get_duration(self) -> timedelta:
        """Get session duration."""
        end_time = self.end_time or datetime.now()
        return end_time - self.start_time
    
    def _estimate_calories(self) -> float:
        """
        Estimate calories burned based on exercises and duration.
        
        Returns:
            Estimated calories burned
        """
        # Basic calorie estimation (can be made more sophisticated)
        base_rate = 5.0  # calories per minute of exercise
        duration_minutes = self._get_duration().total_seconds() / 60
        
        # Exercise-specific multipliers
        exercise_multipliers = {
            "pushup": 1.2,
            "squat": 1.1,
            "bicep_curl_left": 0.8,
            "bicep_curl_right": 0.8,
            "bicep_curl_both": 1.0
        }
        
        total_calories = 0
        for exercise_name, data in self.exercises_performed.items():
            multiplier = exercise_multipliers.get(exercise_name, 1.0)
            exercise_calories = data["reps"] * 0.5 * multiplier  # 0.5 calories per rep base
            total_calories += exercise_calories
        
        # Add time-based calories
        time_calories = duration_minutes * base_rate
        
        return round(total_calories + time_calories, 1)
    
    def _format_exercises_summary(self) -> Dict[str, Any]:
        """Format exercises data for summary."""
        formatted = {}
        
        for exercise_name, data in self.exercises_performed.items():
            exercise_duration = 0
            if data["last_rep_time"] and data["start_time"]:
                exercise_duration = (data["last_rep_time"] - data["start_time"]).total_seconds() / 60
            
            formatted[exercise_name] = {
                "reps": data["reps"],
                "duration_minutes": round(exercise_duration, 1),
                "stages_count": len(data["stages_tracked"]),
                "average_time_per_rep": round(exercise_duration / max(data["reps"], 1), 2) if exercise_duration > 0 else 0
            }
        
        return formatted
    
    def _calculate_performance_metrics(self) -> Dict[str, Any]:
        """Calculate performance metrics."""
        duration_minutes = self._get_duration().total_seconds() / 60
        
        metrics = {
            "reps_per_minute": round(self.total_reps / max(duration_minutes, 1), 1),
            "exercises_variety": len(self.exercises_performed),
            "session_intensity": "low"  # Default
        }
        
        # Determine intensity based on reps per minute
        if metrics["reps_per_minute"] > 10:
            metrics["session_intensity"] = "high"
        elif metrics["reps_per_minute"] > 5:
            metrics["session_intensity"] = "medium"
        
        return metrics
    
    def _generate_recommendations(self) -> List[str]:
        """Generate personalized recommendations based on session data."""
        recommendations = []
        
        duration_minutes = self._get_duration().total_seconds() / 60
        
        # Duration-based recommendations
        if duration_minutes < 10:
            recommendations.append("Try to extend your workout to at least 15-20 minutes for better results")
        elif duration_minutes > 60:
            recommendations.append("Great endurance! Consider shorter, more intense sessions for variety")
        
        # Rep-based recommendations
        if self.total_reps < 20:
            recommendations.append("Aim for more repetitions to build strength and endurance")
        elif self.total_reps > 100:
            recommendations.append("Excellent work! You're building great stamina")
        
        # Exercise variety recommendations
        if len(self.exercises_performed) == 1:
            recommendations.append("Try adding different exercises to work various muscle groups")
        elif len(self.exercises_performed) >= 3:
            recommendations.append("Great variety! You're working multiple muscle groups")
        
        # Performance-based recommendations
        performance = self._calculate_performance_metrics()
        if performance["session_intensity"] == "low":
            recommendations.append("Consider increasing your pace for a more intense workout")
        elif performance["session_intensity"] == "high":
            recommendations.append("Great intensity! Make sure to rest adequately between sessions")
        
        return recommendations


class WorkoutSessionManager:
    """
    Manages multiple workout sessions and provides session tracking.
    """
    
    def __init__(self):
        """Initialize the session manager."""
        self.current_session: Optional[WorkoutSession] = None
        self.session_history: List[Dict[str, Any]] = []
        logger.info("Workout session manager initialized")
    
    def start_session(self, session_id: str = None) -> str:
        """
        Start a new workout session.
        
        Args:
            session_id: Optional custom session ID
            
        Returns:
            Session ID of the started session
        """
        if self.current_session and self.current_session.is_active:
            # End current session first
            self.end_current_session()
        
        self.current_session = WorkoutSession(session_id)
        return self.current_session.session_id
    
    def end_current_session(self) -> Optional[Dict[str, Any]]:
        """
        End the current session and return summary.
        
        Returns:
            Session summary or None if no active session
        """
        if not self.current_session:
            return None
        
        summary = self.current_session.end_session()
        self.session_history.append(summary)
        
        # Keep only last 10 sessions in memory
        if len(self.session_history) > 10:
            self.session_history = self.session_history[-10:]
        
        return summary
    
    def add_rep(self, exercise_name: str, stage: str = None, angle: float = None):
        """Add exercise data to current session."""
        if self.current_session and self.current_session.is_active:
            self.current_session.add_exercise_rep(exercise_name, stage, angle)
    
    def increment_rep(self, exercise_name: str):
        """Increment rep count for current session."""
        if self.current_session and self.current_session.is_active:
            self.current_session.increment_rep(exercise_name)
    
    def get_current_session_summary(self) -> Optional[Dict[str, Any]]:
        """Get current session summary without ending it."""
        if self.current_session:
            return self.current_session.get_summary()
        return None
    
    def get_session_history(self) -> List[Dict[str, Any]]:
        """Get session history."""
        return self.session_history.copy()


# Global session manager instance
session_manager = WorkoutSessionManager()
