#!/usr/bin/env python3
"""
Image processing utilities for base64 conversion and image manipulation.
"""

import base64
import cv2
import numpy as np
from io import BytesIO
from PIL import Image
from typing import Optional, Tuple
from utils.logger import get_logger

logger = get_logger(__name__)


def base64_to_numpy(base64_string: str) -> Optional[np.ndarray]:
    """
    Convert base64 encoded image to numpy array.
    
    Args:
        base64_string: Base64 encoded image string
        
    Returns:
        Numpy array in BGR format or None if conversion fails
    """
    try:
        # Remove data URL prefix if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        # Decode base64
        image_bytes = base64.b64decode(base64_string)
        
        # Convert to PIL Image
        pil_image = Image.open(BytesIO(image_bytes))
        
        # Convert to numpy array
        numpy_image = np.array(pil_image)
        
        # Convert RGB to BGR for OpenCV
        if len(numpy_image.shape) == 3 and numpy_image.shape[2] == 3:
            numpy_image = cv2.cvtColor(numpy_image, cv2.COLOR_RGB2BGR)
        
        return numpy_image
        
    except Exception as e:
        logger.error(f"Error converting base64 to numpy: {e}")
        return None


def numpy_to_base64(numpy_image: np.ndarray, format: str = 'JPEG') -> Optional[str]:
    """
    Convert numpy array to base64 encoded string.
    
    Args:
        numpy_image: Numpy array in BGR format
        format: Output format ('JPEG' or 'PNG')
        
    Returns:
        Base64 encoded string or None if conversion fails
    """
    try:
        # Convert BGR to RGB for PIL
        if len(numpy_image.shape) == 3 and numpy_image.shape[2] == 3:
            rgb_image = cv2.cvtColor(numpy_image, cv2.COLOR_BGR2RGB)
        else:
            rgb_image = numpy_image
        
        # Convert to PIL Image
        pil_image = Image.fromarray(rgb_image)
        
        # Save to bytes buffer
        buffer = BytesIO()
        pil_image.save(buffer, format=format)
        
        # Encode to base64
        base64_string = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        return f"data:image/{format.lower()};base64,{base64_string}"
        
    except Exception as e:
        logger.error(f"Error converting numpy to base64: {e}")
        return None


def resize_image(image: np.ndarray, 
                max_width: int = 640, 
                max_height: int = 480) -> np.ndarray:
    """
    Resize image while maintaining aspect ratio.
    
    Args:
        image: Input image as numpy array
        max_width: Maximum width
        max_height: Maximum height
        
    Returns:
        Resized image
    """
    height, width = image.shape[:2]
    
    # Calculate scaling factor
    scale_w = max_width / width
    scale_h = max_height / height
    scale = min(scale_w, scale_h)
    
    # Only resize if image is larger than max dimensions
    if scale < 1.0:
        new_width = int(width * scale)
        new_height = int(height * scale)
        image = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_AREA)
    
    return image


def validate_image(image: np.ndarray) -> bool:
    """
    Validate that the image is in correct format.
    
    Args:
        image: Image as numpy array
        
    Returns:
        True if image is valid
    """
    if image is None:
        return False
    
    if not isinstance(image, np.ndarray):
        return False
    
    if len(image.shape) not in [2, 3]:
        return False
    
    if len(image.shape) == 3 and image.shape[2] not in [1, 3, 4]:
        return False
    
    return True


def draw_text_with_background(image: np.ndarray,
                            text: str,
                            position: Tuple[int, int],
                            font_scale: float = 0.7,
                            font_color: Tuple[int, int, int] = (255, 255, 255),
                            bg_color: Tuple[int, int, int] = (0, 0, 0),
                            thickness: int = 2) -> np.ndarray:
    """
    Draw text with background rectangle on image.
    
    Args:
        image: Input image
        text: Text to draw
        position: (x, y) position
        font_scale: Font scale
        font_color: Text color (BGR)
        bg_color: Background color (BGR)
        thickness: Text thickness
        
    Returns:
        Image with text drawn
    """
    font = cv2.FONT_HERSHEY_SIMPLEX
    
    # Get text size
    (text_width, text_height), baseline = cv2.getTextSize(
        text, font, font_scale, thickness
    )
    
    x, y = position
    
    # Draw background rectangle
    cv2.rectangle(
        image,
        (x - 5, y - text_height - 10),
        (x + text_width + 5, y + baseline + 5),
        bg_color,
        -1
    )
    
    # Draw text
    cv2.putText(
        image,
        text,
        (x, y),
        font,
        font_scale,
        font_color,
        thickness,
        cv2.LINE_AA
    )
    
    return image


def create_overlay_image(base_image: np.ndarray,
                        overlay_info: dict,
                        position: Tuple[int, int] = (10, 30)) -> np.ndarray:
    """
    Create an overlay with exercise information on the image.
    
    Args:
        base_image: Base image
        overlay_info: Dictionary with overlay information
        position: Starting position for overlay
        
    Returns:
        Image with overlay
    """
    image = base_image.copy()
    x, y = position
    line_height = 25
    
    for key, value in overlay_info.items():
        text = f"{key}: {value}"
        image = draw_text_with_background(
            image, text, (x, y),
            font_scale=0.6,
            font_color=(255, 255, 255),
            bg_color=(0, 0, 0)
        )
        y += line_height
    
    return image
