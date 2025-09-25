#!/usr/bin/env python3
"""
FastAPI routes for workout session management.
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional
from modules.workout_session import session_manager
from utils.logger import get_logger

logger = get_logger(__name__)

# Create router
router = APIRouter(prefix="/api/session", tags=["session"])


@router.post("/start")
async def start_workout_session(session_id: Optional[str] = None):
    """
    Start a new workout session.
    
    Args:
        session_id: Optional custom session ID
        
    Returns:
        Session start confirmation with session ID
    """
    try:
        new_session_id = session_manager.start_session(session_id)
        logger.info(f"Started workout session: {new_session_id}")
        
        return {
            "success": True,
            "session_id": new_session_id,
            "message": "Workout session started successfully"
        }
        
    except Exception as e:
        logger.error(f"Error starting workout session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/end")
async def end_workout_session():
    """
    End the current workout session and get summary.
    
    Returns:
        Session summary with statistics and recommendations
    """
    try:
        summary = session_manager.end_current_session()
        
        if summary is None:
            return {
                "success": False,
                "message": "No active session to end"
            }
        
        logger.info(f"Ended workout session: {summary.get('session_id')}")
        
        return {
            "success": True,
            "summary": summary,
            "message": "Workout session ended successfully"
        }
        
    except Exception as e:
        logger.error(f"Error ending workout session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/end/{session_id}")
async def end_specific_session(session_id: str):
    """
    End a specific workout session by ID.
    
    Args:
        session_id: Session ID to end
        
    Returns:
        Session summary with statistics and recommendations
    """
    try:
        # For now, just end the current session since we don't track multiple sessions
        summary = session_manager.end_current_session()
        
        if summary is None:
            return {
                "success": False,
                "message": "No active session to end"
            }
        
        logger.info(f"Ended workout session: {session_id}")
        
        return {
            "success": True,
            "summary": summary,
            "message": f"Workout session {session_id} ended successfully"
        }
        
    except Exception as e:
        logger.error(f"Error ending workout session {session_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/current")
async def get_current_session():
    """
    Get current session information and live summary.
    
    Returns:
        Current session data or null if no active session
    """
    try:
        summary = session_manager.get_current_session_summary()
        
        return {
            "success": True,
            "current_session": summary,
            "has_active_session": summary is not None and summary.get("is_active", False)
        }
        
    except Exception as e:
        logger.error(f"Error getting current session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_session_history():
    """
    Get workout session history.
    
    Returns:
        List of previous workout sessions
    """
    try:
        history = session_manager.get_session_history()
        
        return {
            "success": True,
            "sessions": history,
            "total_sessions": len(history)
        }
        
    except Exception as e:
        logger.error(f"Error getting session history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rep/{exercise_name}")
async def add_rep_to_session(exercise_name: str):
    """
    Add a completed rep to the current session.
    
    Args:
        exercise_name: Name of the exercise
        
    Returns:
        Confirmation of rep addition
    """
    try:
        session_manager.increment_rep(exercise_name)
        
        # Get updated session info
        current_session = session_manager.get_current_session_summary()
        
        return {
            "success": True,
            "exercise": exercise_name,
            "message": "Rep added to session",
            "current_session": current_session
        }
        
    except Exception as e:
        logger.error(f"Error adding rep to session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_session_stats():
    """
    Get aggregated statistics across all sessions.
    
    Returns:
        Overall workout statistics and trends
    """
    try:
        history = session_manager.get_session_history()
        current = session_manager.get_current_session_summary()
        
        # Calculate aggregate stats
        total_sessions = len(history)
        total_reps_all_time = sum(session.get("total_reps", 0) for session in history)
        total_calories_all_time = sum(session.get("calories_estimate", 0) for session in history)
        total_duration_all_time = sum(session.get("duration_minutes", 0) for session in history)
        
        # Add current session if active
        if current and current.get("is_active"):
            total_reps_all_time += current.get("total_reps", 0)
            total_calories_all_time += current.get("calories_estimate", 0)
            total_duration_all_time += current.get("duration_minutes", 0)
        
        # Calculate averages
        avg_reps_per_session = round(total_reps_all_time / max(total_sessions, 1), 1)
        avg_duration_per_session = round(total_duration_all_time / max(total_sessions, 1), 1)
        avg_calories_per_session = round(total_calories_all_time / max(total_sessions, 1), 1)
        
        # Find most popular exercises
        exercise_counts = {}
        for session in history:
            for exercise in session.get("exercises_performed", {}):
                exercise_counts[exercise] = exercise_counts.get(exercise, 0) + 1
        
        most_popular_exercises = sorted(exercise_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        
        stats = {
            "total_sessions": total_sessions,
            "total_reps_all_time": total_reps_all_time,
            "total_calories_all_time": round(total_calories_all_time, 1),
            "total_duration_all_time": round(total_duration_all_time, 1),
            "averages": {
                "reps_per_session": avg_reps_per_session,
                "duration_per_session": avg_duration_per_session,
                "calories_per_session": avg_calories_per_session
            },
            "most_popular_exercises": [{"exercise": ex, "sessions": count} for ex, count in most_popular_exercises],
            "current_session_active": current is not None and current.get("is_active", False)
        }
        
        return {
            "success": True,
            "stats": stats
        }
        
    except Exception as e:
        logger.error(f"Error getting session stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
