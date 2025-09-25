#!/usr/bin/env python3
"""
FastAPI routes for exercise detection endpoints.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import Dict, Any, Optional
import cv2
import numpy as np
from PIL import Image
import io

from modules.exercise.tracker import exercise_tracker
from modules.utils.mediapipe_utils import MediaPipeProcessor
from modules.utils.image_utils import base64_to_numpy, numpy_to_base64, validate_image, create_overlay_image
from modules.workout_session import session_manager
from utils.logger import get_logger

logger = get_logger(__name__)

# Create router
router = APIRouter(prefix="/api/exercise", tags=["exercise"])

# Initialize MediaPipe processor
mp_processor = MediaPipeProcessor()


@router.get("/exercises")
async def get_available_exercises():
    """
    Get list of available exercises.
    
    Returns:
        List of available exercise names
    """
    try:
        exercises = exercise_tracker.get_available_exercises()
        return {
            "success": True,
            "exercises": exercises,
            "count": len(exercises)
        }
    except Exception as e:
        logger.error(f"Error getting available exercises: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/select/{exercise_name}")
async def select_exercise(exercise_name: str):
    """
    Select and load a specific exercise.
    
    Args:
        exercise_name: Name of the exercise to select and load
        
    Returns:
        Selection confirmation and exercise info
    """
    try:
        # Validate exercise name
        available_exercises = exercise_tracker.get_available_exercises()
        if exercise_name not in available_exercises:
            raise HTTPException(
                status_code=400, 
                detail=f"Unknown exercise: {exercise_name}. Available: {available_exercises}"
            )
        
        # Load the exercise
        success = exercise_tracker.load_exercise(exercise_name)
        
        if success:
            logger.info(f"Successfully selected and loaded exercise: {exercise_name}")
            return {
                "success": True,
                "exercise": exercise_name,
                "message": f"Exercise {exercise_name} selected and loaded successfully",
                "loaded": True
            }
        else:
            return {
                "success": False,
                "exercise": exercise_name,
                "message": f"Failed to load exercise {exercise_name}",
                "loaded": False
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error selecting exercise {exercise_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze/{exercise_name}")
async def analyze_exercise(
    exercise_name: str,
    image_file: UploadFile = File(None),
    image_data: str = Form(None)
):
    """
    Analyze an image for exercise detection.
    
    Args:
        exercise_name: Name of the exercise to analyze
        image_file: Uploaded image file (optional)
        image_data: Base64 encoded image data (optional)
        
    Returns:
        Exercise analysis results
    """
    try:
        # Validate exercise name
        available_exercises = exercise_tracker.get_available_exercises()
        if exercise_name not in available_exercises:
            raise HTTPException(
                status_code=400, 
                detail=f"Unknown exercise: {exercise_name}. Available: {available_exercises}"
            )
        
        # Get image data
        image = None
        
        if image_file:
            # Process uploaded file
            contents = await image_file.read()
            pil_image = Image.open(io.BytesIO(contents))
            image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
            
        elif image_data:
            # Process base64 data
            image = base64_to_numpy(image_data)
            
        else:
            raise HTTPException(status_code=400, detail="No image data provided")
        
        # Validate image
        if not validate_image(image):
            raise HTTPException(status_code=400, detail="Invalid image format")
        
        # Extract landmarks
        landmarks = mp_processor.extract_landmarks(image)
        
        if landmarks is None:
            return {
                "success": False,
                "exercise": exercise_name,
                "reps": 0,
                "stage": "no_pose",
                "message": "No pose detected in image"
            }
        
        # Analyze exercise
        result = exercise_tracker.analyze_frame(exercise_name, landmarks)
        
        # Track in session if rep was completed
        if result.get("rep_completed", False):
            session_manager.increment_rep(exercise_name)
        
        # Add exercise data to session (for tracking stages/angles)
        session_manager.add_rep(exercise_name, result.get("stage"), result.get("angle"))
        
        # Create visualization (optional)
        try:
            # Draw landmarks on image
            annotated_image = mp_processor.draw_landmarks(image.copy(), landmarks)
            
            # Add exercise overlay
            overlay_info = {
                "Exercise": result.get("exercise", exercise_name),
                "Reps": result.get("reps", 0),
                "Stage": result.get("stage", "unknown")
            }
            
            if "angle" in result and result["angle"] is not None:
                overlay_info["Angle"] = f"{result['angle']:.1f}°"
            
            annotated_image = create_overlay_image(annotated_image, overlay_info)
            
            # Convert back to base64
            processed_image = numpy_to_base64(annotated_image)
            result["processed_image"] = processed_image
            
        except Exception as viz_error:
            logger.warning(f"Error creating visualization: {viz_error}")
            result["processed_image"] = None
        
        # Format response
        response = {
            "success": True,
            "exercise": result.get("exercise", exercise_name),
            "reps": result.get("reps", 0),
            "stage": result.get("stage", "unknown")
        }
        
        # Add optional fields
        if "angle" in result:
            response["angle"] = result["angle"]
        if "rep_completed" in result:
            response["rep_completed"] = result["rep_completed"]
        if "processed_image" in result:
            response["processed_image"] = result["processed_image"]
        if "error" in result:
            response["error"] = result["error"]
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing exercise {exercise_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reset/{exercise_name}")
async def reset_exercise(exercise_name: str):
    """
    Reset counters for a specific exercise.
    
    Args:
        exercise_name: Name of the exercise to reset
        
    Returns:
        Reset confirmation
    """
    try:
        # Validate exercise name
        available_exercises = exercise_tracker.get_available_exercises()
        if exercise_name not in available_exercises:
            raise HTTPException(
                status_code=400, 
                detail=f"Unknown exercise: {exercise_name}. Available: {available_exercises}"
            )
        
        # Reset exercise
        success = exercise_tracker.reset_exercise(exercise_name)
        
        if success:
            return {
                "success": True,
                "exercise": exercise_name,
                "message": f"Exercise {exercise_name} reset successfully"
            }
        else:
            return {
                "success": False,
                "exercise": exercise_name,
                "message": f"Exercise {exercise_name} was not loaded, nothing to reset"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resetting exercise {exercise_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/{exercise_name}")
async def get_exercise_stats(exercise_name: str):
    """
    Get statistics for a specific exercise.
    
    Args:
        exercise_name: Name of the exercise
        
    Returns:
        Exercise statistics
    """
    try:
        # Validate exercise name
        available_exercises = exercise_tracker.get_available_exercises()
        if exercise_name not in available_exercises:
            raise HTTPException(
                status_code=400, 
                detail=f"Unknown exercise: {exercise_name}. Available: {available_exercises}"
            )
        
        # Get stats
        stats = exercise_tracker.get_exercise_stats(exercise_name)
        
        if stats is None:
            return {
                "success": False,
                "exercise": exercise_name,
                "message": "Exercise not loaded or no data available"
            }
        
        return {
            "success": True,
            "exercise": exercise_name,
            "stats": stats
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting stats for exercise {exercise_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_all_exercise_stats():
    """
    Get statistics for all loaded exercises.
    
    Returns:
        All exercise statistics
    """
    try:
        stats = exercise_tracker.get_all_stats()
        
        return {
            "success": True,
            "stats": stats,
            "loaded_exercises": list(stats.keys())
        }
        
    except Exception as e:
        logger.error(f"Error getting all exercise stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/test")
async def test_endpoint():
    """
    Test endpoint to verify the API is working.
    
    Returns:
        Test response
    """
    return {
        "success": True,
        "message": "Exercise detection API is working",
        "available_exercises": exercise_tracker.get_available_exercises(),
        "mediapipe_ready": mp_processor is not None
    }
