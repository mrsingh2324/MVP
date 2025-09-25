#!/usr/bin/env python3
"""
AI Coach Routes with MCP Integration for AI Fitness Trainer.
Provides intelligent chatbot responses with personalized data.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
import random
from datetime import datetime
from mcp.mcp_manager import mcp_coordinator
from services.deepseek_service import deepseek_service
from utils.logger import get_logger

logger = get_logger(__name__)

# Create router
router = APIRouter(prefix="/api/ai-coach", tags=["ai-coach"])


class ChatRequest(BaseModel):
    message: str = Field(..., description="User message to the AI coach")
    session_token: Optional[str] = Field(None, description="Session token (demo_user, admin_user, etc.)")
    user_id: Optional[str] = Field(None, description="User ID for personalized responses")
    session_id: Optional[str] = Field(None, description="Chat session ID")


class ChatResponse(BaseModel):
    response: str
    is_personalized: bool
    context_used: bool
    suggestions: List[str] = []
    session_id: str


class AICoachService:
    """
    AI Coach service with MCP integration for personalized responses.
    """
    
    def __init__(self):
        """Initialize AI Coach service."""
        self.mcp_coordinator = mcp_coordinator
        self.generic_responses = self._load_generic_responses()
        self.quick_suggestions = self._load_quick_suggestions()
    
    def _load_generic_responses(self) -> Dict[str, List[str]]:
        """Load generic responses for common fitness questions."""
        return {
            "protein": [
                "Protein is essential for muscle building and repair. Aim for 0.8-1g per kg of body weight daily.",
                "Good protein sources include lean meats, fish, eggs, dairy, legumes, and protein powders.",
                "Protein helps with muscle recovery after workouts and keeps you feeling full longer."
            ],
            "carbs": [
                "Carbohydrates are your body's primary energy source, especially important for workouts.",
                "Choose complex carbs like oats, quinoa, and sweet potatoes for sustained energy.",
                "Time your carb intake around workouts for optimal performance and recovery."
            ],
            "fat": [
                "Healthy fats are crucial for hormone production and nutrient absorption.",
                "Include sources like avocados, nuts, olive oil, and fatty fish in your diet.",
                "Aim for 20-35% of your daily calories from healthy fats."
            ],
            "water": [
                "Staying hydrated is crucial for performance, recovery, and overall health.",
                "Aim for 8-10 glasses of water daily, more if you're active or in hot weather.",
                "Proper hydration helps with muscle function and nutrient transport."
            ],
            "sleep": [
                "Quality sleep is when your body repairs and builds muscle tissue.",
                "Aim for 7-9 hours of sleep per night for optimal recovery and performance.",
                "Poor sleep can negatively impact your metabolism and workout performance."
            ],
            "motivation": [
                "Remember why you started your fitness journey and celebrate small wins!",
                "Consistency beats perfection - even a short workout is better than none.",
                "Focus on progress, not perfection. Every step forward counts!"
            ],
            "rest": [
                "Rest days are just as important as workout days for muscle growth and recovery.",
                "Listen to your body - fatigue and soreness are signals you need rest.",
                "Active recovery like walking or gentle stretching can be beneficial on rest days."
            ]
        }
    
    def _load_quick_suggestions(self) -> List[str]:
        """Load quick suggestion prompts."""
        return [
            "What did I eat today?",
            "Show me my workout progress",
            "What's my next workout recommendation?",
            "How many calories did I burn this week?",
            "What are my nutrition goals?",
            "Give me a healthy meal suggestion",
            "How's my workout streak?",
            "What's my weekly summary?"
        ]
    
    async def process_message(self, message: str, session_token: Optional[str] = None, user_id: Optional[str] = None, session_id: Optional[str] = None) -> ChatResponse:
        """
        Process user message and generate appropriate response using DeepSeek AI.
        
        Args:
            message: User message
            session_token: Session token for user identification
            user_id: User ID for personalized responses
            session_id: Chat session ID
            
        Returns:
            ChatResponse with AI response
        """
        try:
            # Generate session ID if not provided
            if not session_id:
                session_id = f"chat_{int(datetime.now().timestamp())}"
            
            # Determine user identifier from session_token
            if not user_id and session_token:
                user_id = session_token
            
            # Get context data for personalized responses
            context_data = None
            is_personalized = False
            
            if user_id and user_id != "demo_user":
                try:
                    # Try to get personalized context from MCP
                    query_analysis = self.mcp_coordinator.analyze_query(message, user_id)
                    if query_analysis.get("is_personalized"):
                        context = self.mcp_coordinator.get_context_for_query(message, user_id)
                        if context.get("data"):
                            context_data = self._format_context_for_deepseek(context["data"])
                            is_personalized = True
                except Exception as e:
                    logger.warning(f"Could not get MCP context: {e}")
            
            # Generate response using DeepSeek
            deepseek_response = await deepseek_service.generate_response(
                user_message=message,
                context_data=context_data
            )
            
            if deepseek_response["success"]:
                return ChatResponse(
                    response=deepseek_response["response"],
                    is_personalized=is_personalized or deepseek_response["is_personalized"],
                    context_used=bool(context_data),
                    suggestions=self._get_smart_suggestions(message),
                    session_id=session_id
                )
            else:
                # Fallback to generic response if DeepSeek fails
                return await self._generate_generic_response(message, session_id)
        
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            return ChatResponse(
                response="I'm having trouble processing your request right now. Please try again later. 🤖",
                is_personalized=False,
                context_used=False,
                suggestions=self.quick_suggestions[:4],
                session_id=session_id or f"error_{int(datetime.now().timestamp())}"
            )
    
    async def _generate_personalized_response(self, message: str, user_id: str, session_id: str, query_analysis: Dict[str, Any]) -> ChatResponse:
        """Generate personalized response using MCP data."""
        try:
            # Get context data from MCP servers
            context = self.mcp_coordinator.get_context_for_query(message, user_id)
            
            if not context["data"]:
                # Fallback to generic response if no data available
                fallback_response = await self._generate_generic_response(message, session_id)
                fallback_response.response += "\n\n💡 For personalized insights, make sure to log your workouts and meals!"
                return fallback_response
            
            # Generate response based on query type and context
            response_text = self._create_personalized_response_text(message, context, query_analysis)
            
            # Get relevant suggestions
            suggestions = self._get_contextual_suggestions(query_analysis["query_type"])
            
            return ChatResponse(
                response=response_text,
                is_personalized=True,
                context_used=True,
                suggestions=suggestions,
                session_id=session_id
            )
        
        except Exception as e:
            logger.error(f"Error generating personalized response: {e}")
            # Fallback to generic response
            fallback_response = await self._generate_generic_response(message, session_id)
            fallback_response.response += "\n\n⚠️ I couldn't access your personal data right now, but here's some general advice!"
            return fallback_response
    
    async def _generate_generic_response(self, message: str, session_id: str) -> ChatResponse:
        """Generate generic response for non-personalized queries."""
        message_lower = message.lower()
        
        # Find matching topic
        response_text = "I'm here to help with your fitness journey! "
        
        for topic, responses in self.generic_responses.items():
            if topic in message_lower:
                response_text = random.choice(responses)
                break
        else:
            # Default responses for unmatched queries
            if any(word in message_lower for word in ["hello", "hi", "hey"]):
                response_text = "Hello! I'm your AI fitness coach. How can I help you reach your fitness goals today?"
            elif any(word in message_lower for word in ["help", "what", "how"]):
                response_text = "I can help you with workout advice, nutrition guidance, and motivation! Ask me about your progress, meal recommendations, or fitness tips."
            elif any(word in message_lower for word in ["thanks", "thank you"]):
                response_text = "You're welcome! Keep up the great work on your fitness journey! 💪"
            else:
                response_text = "That's a great question! I'm here to help with fitness, nutrition, and wellness advice. What specific area would you like to focus on?"
        
        return ChatResponse(
            response=response_text,
            is_personalized=False,
            context_used=False,
            suggestions=random.sample(self.quick_suggestions, 4),
            session_id=session_id
        )
    
    def _create_personalized_response_text(self, message: str, context: Dict[str, Any], query_analysis: Dict[str, Any]) -> str:
        """Create personalized response text based on context data."""
        query_type = query_analysis.get("query_type", "general")
        
        if query_type == "profile":
            return self._create_profile_response(context)
        elif query_type == "dashboard":
            return self._create_dashboard_response(context)
        elif query_type == "workout":
            return self._create_workout_response(context)
        elif query_type == "nutrition":
            return self._create_nutrition_response(context)
        else:
            return self._create_general_personalized_response(context)
    
    def _create_profile_response(self, context: Dict[str, Any]) -> str:
        """Create response for profile-related queries."""
        profile_data = context["data"].get("profileServer", {}).get("data", {})
        
        if "summary" in profile_data:
            return f"Here's your profile information:\n\n{profile_data['summary']}\n\nIs there anything specific about your profile you'd like to update or discuss?"
        
        # Handle structured profile data
        if "basic_info" in profile_data:
            basic = profile_data["basic_info"]
            physical = profile_data.get("physical_stats", {})
            goals = profile_data.get("fitness_goals", {})
            
            response_parts = ["Here's your current profile:"]
            
            if basic.get("name"):
                response_parts.append(f"👤 Name: {basic['name']}")
            if basic.get("age"):
                response_parts.append(f"🎂 Age: {basic['age']} years")
            if physical.get("weight"):
                response_parts.append(f"⚖️ Weight: {physical['weight']} kg")
            if physical.get("height"):
                response_parts.append(f"📏 Height: {physical['height']} cm")
            if physical.get("bmi"):
                response_parts.append(f"📊 BMI: {physical['bmi']} ({physical.get('bmi_category', '')})")
            if goals.get("primary_goal"):
                response_parts.append(f"🎯 Fitness Goal: {goals['primary_goal']}")
            
            return "\n".join(response_parts)
        
        return "I'd be happy to help with your profile! It looks like we need to set up some basic information first."
    
    def _create_dashboard_response(self, context: Dict[str, Any]) -> str:
        """Create response for dashboard/stats queries."""
        dashboard_data = context["data"].get("dashboardServer", {}).get("data", {})
        
        if "overview" in dashboard_data:
            return f"{dashboard_data['overview']}\n\nKeep up the great work! 💪"
        
        # Handle structured dashboard data
        if "workouts" in dashboard_data:
            workouts = dashboard_data["workouts"]
            nutrition = dashboard_data.get("nutrition", {})
            
            response_parts = ["Here's your progress summary:"]
            
            if "sessions_completed" in workouts:
                response_parts.append(f"🏋️ Workouts today: {workouts['sessions_completed']}")
            if "total_reps" in workouts:
                response_parts.append(f"💪 Total reps: {workouts['total_reps']}")
            if "calories_burned" in workouts:
                response_parts.append(f"🔥 Calories burned: {workouts['calories_burned']}")
            if "calories_consumed" in nutrition:
                response_parts.append(f"🍽️ Calories consumed: {nutrition['calories_consumed']}")
            
            return "\n".join(response_parts) + "\n\nYou're making great progress!"
        
        return "Let me help you track your progress! Start by logging some workouts and meals."
    
    def _create_workout_response(self, context: Dict[str, Any]) -> str:
        """Create response for workout-related queries."""
        workout_data = context["data"].get("workoutServer", {}).get("data", {})
        
        if "overview" in workout_data:
            return f"{workout_data['overview']}\n\nReady for your next workout? 💪"
        
        # Handle workout recommendations
        if "recommended_exercises" in workout_data:
            exercises = workout_data["recommended_exercises"]
            duration = workout_data.get("recommended_duration_minutes", 20)
            
            response_parts = ["Here's your personalized workout recommendation:"]
            response_parts.append(f"🎯 Recommended exercises: {', '.join(exercises)}")
            response_parts.append(f"⏱️ Target duration: {duration} minutes")
            
            if "target_reps" in workout_data:
                response_parts.append("🔢 Target reps:")
                for exercise, reps in workout_data["target_reps"].items():
                    response_parts.append(f"  • {exercise}: {reps} reps")
            
            return "\n".join(response_parts) + "\n\nReady to crush this workout? 🚀"
        
        # Handle workout history
        if "sessions" in workout_data:
            sessions = workout_data["sessions"]
            if sessions:
                last_workout = sessions[0]
                return f"Your last workout was on {last_workout['date']} - you did {last_workout['total_reps']} reps in {last_workout['duration_minutes']} minutes! Great job! 🎉"
        
        return "Let's get you moving! I can help you plan your next workout or review your progress."
    
    def _create_nutrition_response(self, context: Dict[str, Any]) -> str:
        """Create response for nutrition-related queries."""
        nutrition_data = context["data"].get("nutritionServer", {}).get("data", {})
        
        if "overview" in nutrition_data:
            return f"{nutrition_data['overview']}\n\nKeep up the healthy eating! 🥗"
        
        # Handle today's meals
        if "nutrition_summary" in nutrition_data:
            summary = nutrition_data["nutrition_summary"]
            meals_logged = nutrition_data.get("meals_logged", 0)
            
            response_parts = ["Here's your nutrition summary for today:"]
            response_parts.append(f"🍽️ Meals logged: {meals_logged}")
            response_parts.append(f"🔥 Calories: {summary.get('calories', 0)}")
            response_parts.append(f"🥩 Protein: {summary.get('protein', 0)}g")
            response_parts.append(f"🍞 Carbs: {summary.get('carbs', 0)}g")
            response_parts.append(f"🥑 Fat: {summary.get('fat', 0)}g")
            
            return "\n".join(response_parts) + "\n\nHow are you feeling about your nutrition today?"
        
        # Handle meal recommendations
        if "meal_suggestions" in nutrition_data:
            goal = nutrition_data.get("fitness_goal_focus", "balanced")
            suggestions = nutrition_data["meal_suggestions"]
            
            response_parts = [f"Based on your {goal} goals, here are some meal ideas:"]
            
            for meal_type, meals in suggestions.items():
                response_parts.append(f"\n🍳 {meal_type.title()}:")
                for meal in meals[:2]:  # Show top 2 suggestions
                    response_parts.append(f"  • {meal}")
            
            return "\n".join(response_parts) + "\n\nWhich meal sounds good to you?"
        
        return "Let's talk nutrition! I can help you track meals, set goals, or suggest healthy options."
    
    def _create_general_personalized_response(self, context: Dict[str, Any]) -> str:
        """Create general personalized response when query type is unclear."""
        response_parts = ["Based on your data, here's what I can tell you:"]
        
        # Try to extract key information from any available context
        for server_name, server_data in context["data"].items():
            if server_data and server_data.get("success"):
                data = server_data.get("data", {})
                if "overview" in data:
                    response_parts.append(f"\n{data['overview']}")
                    break
        
        if len(response_parts) == 1:
            return "I'm here to help with your fitness journey! Ask me about your workouts, nutrition, or progress."
        
        return "\n".join(response_parts) + "\n\nWhat would you like to focus on today?"
    
    def _get_contextual_suggestions(self, query_type: str) -> List[str]:
        """Get contextual suggestions based on query type."""
        suggestions_map = {
            "profile": [
                "Update my fitness goals",
                "What's my BMI?",
                "Show my profile completion",
                "How can I improve my profile?"
            ],
            "dashboard": [
                "Show my weekly progress",
                "What's my workout streak?",
                "How many calories did I burn today?",
                "Give me my monthly summary"
            ],
            "workout": [
                "What's my next workout?",
                "Show my workout history",
                "Give me a weekly workout plan",
                "How's my performance trending?"
            ],
            "nutrition": [
                "What did I eat today?",
                "Give me meal recommendations",
                "How am I doing with my nutrition goals?",
                "Show my weekly nutrition summary"
            ]
        }
        
        return suggestions_map.get(query_type, random.sample(self.quick_suggestions, 4))
    
    def _format_context_for_deepseek(self, mcp_data: Dict[str, Any]) -> Dict[str, Any]:
        """Format MCP data for DeepSeek context."""
        context = {}
        
        # Extract profile data
        if "profileServer" in mcp_data:
            profile_data = mcp_data["profileServer"].get("data", {})
            if profile_data:
                context["profile"] = profile_data
        
        # Extract workout data
        if "workoutServer" in mcp_data:
            workout_data = mcp_data["workoutServer"].get("data", {})
            if workout_data and "sessions" in workout_data:
                context["workouts"] = workout_data["sessions"][:5]  # Last 5 workouts
        
        # Extract nutrition data
        if "nutritionServer" in mcp_data:
            nutrition_data = mcp_data["nutritionServer"].get("data", {})
            if nutrition_data:
                context["nutrition"] = nutrition_data
        
        # Extract dashboard stats
        if "dashboardServer" in mcp_data:
            dashboard_data = mcp_data["dashboardServer"].get("data", {})
            if dashboard_data:
                context["stats"] = dashboard_data
        
        return context
    
    def _get_smart_suggestions(self, message: str) -> List[str]:
        """Generate smart suggestions based on the user's message."""
        message_lower = message.lower()
        
        if any(word in message_lower for word in ["workout", "exercise", "training"]):
            return [
                "What's my next workout recommendation?",
                "Show me my workout history",
                "How's my performance trending?",
                "Give me a weekly workout plan"
            ]
        elif any(word in message_lower for word in ["nutrition", "food", "eat", "meal"]):
            return [
                "What did I eat today?",
                "Give me meal recommendations",
                "How am I doing with my nutrition goals?",
                "Show my weekly nutrition summary"
            ]
        elif any(word in message_lower for word in ["progress", "stats", "summary"]):
            return [
                "Show my weekly progress",
                "What's my workout streak?",
                "How many calories did I burn today?",
                "Give me my monthly summary"
            ]
        else:
            return random.sample(self.quick_suggestions, 4)


# Initialize AI Coach service
ai_coach_service = AICoachService()


@router.post("/chat", response_model=ChatResponse)
async def chat_with_ai_coach(request: ChatRequest):
    """
    Chat with AI coach - supports both generic and personalized responses using DeepSeek AI.
    """
    try:
        response = await ai_coach_service.process_message(
            message=request.message,
            session_token=request.session_token,
            user_id=request.user_id,
            session_id=request.session_id
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suggestions")
async def get_quick_suggestions():
    """
    Get quick suggestion prompts for the chat interface.
    """
    try:
        return {
            "success": True,
            "data": {
                "suggestions": ai_coach_service.quick_suggestions,
                "total": len(ai_coach_service.quick_suggestions)
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting suggestions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def get_ai_coach_health():
    """
    Get AI coach service health status.
    """
    try:
        mcp_health = ai_coach_service.mcp_coordinator.get_health_status()
        
        return {
            "success": True,
            "data": {
                "ai_coach_status": "healthy",
                "mcp_integration": "enabled",
                "mcp_servers_health": mcp_health,
                "generic_responses_loaded": len(ai_coach_service.generic_responses),
                "quick_suggestions_loaded": len(ai_coach_service.quick_suggestions)
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting AI coach health: {e}")
        raise HTTPException(status_code=500, detail=str(e))
