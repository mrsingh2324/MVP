#!/usr/bin/env python3
"""
Mock database manager for AI Fitness Trainer (bypassing Supabase for demo).
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
import hashlib
import json
from utils.logger import get_logger

logger = get_logger(__name__)


class MockDatabaseManager:
    """
    Mock database manager for demo purposes - stores data in memory.
    """

    def __init__(self):
        """Initialize mock database manager."""
        self.users = {}
        self.workout_sessions = {}
        self.nutrition_data = {}
        self.nutrition_goals = {}
        self.connected = False
        logger.info("🔧 Mock database manager initialized")

    def connect(self, connection_string: str = None) -> bool:
        """Test database connection."""
        try:
            self.connected = True
            logger.info("✅ Mock database connected successfully")
            return True
        except Exception as e:
            logger.error(f"❌ Mock database connection failed: {e}")
            return False

    def close(self):
        """Close database connection."""
        self.connected = False
        logger.info("🔌 Mock database connection closed")

    def get_user_by_phone(self, phone: str) -> Optional[Dict[str, Any]]:
        """Get user by phone number."""
        for user_id, user in self.users.items():
            if user.get('phone') == phone:
                return user
        return None

    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID."""
        return self.users.get(user_id)

    def create_user(self, user_data: Dict[str, Any]) -> Optional[str]:
        """Create a new user."""
        try:
            user_id = f"user_{hashlib.md5(user_data['phone'].encode()).hexdigest()[:8]}"
            user_data['id'] = user_id
            user_data['created_at'] = datetime.now().isoformat()
            user_data['updated_at'] = datetime.now().isoformat()
            
            self.users[user_id] = user_data
            logger.info(f"✅ Mock user created: {user_id}")
            return user_id
        except Exception as e:
            logger.error(f"❌ Error creating mock user: {e}")
            return None

    def update_user(self, user_id: str, update_data: Dict[str, Any]) -> bool:
        """Update user data."""
        try:
            if user_id in self.users:
                self.users[user_id].update(update_data)
                self.users[user_id]['updated_at'] = datetime.now().isoformat()
                logger.info(f"✅ Mock user updated: {user_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"❌ Error updating mock user: {e}")
            return False

    def save_workout_session(self, user_id: str, session_data: Dict[str, Any]) -> Optional[str]:
        """Save workout session."""
        try:
            session_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{user_id[:8]}"
            session_data['id'] = session_id
            session_data['user_id'] = user_id
            session_data['created_at'] = datetime.now().isoformat()
            
            if user_id not in self.workout_sessions:
                self.workout_sessions[user_id] = []
            
            self.workout_sessions[user_id].append(session_data)
            logger.info(f"✅ Mock workout session saved: {session_id}")
            return session_id
        except Exception as e:
            logger.error(f"❌ Error saving mock workout session: {e}")
            return None

    def get_user_workout_history(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get user workout history."""
        try:
            sessions = self.workout_sessions.get(user_id, [])
            # Sort by created_at descending and limit
            sorted_sessions = sorted(sessions, key=lambda x: x.get('created_at', ''), reverse=True)
            return sorted_sessions[:limit]
        except Exception as e:
            logger.error(f"❌ Error getting mock workout history: {e}")
            return []

    def get_daily_nutrition(self, user_id: str, date: str) -> Optional[Dict[str, Any]]:
        """Get daily nutrition data."""
        try:
            user_nutrition = self.nutrition_data.get(user_id, {})
            return user_nutrition.get(date, {
                'date': date,
                'entries': [],
                'total_calories': 0,
                'total_protein': 0,
                'total_carbs': 0,
                'total_fat': 0
            })
        except Exception as e:
            logger.error(f"❌ Error getting mock nutrition data: {e}")
            return None

    def get_nutrition_goals(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get nutrition goals."""
        try:
            return self.nutrition_goals.get(user_id, {
                'daily_calories': 2000,
                'daily_protein': 150,
                'daily_carbs': 250,
                'daily_fat': 65
            })
        except Exception as e:
            logger.error(f"❌ Error getting mock nutrition goals: {e}")
            return None

    def save_nutrition_entry(self, user_id: str, date: str, entry_data: Dict[str, Any]) -> bool:
        """Save nutrition entry."""
        try:
            if user_id not in self.nutrition_data:
                self.nutrition_data[user_id] = {}
            
            if date not in self.nutrition_data[user_id]:
                self.nutrition_data[user_id][date] = {
                    'date': date,
                    'entries': [],
                    'total_calories': 0,
                    'total_protein': 0,
                    'total_carbs': 0,
                    'total_fat': 0
                }
            
            self.nutrition_data[user_id][date]['entries'].append(entry_data)
            
            # Update totals
            day_data = self.nutrition_data[user_id][date]
            day_data['total_calories'] += entry_data.get('calories', 0)
            day_data['total_protein'] += entry_data.get('protein', 0)
            day_data['total_carbs'] += entry_data.get('carbs', 0)
            day_data['total_fat'] += entry_data.get('fat', 0)
            
            logger.info(f"✅ Mock nutrition entry saved for {user_id} on {date}")
            return True
        except Exception as e:
            logger.error(f"❌ Error saving mock nutrition entry: {e}")
            return False


# Create singleton instance
db_manager = MockDatabaseManager()
