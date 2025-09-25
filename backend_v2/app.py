#!/usr/bin/env python3
"""
FastAPI application for exercise detection.

A production-grade exercise detection API with support for multiple exercises
including bicep curls and squats. Built with FastAPI, MediaPipe, and modular architecture.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from contextlib import asynccontextmanager

from routes.auth_routes import router as auth_router
from routes.nutrition_routes import router as nutrition_router
from routes.exercise_routes import router as exercise_router
from routes.session_routes import router as session_router
from routes.mcp_routes import router as mcp_router
from routes.ai_coach_routes import router as ai_coach_router
from routes.otp_routes import router as otp_router
from routes.plan_routes import router as plan_router
from modules.exercise.tracker import exercise_tracker
from modules.utils.mediapipe_utils import MediaPipeProcessor
from database.db import db_manager
from utils.logger import setup_logger, get_logger

# Setup logging
logger = setup_logger("exercise_detection_api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    
    Handles startup and shutdown events for proper resource management.
    """
    # Startup
    logger.info("🚀 Starting Exercise Detection API...")
    
    try:
        # Initialize database connection (placeholder)
        db_manager.connect()
        logger.info("📊 Database connection initialized")
        
        # Exercise tracker initialized - exercises will be loaded on-demand
        logger.info("💪 Exercise tracker ready for on-demand loading")
        
        logger.info("✅ Application startup complete")
        
    except Exception as e:
        logger.error(f"❌ Startup error: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down Exercise Detection API...")
    
    try:
        # Cleanup exercise tracker
        exercise_tracker.cleanup()
        logger.info("🧹 Exercise tracker cleaned up")
        
        # Close database connection
        db_manager.close()
        logger.info("📊 Database connection closed")
        
        logger.info("✅ Application shutdown complete")
        
    except Exception as e:
        logger.error(f"❌ Shutdown error: {e}")


# Create FastAPI application
app = FastAPI(
    title="Exercise Detection API",
    description="""
    A production-grade exercise detection API powered by MediaPipe and computer vision.
    
    ## Features
    
    * **Multi-Exercise Support**: Bicep curls, squats, and extensible for more
    * **Real-time Analysis**: Process images for exercise detection and rep counting
    * **Modular Architecture**: Clean, maintainable codebase with separation of concerns
    * **Production Ready**: Comprehensive error handling, logging, and monitoring
    
    ## Supported Exercises
    
    * **Bicep Curls**: Left arm, right arm, or both arms simultaneously
    * **Squats**: Single leg or dual leg tracking
    
    ## Usage
    
    1. Upload an image or send base64 encoded image data
    2. Specify the exercise type
    3. Get real-time analysis with rep counts and exercise stages
    """,
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(nutrition_router)
app.include_router(exercise_router)
app.include_router(session_router)
app.include_router(mcp_router)
app.include_router(ai_coach_router)
app.include_router(otp_router)
app.include_router(plan_router)


@app.get("/")
async def root():
    """
    Root endpoint with API information.
    
    Returns:
        API status and information
    """
    return {
        "name": "Exercise Detection API",
        "version": "2.0.0",
        "status": "running",
        "description": "Production-grade exercise detection with MediaPipe",
        "endpoints": {
            "docs": "/docs",
            "exercises": "/api/exercise/exercises",
            "select": "/api/exercise/select/{exercise_name}",
            "analyze": "/api/exercise/analyze/{exercise_name}",
            "reset": "/api/exercise/reset/{exercise_name}",
            "stats": "/api/exercise/stats/{exercise_name}",
            "coaching": {
                "status": "/api/coaching/status",
                "enable": "/api/coaching/enable",
                "disable": "/api/coaching/disable",
                "tips": "/api/coaching/tips/{exercise_name}"
            }
        },
        "supported_exercises": exercise_tracker.get_available_exercises()
    }


@app.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring.
    
    Returns:
        System health status
    """
    try:
        # Check exercise tracker
        exercises = exercise_tracker.get_available_exercises()
        
        # Check if MediaPipe is working (basic test)
        try:
            mp_test = MediaPipeProcessor()
            mp_working = mp_test is not None and hasattr(mp_test, 'pose') and mp_test.pose is not None
            if hasattr(mp_test, 'cleanup'):
                mp_test.cleanup()
        except Exception:
            mp_working = False
        
        return {
            "status": "healthy",
            "timestamp": "2024-01-01T00:00:00Z",  # Would use actual timestamp
            "services": {
                "exercise_tracker": {
                    "status": "healthy",
                    "exercises_available": len(exercises)
                },
                "mediapipe": {
                    "status": "healthy" if mp_working else "unhealthy"
                },
                "database": {
                    "status": "healthy"  # Placeholder
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "error": str(e)
            }
        )


@app.get("/api/exercise/stats/{exercise_name}")
async def get_exercise_stats(exercise_name: str):
    """Get detailed statistics for a specific exercise"""
    try:
        stats = exercise_tracker.get_exercise_stats(exercise_name)
        if stats:
            return {"success": True, "stats": stats}
        else:
            raise HTTPException(status_code=404, detail="Exercise not found or not loaded")
    except Exception as e:
        logger.error(f"Error getting stats for {exercise_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# AI Coaching Endpoints
@app.get("/api/coaching/status")
async def get_coaching_status():
    """Get current AI coaching status and recent feedback"""
    try:
        status = exercise_tracker.get_coaching_status()
        return {"success": True, "coaching": status}
    except Exception as e:
        logger.error(f"Error getting coaching status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/coaching/enable")
async def enable_coaching():
    """Enable AI coaching feedback"""
    try:
        exercise_tracker.enable_coaching()
        return {"success": True, "message": "AI coaching enabled"}
    except Exception as e:
        logger.error(f"Error enabling coaching: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/coaching/disable")
async def disable_coaching():
    """Disable AI coaching feedback"""
    try:
        exercise_tracker.disable_coaching()
        return {"success": True, "message": "AI coaching disabled"}
    except Exception as e:
        logger.error(f"Error disabling coaching: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/coaching/tips/{exercise_name}")
async def get_exercise_tips(exercise_name: str):
    """Get exercise tips and guidance"""
    try:
        tips = exercise_tracker.ai_coach.get_exercise_tips(exercise_name)
        return {"success": True, "exercise": exercise_name, "tips": tips}
    except Exception as e:
        logger.error(f"Error getting tips for {exercise_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """
    Global exception handler for unhandled errors.
    
    Args:
        request: FastAPI request object
        exc: Exception that occurred
        
    Returns:
        JSON error response
    """
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "detail": str(exc) if app.debug else "An unexpected error occurred"
        }
    )


if __name__ == "__main__":
    """
    Run the application with a Tkinter launcher for local development.
    
    For production, use: uvicorn app:app --host 0.0.0.0 --port 8000
    """
    import sys
    import os
    
    # Check if we should run in headless mode (no GUI)
    if "--headless" in sys.argv or os.environ.get("HEADLESS_MODE") == "1":
        logger.info("🏃 Starting server in headless mode...")
        uvicorn.run(
            "app:app",
            host="0.0.0.0",
            port=8000,
            reload=True,  # Set to False in production
            log_level="info"
        )
    else:
        # Try to import and run the Tkinter launcher
        try:
            # Add the current directory to the path to ensure imports work
            sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
            from gui.app_launcher import main as launcher_main
            
            print("🚀 Starting AI Fitness Trainer Launcher...")
            print("If the launcher doesn't appear, please ensure Tkinter is installed.")
            print("On macOS, you may need to install Python with Tk support.")
            print("You can also run in headless mode with: python app.py --headless")
            
            # Run the launcher
            exit_code = launcher_main()
            if exit_code != 0:
                print(f"Launcher exited with code {exit_code}")
                print("Falling back to headless mode...")
                raise ImportError("Launcher failed to start")
                
        except Exception as e:
            logger.warning(f"Could not start GUI launcher: {e}")
            logger.info("Falling back to headless mode...")
            uvicorn.run(
                "app:app",
                host="0.0.0.0",
                port=8000,
                reload=True,
                log_level="info"
            )
