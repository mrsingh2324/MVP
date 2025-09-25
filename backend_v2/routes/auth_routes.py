#!/usr/bin/env python3
"""
FastAPI routes for user authentication with OTP.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
import random
import time
import hashlib
from datetime import datetime, timedelta
from utils.logger import get_logger
from database.db import db_manager

logger = get_logger(__name__)

# Create router
router = APIRouter(prefix="/api/auth", tags=["authentication"])

# In-memory storage for demo (replace with database in production)
otp_storage = {}
sessions = {}

# Demo account credentials
DEMO_PHONE = "+1234567890"
DEMO_OTP = "123456"

class PhoneRequest(BaseModel):
    phone: str = Field(..., description="Phone number with country code")

class OTPVerifyRequest(BaseModel):
    phone: str = Field(..., description="Phone number with country code")
    otp: str = Field(..., description="6-digit OTP code")

class UserProfile(BaseModel):
    phone: Optional[str] = None
    fitness_goal: Optional[str] = None
    name: Optional[str] = None
    age: Optional[int] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    created_at: Optional[str] = None

def generate_otp() -> str:
    """Generate a 6-digit OTP"""
    return str(random.randint(100000, 999999))

def generate_session_token(phone: str) -> str:
    """Generate a session token"""
    timestamp = str(int(time.time()))
    return hashlib.sha256(f"{phone}_{timestamp}".encode()).hexdigest()[:32]

@router.post("/send-otp")
async def send_otp(request: PhoneRequest):
    """
    Send OTP to phone number.
    For demo purposes, always returns success.
    """
    try:
        phone = request.phone.strip()
        
        # Generate OTP
        if phone == DEMO_PHONE:
            otp = DEMO_OTP  # Fixed OTP for demo account
        else:
            otp = generate_otp()
        
        # Store OTP with expiration (5 minutes)
        otp_storage[phone] = {
            "otp": otp,
            "expires_at": time.time() + 300,  # 5 minutes
            "attempts": 0
        }
        
        logger.info(f"OTP sent to {phone}: {otp}")
        
        return {
            "success": True,
            "message": "OTP sent successfully",
            "phone": phone,
            "demo_otp": otp if phone == DEMO_PHONE else None  # Only show OTP for demo
        }
        
    except Exception as e:
        logger.error(f"Error sending OTP: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/verify-otp")
async def verify_otp(request: OTPVerifyRequest):
    """
    Verify OTP and create session with Supabase integration.
    """
    try:
        phone = request.phone.strip()
        otp = request.otp.strip()

        # For demo purposes, accept demo OTP or any 6-digit OTP
        # In production, implement proper SMS OTP verification
        if phone == DEMO_PHONE and otp == DEMO_OTP:
            # Demo account - always allow
            pass
        elif len(otp) == 6 and otp.isdigit():
            # Accept any 6-digit OTP for development
            pass
        else:
            raise HTTPException(status_code=400, detail="Invalid OTP format")

        # Create or get user from mock database
        user = db_manager.get_user_by_phone(phone)
        if not user:
            # Create new user
            user_data = {
                "phone": phone,
                "name": "Demo User" if phone == DEMO_PHONE else "User",
            }
            user_id = db_manager.create_user(user_data)
            if user_id:
                user = db_manager.get_user(user_id)
        
        if not user:
            raise HTTPException(status_code=500, detail="Failed to create or retrieve user")
        
        logger.info(f"User authenticated: {phone}")

        # Generate session token
        session_token = generate_session_token(phone)

        # Store session in memory for now (can be moved to Supabase sessions table)
        sessions[session_token] = {
            "phone": phone,
            "user_id": user.get("id"),
            "created_at": time.time(),
            "expires_at": time.time() + 86400  # 24 hours
        }

        logger.info(f"User authenticated via mock system: {phone}")

        return {
            "success": True,
            "message": "Authentication successful",
            "session_token": session_token,
            "user": user,
            "is_new_user": user.get("fitness_goal") is None
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying OTP: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/profile")
async def get_profile(session_token: str):
    """
    Get user profile by session token.
    """
    try:
        if session_token not in sessions:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        session = sessions[session_token]
        
        # Check session expiration
        if time.time() > session["expires_at"]:
            del sessions[session_token]
            raise HTTPException(status_code=401, detail="Session expired")
        
        phone = session["phone"]
        user = db_manager.get_user_by_phone(phone)
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "success": True,
            "user": user
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/update-profile")
async def update_profile(session_token: str, profile: UserProfile):
    """
    Update user profile.
    """
    try:
        if session_token not in sessions:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        session = sessions[session_token]
        
        # Check session expiration
        if time.time() > session["expires_at"]:
            del sessions[session_token]
            raise HTTPException(status_code=401, detail="Session expired")
        
        phone = session["phone"]
        
        # Get user from database
        user = db_manager.get_user_by_phone(phone)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update user profile
        update_data = profile.dict(exclude_unset=True)
        
        # Update the user data
        updated_user_data = user.copy()
        for key, value in update_data.items():
            if key != "phone":  # Don't allow phone number changes
                updated_user_data[key] = value
        
        updated_user_data["updated_at"] = datetime.now().isoformat()
        
        # Save updated user data
        success = db_manager.update_user(user["id"], updated_user_data)
        
        logger.info(f"Profile updated for user: {phone}")
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update profile")
        
        return {
            "success": True,
            "message": "Profile updated successfully",
            "user": updated_user_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/logout")
async def logout(session_token: str):
    """
    Logout user and invalidate session.
    """
    try:
        if session_token in sessions:
            del sessions[session_token]
        
        return {
            "success": True,
            "message": "Logged out successfully"
        }
        
    except Exception as e:
        logger.error(f"Error logging out: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/demo-credentials")
async def get_demo_credentials():
    """
    Get demo account credentials for development.
    """
    return {
        "success": True,
        "demo_phone": DEMO_PHONE,
        "demo_otp": DEMO_OTP,
        "message": "Use these credentials for demo login"
    }
