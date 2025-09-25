// Rep Counting Service - Integrates with backend MediaPipe
class RepCountingService {
  constructor() {
    this.isActive = false;
    this.currentExercise = null;
    this.repCount = 0;
    this.sessionId = null;
    this.websocket = null;
    this.callbacks = {
      onRepDetected: null,
      onFormFeedback: null,
      onError: null
    };
    this.backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  }

  // Initialize rep counting for an exercise
  async initialize(exerciseType, callbacks = {}) {
    try {
      this.currentExercise = exerciseType;
      this.callbacks = { ...this.callbacks, ...callbacks };
      this.repCount = 0;

      // Select exercise on backend
      const response = await fetch(`${this.backendUrl}/api/exercise/select/${exerciseType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to select exercise: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Exercise selected:', data);

      return { success: true, message: `${exerciseType} ready for tracking` };
    } catch (error) {
      console.error('Rep counting initialization error:', error);
      this.callbacks.onError?.(error.message);
      return { success: false, error: error.message };
    }
  }

  // Start rep counting session
  async startSession(sessionToken = 'default_user') {
    try {
      if (!this.currentExercise) {
        throw new Error('No exercise selected. Call initialize() first.');
      }

      const response = await fetch(`${this.backendUrl}/api/session/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          exercise_type: this.currentExercise,
          session_token: sessionToken
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to start session: ${response.statusText}`);
      }

      const data = await response.json();
      this.sessionId = data.session_id;
      this.isActive = true;

      console.log('Session started:', data);
      return { success: true, sessionId: this.sessionId };
    } catch (error) {
      console.error('Session start error:', error);
      this.callbacks.onError?.(error.message);
      return { success: false, error: error.message };
    }
  }

  // Process frame for rep counting
  async processFrame(imageData) {
    try {
      if (!this.isActive || !this.currentExercise) {
        return { success: false, error: 'Session not active' };
      }

      // Convert image data to base64 if needed
      let base64Image = imageData;
      if (imageData instanceof ImageData || imageData instanceof HTMLCanvasElement) {
        base64Image = this.convertToBase64(imageData);
      }

      // Create FormData for the API
      const formData = new FormData();
      formData.append('image_data', base64Image);

      const response = await fetch(`${this.backendUrl}/api/exercise/analyze/${this.currentExercise}`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Update rep count if new rep detected
        if (result.reps > this.repCount) {
          this.repCount = result.reps;
          this.callbacks.onRepDetected?.(this.repCount, result.stage);
        }

        // Provide form feedback if available
        if (result.feedback) {
          this.callbacks.onFormFeedback?.(result.feedback);
        }

        return {
          success: true,
          repCount: this.repCount,
          stage: result.stage,
          feedback: result.feedback,
          angle: result.angle,
          rep_completed: result.rep_completed
        };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Frame processing error:', error);
      this.callbacks.onError?.(error.message);
      return { success: false, error: error.message };
    }
  }

  // Convert canvas or ImageData to base64
  convertToBase64(imageData) {
    if (imageData instanceof HTMLCanvasElement) {
      return imageData.toDataURL('image/jpeg', 0.8).split(',')[1];
    } else if (imageData instanceof ImageData) {
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d');
      ctx.putImageData(imageData, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    }
    return imageData;
  }

  // End session
  async endSession() {
    try {
      if (!this.sessionId) {
        return { success: true, message: 'No active session' };
      }

      const response = await fetch(`${this.backendUrl}/api/session/end/${this.sessionId}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`Failed to end session: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Reset state
      this.isActive = false;
      this.sessionId = null;
      const finalRepCount = this.repCount;
      this.repCount = 0;

      console.log('Session ended:', data);
      return { 
        success: true, 
        finalRepCount,
        sessionData: data 
      };
    } catch (error) {
      console.error('Session end error:', error);
      this.callbacks.onError?.(error.message);
      return { success: false, error: error.message };
    }
  }

  // Get current stats
  getCurrentStats() {
    return {
      isActive: this.isActive,
      currentExercise: this.currentExercise,
      repCount: this.repCount,
      sessionId: this.sessionId
    };
  }

  // Reset rep count
  resetCount() {
    this.repCount = 0;
  }

  // Get available exercises
  async getAvailableExercises() {
    try {
      const response = await fetch(`${this.backendUrl}/api/exercise/exercises`);
      if (!response.ok) {
        throw new Error(`Failed to get exercises: ${response.statusText}`);
      }

      const data = await response.json();
      return data.success ? data.exercises : ['pushup', 'squat', 'bicep_curl_both'];
    } catch (error) {
      console.error('Error getting exercises:', error);
      return ['pushup', 'squat', 'bicep_curl_both']; // Fallback
    }
  }

  // Get exercise stats
  async getExerciseStats(exerciseType) {
    try {
      const response = await fetch(`${this.backendUrl}/api/exercise/stats/${exerciseType}`);
      if (!response.ok) {
        throw new Error(`Failed to get stats: ${response.statusText}`);
      }

      const data = await response.json();
      return data.success ? data.stats : null;
    } catch (error) {
      console.error('Error getting exercise stats:', error);
      return null;
    }
  }

  // Cleanup
  cleanup() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.isActive = false;
    this.sessionId = null;
    this.repCount = 0;
  }
}

// Create singleton instance
const repCountingService = new RepCountingService();

export default repCountingService;
