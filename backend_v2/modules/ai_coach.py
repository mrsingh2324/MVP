#!/usr/bin/env python3
"""
AI Exercise Coach Module
Provides real-time form analysis and guidance for exercises
"""

import logging
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import time

logger = logging.getLogger(__name__)

class FeedbackLevel(Enum):
    """Feedback severity levels"""
    EXCELLENT = "excellent"
    GOOD = "good"
    WARNING = "warning"
    ERROR = "error"

@dataclass
class FormFeedback:
    """Exercise form feedback"""
    level: FeedbackLevel
    message: str
    suggestion: str
    confidence: float = 1.0

class ExerciseCoach:
    """Base class for exercise-specific coaches"""
    
    def __init__(self, exercise_name: str):
        self.exercise_name = exercise_name
        self.feedback_history = []
        self.last_feedback_time = 0
        self.feedback_cooldown = 2.0  # Seconds between feedback messages
        
    def analyze_form(self, exercise_data: Dict[str, Any], landmarks: List[Any]) -> List[FormFeedback]:
        """Analyze exercise form and return feedback"""
        raise NotImplementedError("Subclasses must implement analyze_form")
    
    def should_give_feedback(self) -> bool:
        """Check if enough time has passed to give new feedback"""
        current_time = time.time()
        return (current_time - self.last_feedback_time) >= self.feedback_cooldown
    
    def add_feedback(self, feedback: FormFeedback):
        """Add feedback to history"""
        if self.should_give_feedback():
            self.feedback_history.append(feedback)
            self.last_feedback_time = time.time()
            logger.info(f"{self.exercise_name} Coach: {feedback.level.value.upper()} - {feedback.message}")

class BicepCurlCoach(ExerciseCoach):
    """AI Coach for bicep curls"""
    
    def __init__(self):
        super().__init__("Bicep Curl")
        self.ideal_range_of_motion = (30, 160)  # Ideal angle range
        self.form_checks = {
            'elbow_stability': True,
            'controlled_movement': True,
            'full_range': True,
            'posture': True
        }
    
    def analyze_form(self, exercise_data: Dict[str, Any], landmarks: List[Any]) -> List[FormFeedback]:
        """Analyze bicep curl form"""
        feedback = []
        
        if not exercise_data or not landmarks:
            return feedback
        
        angle = exercise_data.get('angle', 0)
        stage = exercise_data.get('stage', 'ready')
        
        # Check range of motion
        feedback.extend(self._check_range_of_motion(angle, stage))
        
        # Check elbow position (if landmarks available)
        if len(landmarks) >= 16:
            feedback.extend(self._check_elbow_stability(landmarks))
            feedback.extend(self._check_posture(landmarks))
        
        # Check movement speed
        feedback.extend(self._check_movement_speed(exercise_data))
        
        return feedback
    
    def _check_range_of_motion(self, angle: float, stage: str) -> List[FormFeedback]:
        """Check if user is achieving full range of motion"""
        feedback = []
        
        if stage == "up" and angle > 50:
            feedback.append(FormFeedback(
                level=FeedbackLevel.WARNING,
                message="Curl higher! You're not fully contracting your bicep.",
                suggestion="Bring your wrist closer to your shoulder for maximum muscle activation.",
                confidence=0.8
            ))
        elif stage == "down" and angle < 120:
            feedback.append(FormFeedback(
                level=FeedbackLevel.WARNING,
                message="Extend your arm fully! You're cutting the movement short.",
                suggestion="Lower the weight until your arm is nearly straight for full stretch.",
                confidence=0.8
            ))
        elif stage == "up" and angle < 40:
            feedback.append(FormFeedback(
                level=FeedbackLevel.EXCELLENT,
                message="Perfect curl! Great range of motion.",
                suggestion="Keep maintaining this form for maximum results.",
                confidence=0.9
            ))
        
        return feedback
    
    def _check_elbow_stability(self, landmarks: List[Any]) -> List[FormFeedback]:
        """Check if elbows are stable during movement"""
        feedback = []
        
        try:
            # Get shoulder and elbow positions
            left_shoulder = landmarks[11]
            left_elbow = landmarks[13]
            right_shoulder = landmarks[12]
            right_elbow = landmarks[14]
            
            # Check if elbows are moving too much (simplified check)
            left_elbow_forward = abs(left_elbow.z - left_shoulder.z) > 0.1
            right_elbow_forward = abs(right_elbow.z - right_shoulder.z) > 0.1
            
            if left_elbow_forward or right_elbow_forward:
                feedback.append(FormFeedback(
                    level=FeedbackLevel.WARNING,
                    message="Keep your elbows stable! They're moving too much.",
                    suggestion="Pin your elbows to your sides and only move your forearms.",
                    confidence=0.7
                ))
        except (IndexError, AttributeError):
            pass
        
        return feedback
    
    def _check_posture(self, landmarks: List[Any]) -> List[FormFeedback]:
        """Check overall posture during exercise"""
        feedback = []
        
        try:
            # Check if user is standing straight
            nose = landmarks[0]
            left_hip = landmarks[23]
            right_hip = landmarks[24]
            
            # Simple posture check - head should be above hips
            hip_center_x = (left_hip.x + right_hip.x) / 2
            posture_offset = abs(nose.x - hip_center_x)
            
            if posture_offset > 0.1:
                feedback.append(FormFeedback(
                    level=FeedbackLevel.WARNING,
                    message="Stand up straight! Your posture is leaning.",
                    suggestion="Keep your core engaged and maintain neutral spine alignment.",
                    confidence=0.6
                ))
        except (IndexError, AttributeError):
            pass
        
        return feedback
    
    def _check_movement_speed(self, exercise_data: Dict[str, Any]) -> List[FormFeedback]:
        """Check if movement is controlled"""
        feedback = []
        
        # This would need movement history to properly implement
        # For now, provide general guidance
        stage = exercise_data.get('stage', 'ready')
        
        if stage == "ready":
            feedback.append(FormFeedback(
                level=FeedbackLevel.GOOD,
                message="Control the movement! Don't rush through the exercise.",
                suggestion="Take 2 seconds up, pause, then 2 seconds down for optimal results.",
                confidence=0.5
            ))
        
        return feedback

class SquatCoach(ExerciseCoach):
    """AI Coach for squats"""
    
    def __init__(self):
        super().__init__("Squat")
        self.ideal_depth_angle = 90  # Ideal knee angle at bottom
        self.form_checks = {
            'depth': True,
            'knee_alignment': True,
            'back_straight': True,
            'weight_distribution': True
        }
    
    def analyze_form(self, exercise_data: Dict[str, Any], landmarks: List[Any]) -> List[FormFeedback]:
        """Analyze squat form"""
        feedback = []
        
        if not exercise_data or not landmarks:
            return feedback
        
        angle = exercise_data.get('angle', 180)
        stage = exercise_data.get('stage', 'ready')
        
        # Check squat depth
        feedback.extend(self._check_squat_depth(angle, stage))
        
        # Check knee and back alignment
        if len(landmarks) >= 28:
            feedback.extend(self._check_knee_alignment(landmarks))
            feedback.extend(self._check_back_posture(landmarks))
        
        return feedback
    
    def _check_squat_depth(self, angle: float, stage: str) -> List[FormFeedback]:
        """Check if user is squatting deep enough"""
        feedback = []
        
        if stage == "down":
            if angle > 120:
                feedback.append(FormFeedback(
                    level=FeedbackLevel.WARNING,
                    message="Squat deeper! You're not reaching full depth.",
                    suggestion="Lower until your thighs are parallel to the ground (90° knee angle).",
                    confidence=0.8
                ))
            elif angle < 80:
                feedback.append(FormFeedback(
                    level=FeedbackLevel.WARNING,
                    message="That's very deep! Be careful not to go too low.",
                    suggestion="Stop when thighs are parallel to avoid knee strain.",
                    confidence=0.7
                ))
            elif 90 <= angle <= 110:
                feedback.append(FormFeedback(
                    level=FeedbackLevel.EXCELLENT,
                    message="Perfect squat depth! Great form.",
                    suggestion="Maintain this depth for optimal muscle activation.",
                    confidence=0.9
                ))
        
        return feedback
    
    def _check_knee_alignment(self, landmarks: List[Any]) -> List[FormFeedback]:
        """Check if knees are properly aligned"""
        feedback = []
        
        try:
            left_hip = landmarks[23]
            left_knee = landmarks[25]
            left_ankle = landmarks[27]
            right_hip = landmarks[24]
            right_knee = landmarks[26]
            right_ankle = landmarks[28]
            
            # Check if knees are caving inward (simplified check)
            left_knee_alignment = left_knee.x - left_hip.x
            right_knee_alignment = right_knee.x - right_hip.x
            
            if abs(left_knee_alignment) > 0.1 or abs(right_knee_alignment) > 0.1:
                feedback.append(FormFeedback(
                    level=FeedbackLevel.WARNING,
                    message="Watch your knee alignment! Keep knees over toes.",
                    suggestion="Push your knees out in line with your toes, don't let them cave inward.",
                    confidence=0.7
                ))
        except (IndexError, AttributeError):
            pass
        
        return feedback
    
    def _check_back_posture(self, landmarks: List[Any]) -> List[FormFeedback]:
        """Check back posture during squat"""
        feedback = []
        
        try:
            nose = landmarks[0]
            left_shoulder = landmarks[11]
            right_shoulder = landmarks[12]
            left_hip = landmarks[23]
            right_hip = landmarks[24]
            
            # Check if torso is too forward (simplified)
            shoulder_center_x = (left_shoulder.x + right_shoulder.x) / 2
            hip_center_x = (left_hip.x + right_hip.x) / 2
            
            forward_lean = shoulder_center_x - hip_center_x
            
            if abs(forward_lean) > 0.15:
                feedback.append(FormFeedback(
                    level=FeedbackLevel.WARNING,
                    message="Keep your chest up! You're leaning too far forward.",
                    suggestion="Maintain a proud chest and neutral spine throughout the movement.",
                    confidence=0.6
                ))
        except (IndexError, AttributeError):
            pass
        
        return feedback

class AICoachManager:
    """Manages AI coaches for different exercises"""
    
    def __init__(self):
        self.coaches = {
            'bicep_curl_left': BicepCurlCoach(),
            'bicep_curl_right': BicepCurlCoach(),
            'bicep_curl_both': BicepCurlCoach(),
            'squat': SquatCoach()
        }
        self.current_coach = None
        self.feedback_enabled = True
        self.feedback_buffer = []
        self.max_feedback_buffer = 5
    
    def set_exercise(self, exercise_name: str) -> bool:
        """Set the current exercise and coach"""
        if exercise_name in self.coaches:
            self.current_coach = self.coaches[exercise_name]
            logger.info(f"AI Coach activated for {exercise_name}")
            return True
        else:
            logger.warning(f"No coach available for exercise: {exercise_name}")
            self.current_coach = None
            return False
    
    def analyze_exercise(self, exercise_data: Dict[str, Any], landmarks: List[Any] = None) -> List[FormFeedback]:
        """Analyze current exercise and return feedback"""
        if not self.current_coach or not self.feedback_enabled:
            return []
        
        feedback = self.current_coach.analyze_form(exercise_data, landmarks)
        
        # Add to buffer and manage size
        self.feedback_buffer.extend(feedback)
        if len(self.feedback_buffer) > self.max_feedback_buffer:
            self.feedback_buffer = self.feedback_buffer[-self.max_feedback_buffer:]
        
        return feedback
    
    def get_latest_feedback(self, count: int = 1) -> List[FormFeedback]:
        """Get the latest feedback messages"""
        return self.feedback_buffer[-count:] if self.feedback_buffer else []
    
    def get_exercise_tips(self, exercise_name: str) -> List[str]:
        """Get general tips for an exercise"""
        tips = {
            'bicep_curl_left': [
                "Keep your elbow pinned to your side",
                "Control the weight on the way down",
                "Squeeze at the top of the movement",
                "Don't swing or use momentum"
            ],
            'bicep_curl_right': [
                "Keep your elbow pinned to your side",
                "Control the weight on the way down", 
                "Squeeze at the top of the movement",
                "Don't swing or use momentum"
            ],
            'bicep_curl_both': [
                "Keep both elbows pinned to your sides",
                "Move both arms in sync",
                "Control the weight on the way down",
                "Focus on the muscle contraction"
            ],
            'squat': [
                "Keep your chest up and core engaged",
                "Knees should track over your toes",
                "Descend until thighs are parallel to ground",
                "Drive through your heels to stand up"
            ]
        }
        
        return tips.get(exercise_name, ["Focus on proper form over speed"])
    
    def enable_feedback(self):
        """Enable AI coaching feedback"""
        self.feedback_enabled = True
        logger.info("AI coaching feedback enabled")
    
    def disable_feedback(self):
        """Disable AI coaching feedback"""
        self.feedback_enabled = False
        logger.info("AI coaching feedback disabled")
    
    def reset_feedback(self):
        """Clear feedback history"""
        self.feedback_buffer.clear()
        if self.current_coach:
            self.current_coach.feedback_history.clear()
        logger.info("AI coaching feedback history cleared")
