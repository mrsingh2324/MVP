# 🏋️ Exercise Detection API v2.0

A production-grade exercise detection API built with FastAPI, MediaPipe, and modular architecture. Supports multiple exercise types with real-time analysis and rep counting.

## 🎯 Features

- **Multi-Exercise Support**: Bicep curls, squats, and extensible architecture for more
- **Real-time Analysis**: Process images for exercise detection and rep counting  
- **Modular Design**: Clean, maintainable codebase with separation of concerns
- **Production Ready**: Comprehensive error handling, logging, and monitoring
- **FastAPI Framework**: Modern, fast, and well-documented API
- **Type Safety**: Full type hints throughout the codebase
- **Extensible**: Easy to add new exercise types

## 📁 Project Structure

```
backend_v2/
├── app.py                      # FastAPI application entry point
├── requirements.txt            # Python dependencies
├── routes/
│   └── exercise_routes.py      # Exercise detection endpoints
├── modules/
│   ├── exercise/
│   │   ├── base.py            # BaseExerciseAnalyzer abstract class
│   │   ├── bicep_curl.py      # Bicep curl analyzer
│   │   ├── squat.py           # Squat analyzer
│   │   └── tracker.py         # ExerciseTracker manager
│   └── utils/
│       ├── mediapipe_utils.py # MediaPipe pose detection utilities
│       └── image_utils.py     # Image processing utilities
├── utils/
│   └── logger.py              # Logging configuration
└── database/
    └── db.py                  # Database placeholder for future use
```

## 🚀 Quick Start

### Installation

```bash
cd backend_v2
pip install -r requirements.txt
```

### Run the Server

```bash
# Development server
python3 app.py

# Production server
uvicorn app:app --host 0.0.0.0 --port 8000
```

The API will be available at:
- **API**: http://localhost:8000
- **Documentation**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 📊 Supported Exercises

### 1. Bicep Curls
- **Detection Method**: Elbow angle (shoulder-elbow-wrist)
- **Variations**: 
  - `bicep_curl_left` - Left arm only
  - `bicep_curl_right` - Right arm only  
  - `bicep_curl_both` - Both arms simultaneously
  - `bicep_curl` - Default (left arm)

**Thresholds**:
- Up position: < 30° (arm curled)
- Down position: > 160° (arm extended)

### 2. Squats
- **Detection Method**: Knee angle (hip-knee-ankle)
- **Variations**:
  - `squat_left` - Left leg tracking
  - `squat_right` - Right leg tracking
  - `squat_both` - Both legs simultaneously
  - `squat` - Default (both legs)

**Thresholds**:
- Up position: > 160° (standing straight)
- Down position: < 90° (squatting down)

## 🔗 API Endpoints

### Core Endpoints

#### `GET /`
Root endpoint with API information and available exercises.

#### `GET /health`
Health check endpoint for monitoring system status.

#### `GET /api/exercise/exercises`
Get list of all available exercise types.

```json
{
  "success": true,
  "exercises": ["bicep_curl_left", "bicep_curl_right", "squat", ...],
  "count": 8
}
```

### Exercise Analysis

#### `POST /api/exercise/analyze/{exercise_name}`
Analyze an image for exercise detection.

**Parameters**:
- `exercise_name`: Name of exercise (e.g., "bicep_curl", "squat")
- `image_file`: Uploaded image file (multipart/form-data)
- `image_data`: Base64 encoded image (form data)

**Response**:
```json
{
  "success": true,
  "exercise": "bicep_curl_left",
  "reps": 5,
  "stage": "up",
  "angle": 25.3,
  "rep_completed": false,
  "processed_image": "data:image/jpeg;base64,..."
}
```

#### `POST /api/exercise/reset/{exercise_name}`
Reset rep counters for a specific exercise.

**Response**:
```json
{
  "success": true,
  "exercise": "bicep_curl_left",
  "message": "Exercise bicep_curl_left reset successfully"
}
```

#### `GET /api/exercise/stats/{exercise_name}`
Get statistics for a specific exercise.

**Response**:
```json
{
  "success": true,
  "exercise": "bicep_curl_left",
  "stats": {
    "exercise": "bicep_curl_left",
    "reps": 5,
    "stage": "up",
    "angle_history_length": 3
  }
}
```

## 🧪 Testing the API

### Using cURL

```bash
# Get available exercises
curl http://localhost:8000/api/exercise/exercises

# Health check
curl http://localhost:8000/health

# Reset exercise
curl -X POST http://localhost:8000/api/exercise/reset/bicep_curl

# Analyze with base64 image
curl -X POST http://localhost:8000/api/exercise/analyze/bicep_curl \
  -F "image_data=data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
```

### Using Python

```python
import requests
import base64

# Analyze image
with open("exercise_image.jpg", "rb") as f:
    files = {"image_file": f}
    response = requests.post(
        "http://localhost:8000/api/exercise/analyze/bicep_curl",
        files=files
    )
    result = response.json()
    print(f"Reps: {result['reps']}, Stage: {result['stage']}")
```

## 🏗️ Architecture

### Base Exercise Analyzer

All exercises inherit from `BaseExerciseAnalyzer`:

```python
class BaseExerciseAnalyzer(ABC):
    @abstractmethod
    def exercise_name(self) -> str:
        """Return the name of the exercise."""
        pass
    
    @abstractmethod
    def calculate_exercise_angle(self, landmarks) -> float:
        """Calculate the primary angle for this exercise."""
        pass
    
    @abstractmethod
    def determine_stage(self, angle: float) -> str:
        """Determine exercise stage based on angle."""
        pass
```

### Exercise Tracker

The `ExerciseTracker` manages multiple exercise analyzers:

```python
from modules.exercise.tracker import exercise_tracker

# Load and analyze
exercise_tracker.load_exercise("bicep_curl")
result = exercise_tracker.analyze_frame("bicep_curl", landmarks)
```

### MediaPipe Integration

Pose detection handled by `MediaPipeProcessor`:

```python
from modules.utils.mediapipe_utils import MediaPipeProcessor

processor = MediaPipeProcessor()
landmarks = processor.extract_landmarks(image)
```

## 🔧 Adding New Exercises

### 1. Create Exercise Analyzer

```python
# modules/exercise/pushup.py
from modules.exercise.base import BaseExerciseAnalyzer

class PushupAnalyzer(BaseExerciseAnalyzer):
    @property
    def exercise_name(self) -> str:
        return "pushup"
    
    def calculate_exercise_angle(self, landmarks):
        # Implement pushup-specific angle calculation
        pass
    
    def determine_stage(self, angle: float) -> str:
        # Implement pushup stage logic
        pass
```

### 2. Register in Tracker

```python
# modules/exercise/tracker.py
def _register_exercises(self):
    self._exercise_registry = {
        # ... existing exercises
        "pushup": lambda: PushupAnalyzer(),
    }
```

### 3. Test New Exercise

```bash
curl http://localhost:8000/api/exercise/analyze/pushup \
  -F "image_file=@pushup_image.jpg"
```

## 📊 Monitoring & Logging

### Logging Configuration

```python
from utils.logger import setup_logger, get_logger

logger = setup_logger("my_module", level=logging.INFO)
logger.info("Application started")
```

### Health Monitoring

The `/health` endpoint provides system status:
- Exercise tracker status
- MediaPipe availability  
- Database connection (placeholder)

## 🔒 Production Deployment

### Environment Configuration

```bash
# Set production environment
export ENVIRONMENT=production
export LOG_LEVEL=INFO
export DATABASE_URL=postgresql://...
```

### Docker Deployment

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Production Server

```bash
# Using uvicorn
uvicorn app:app --host 0.0.0.0 --port 8000 --workers 4

# Using gunicorn
gunicorn app:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## 🧪 Testing

### Unit Tests

```python
import pytest
from modules.exercise.bicep_curl import BicepCurlAnalyzer

def test_bicep_curl_analyzer():
    analyzer = BicepCurlAnalyzer("left")
    assert analyzer.exercise_name == "bicep_curl_left"
```

### Integration Tests

```python
def test_api_endpoint():
    response = client.get("/api/exercise/exercises")
    assert response.status_code == 200
    assert "bicep_curl" in response.json()["exercises"]
```

## 📈 Performance Considerations

- **MediaPipe Optimization**: Configured for balanced accuracy/speed
- **Image Processing**: Efficient base64 ↔ numpy conversions
- **Memory Management**: Proper resource cleanup
- **Async Support**: FastAPI's async capabilities for concurrent requests

## 🔮 Future Enhancements

- [ ] **Database Integration**: User profiles and workout history
- [ ] **Authentication**: JWT-based user authentication
- [ ] **Real-time Streaming**: WebSocket support for live video
- [ ] **Advanced Analytics**: Form scoring and movement quality
- [ ] **Mobile SDK**: Native mobile app integration
- [ ] **Cloud Deployment**: AWS/GCP deployment configurations

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-exercise`)
3. Add your exercise analyzer following the base class pattern
4. Add tests and documentation
5. Submit pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with ❤️ using FastAPI, MediaPipe, and modern Python practices.**
