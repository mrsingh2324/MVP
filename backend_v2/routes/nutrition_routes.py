#!/usr/bin/env python3
"""
FastAPI routes for nutrition tracking.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from datetime import datetime, date
import time
from utils.logger import get_logger

logger = get_logger(__name__)

# Create router
router = APIRouter(prefix="/api/nutrition", tags=["nutrition"])

# In-memory storage for demo (replace with database in production)
nutrition_db = {}
daily_targets = {}

class FoodEntry(BaseModel):
    name: str = Field(..., description="Name of the food item")
    calories: float = Field(..., description="Calories per serving")
    protein: float = Field(default=0, description="Protein in grams")
    carbs: float = Field(default=0, description="Carbohydrates in grams")
    fats: float = Field(default=0, description="Fats in grams")
    servings: float = Field(default=1, description="Number of servings")
    meal_type: str = Field(default="snack", description="breakfast, lunch, dinner, snack")

class DailyTargets(BaseModel):
    calories: float = Field(..., description="Daily calorie target")
    protein: float = Field(..., description="Daily protein target in grams")
    carbs: float = Field(..., description="Daily carbs target in grams")
    fats: float = Field(..., description="Daily fats target in grams")

class NutritionGoals(BaseModel):
    fitness_goal: str = Field(..., description="bulk, lean, weight_loss, balanced")
    weight: float = Field(..., description="Current weight in kg")
    height: float = Field(..., description="Height in cm")
    age: int = Field(..., description="Age in years")
    gender: str = Field(..., description="male or female")
    activity_level: str = Field(default="moderate", description="sedentary, light, moderate, active, very_active")

def calculate_bmr(weight: float, height: float, age: int, gender: str) -> float:
    """Calculate Basal Metabolic Rate using Mifflin-St Jeor Equation"""
    if gender.lower() == "male":
        return 10 * weight + 6.25 * height - 5 * age + 5
    else:
        return 10 * weight + 6.25 * height - 5 * age - 161

def calculate_daily_targets(goals: NutritionGoals) -> DailyTargets:
    """Calculate daily nutrition targets based on goals"""
    bmr = calculate_bmr(goals.weight, goals.height, goals.age, goals.gender)
    
    # Activity multipliers
    activity_multipliers = {
        "sedentary": 1.2,
        "light": 1.375,
        "moderate": 1.55,
        "active": 1.725,
        "very_active": 1.9
    }
    
    tdee = bmr * activity_multipliers.get(goals.activity_level, 1.55)
    
    # Adjust calories based on fitness goal
    if goals.fitness_goal == "weight_loss":
        calories = tdee - 500  # 500 calorie deficit
        protein_ratio = 0.35
        carbs_ratio = 0.35
        fats_ratio = 0.30
    elif goals.fitness_goal == "bulk":
        calories = tdee + 300  # 300 calorie surplus
        protein_ratio = 0.25
        carbs_ratio = 0.45
        fats_ratio = 0.30
    elif goals.fitness_goal == "lean":
        calories = tdee - 200  # Small deficit
        protein_ratio = 0.40
        carbs_ratio = 0.30
        fats_ratio = 0.30
    else:  # balanced
        calories = tdee
        protein_ratio = 0.30
        carbs_ratio = 0.40
        fats_ratio = 0.30
    
    # Calculate macros (protein: 4 cal/g, carbs: 4 cal/g, fats: 9 cal/g)
    protein = (calories * protein_ratio) / 4
    carbs = (calories * carbs_ratio) / 4
    fats = (calories * fats_ratio) / 9
    
    return DailyTargets(
        calories=round(calories),
        protein=round(protein, 1),
        carbs=round(carbs, 1),
        fats=round(fats, 1)
    )

@router.post("/set-goals")
async def set_nutrition_goals(session_token: str, goals: NutritionGoals):
    """Set nutrition goals and calculate daily targets"""
    try:
        # In a real app, validate session_token
        user_id = session_token  # Simplified for demo
        
        targets = calculate_daily_targets(goals)
        daily_targets[user_id] = targets.dict()
        
        logger.info(f"Nutrition goals set for user: {user_id}")
        
        return {
            "success": True,
            "message": "Nutrition goals set successfully",
            "daily_targets": targets.dict(),
            "bmr": calculate_bmr(goals.weight, goals.height, goals.age, goals.gender)
        }
        
    except Exception as e:
        logger.error(f"Error setting nutrition goals: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/targets")
async def get_daily_targets(session_token: str):
    """Get daily nutrition targets for user"""
    try:
        user_id = session_token  # Simplified for demo
        
        if user_id not in daily_targets:
            # Return default targets
            return {
                "success": True,
                "targets": {
                    "calories": 2000,
                    "protein": 150,
                    "carbs": 200,
                    "fats": 67
                },
                "has_custom_targets": False
            }
        
        return {
            "success": True,
            "targets": daily_targets[user_id],
            "has_custom_targets": True
        }
        
    except Exception as e:
        logger.error(f"Error getting daily targets: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/log-food")
async def log_food(session_token: str, food: FoodEntry):
    """Log a food entry"""
    try:
        user_id = session_token  # Simplified for demo
        today = date.today().isoformat()
        
        if user_id not in nutrition_db:
            nutrition_db[user_id] = {}
        
        if today not in nutrition_db[user_id]:
            nutrition_db[user_id][today] = []
        
        # Calculate total nutrition for this entry
        total_calories = food.calories * food.servings
        total_protein = food.protein * food.servings
        total_carbs = food.carbs * food.servings
        total_fats = food.fats * food.servings
        
        entry = {
            "id": int(time.time() * 1000),  # Simple ID generation
            "name": food.name,
            "calories": total_calories,
            "protein": total_protein,
            "carbs": total_carbs,
            "fats": total_fats,
            "servings": food.servings,
            "meal_type": food.meal_type,
            "logged_at": datetime.now().isoformat()
        }
        
        nutrition_db[user_id][today].append(entry)
        
        logger.info(f"Food logged for user {user_id}: {food.name}")
        
        return {
            "success": True,
            "message": "Food logged successfully",
            "entry": entry
        }
        
    except Exception as e:
        logger.error(f"Error logging food: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/daily-summary")
async def get_daily_summary(session_token: str, date_str: Optional[str] = None):
    """Get daily nutrition summary"""
    try:
        user_id = session_token  # Simplified for demo
        target_date = date_str or date.today().isoformat()
        
        # Get daily entries
        entries = []
        if user_id in nutrition_db and target_date in nutrition_db[user_id]:
            entries = nutrition_db[user_id][target_date]
        
        # Calculate totals
        total_calories = sum(entry["calories"] for entry in entries)
        total_protein = sum(entry["protein"] for entry in entries)
        total_carbs = sum(entry["carbs"] for entry in entries)
        total_fats = sum(entry["fats"] for entry in entries)
        
        # Get targets
        targets = daily_targets.get(user_id, {
            "calories": 2000,
            "protein": 150,
            "carbs": 200,
            "fats": 67
        })
        
        # Calculate progress percentages
        progress = {
            "calories": min(100, (total_calories / targets["calories"]) * 100) if targets["calories"] > 0 else 0,
            "protein": min(100, (total_protein / targets["protein"]) * 100) if targets["protein"] > 0 else 0,
            "carbs": min(100, (total_carbs / targets["carbs"]) * 100) if targets["carbs"] > 0 else 0,
            "fats": min(100, (total_fats / targets["fats"]) * 100) if targets["fats"] > 0 else 0
        }
        
        # Group entries by meal type
        meals = {
            "breakfast": [e for e in entries if e["meal_type"] == "breakfast"],
            "lunch": [e for e in entries if e["meal_type"] == "lunch"],
            "dinner": [e for e in entries if e["meal_type"] == "dinner"],
            "snack": [e for e in entries if e["meal_type"] == "snack"]
        }
        
        return {
            "success": True,
            "date": target_date,
            "totals": {
                "calories": round(total_calories, 1),
                "protein": round(total_protein, 1),
                "carbs": round(total_carbs, 1),
                "fats": round(total_fats, 1)
            },
            "targets": targets,
            "progress": {k: round(v, 1) for k, v in progress.items()},
            "remaining": {
                "calories": max(0, targets["calories"] - total_calories),
                "protein": max(0, targets["protein"] - total_protein),
                "carbs": max(0, targets["carbs"] - total_carbs),
                "fats": max(0, targets["fats"] - total_fats)
            },
            "meals": meals,
            "total_entries": len(entries)
        }
        
    except Exception as e:
        logger.error(f"Error getting daily summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/delete-entry/{entry_id}")
async def delete_food_entry(session_token: str, entry_id: int):
    """Delete a food entry"""
    try:
        user_id = session_token  # Simplified for demo
        today = date.today().isoformat()
        
        if user_id not in nutrition_db or today not in nutrition_db[user_id]:
            raise HTTPException(status_code=404, detail="Entry not found")
        
        entries = nutrition_db[user_id][today]
        entry_index = None
        
        for i, entry in enumerate(entries):
            if entry["id"] == entry_id:
                entry_index = i
                break
        
        if entry_index is None:
            raise HTTPException(status_code=404, detail="Entry not found")
        
        deleted_entry = entries.pop(entry_index)
        
        logger.info(f"Food entry deleted for user {user_id}: {deleted_entry['name']}")
        
        return {
            "success": True,
            "message": "Food entry deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting food entry: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/food-database")
async def search_food_database(query: str):
    """Search food database (simplified for demo)"""
    try:
        # Simple food database for demo
        foods = [
            {"name": "Chicken Breast (100g)", "calories": 165, "protein": 31, "carbs": 0, "fats": 3.6},
            {"name": "Brown Rice (1 cup)", "calories": 216, "protein": 5, "carbs": 45, "fats": 1.8},
            {"name": "Broccoli (1 cup)", "calories": 25, "protein": 3, "carbs": 5, "fats": 0.3},
            {"name": "Salmon (100g)", "calories": 208, "protein": 22, "carbs": 0, "fats": 12},
            {"name": "Oats (1 cup)", "calories": 307, "protein": 11, "carbs": 55, "fats": 5.3},
            {"name": "Banana (1 medium)", "calories": 105, "protein": 1.3, "carbs": 27, "fats": 0.4},
            {"name": "Eggs (1 large)", "calories": 70, "protein": 6, "carbs": 0.6, "fats": 5},
            {"name": "Greek Yogurt (1 cup)", "calories": 130, "protein": 23, "carbs": 9, "fats": 0},
            {"name": "Almonds (28g)", "calories": 164, "protein": 6, "carbs": 6, "fats": 14},
            {"name": "Sweet Potato (1 medium)", "calories": 112, "protein": 2, "carbs": 26, "fats": 0.1}
        ]
        
        # Filter foods based on query
        query_lower = query.lower()
        filtered_foods = [
            food for food in foods 
            if query_lower in food["name"].lower()
        ]
        
        return {
            "success": True,
            "foods": filtered_foods[:10],  # Limit to 10 results
            "total_found": len(filtered_foods)
        }
        
    except Exception as e:
        logger.error(f"Error searching food database: {e}")
        raise HTTPException(status_code=500, detail=str(e))
