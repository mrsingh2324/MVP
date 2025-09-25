import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include session token
apiClient.interceptors.request.use((config) => {
  const sessionToken = localStorage.getItem('sessionToken');
  if (sessionToken) {
    config.params = { ...config.params, session_token: sessionToken };
  }
  return config;
});

class WorkoutService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Get available exercises
  async getAvailableExercises() {
    try {
      const response = await apiClient.get('/api/exercise/exercises');
      return {
        success: true,
        exercises: response.data.exercises || []
      };
    } catch (error) {
      console.error('Get exercises error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to get exercises'
      };
    }
  }

  // Start workout session
  async startSession(exerciseType, planId = null) {
    try {
      const response = await apiClient.post('/api/session/start', {
        exercise_type: exerciseType,
        plan_id: planId
      });

      return {
        success: true,
        session: response.data.session
      };
    } catch (error) {
      console.error('Start session error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to start session'
      };
    }
  }

  // End workout session
  async endSession(sessionId, sessionData) {
    try {
      const response = await apiClient.post(`/api/session/end/${sessionId}`, sessionData);

      return {
        success: true,
        session: response.data.session
      };
    } catch (error) {
      console.error('End session error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to end session'
      };
    }
  }

  // Analyze exercise frame
  async analyzeFrame(exerciseType, imageBlob) {
    try {
      const formData = new FormData();
      formData.append('image_file', imageBlob, 'frame.jpg');

      const response = await apiClient.post(
        `/api/exercise/analyze/${encodeURIComponent(exerciseType)}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 8000
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Analyze frame error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Frame analysis failed'
      };
    }
  }

  // Reset exercise
  async resetExercise(exerciseType) {
    try {
      const response = await apiClient.post(`/api/exercise/reset/${encodeURIComponent(exerciseType)}`);

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Reset exercise error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to reset exercise'
      };
    }
  }

  // Get exercise statistics
  async getExerciseStats(exerciseType) {
    try {
      const response = await apiClient.get(`/api/exercise/stats/${encodeURIComponent(exerciseType)}`);

      return {
        success: true,
        stats: response.data.stats
      };
    } catch (error) {
      console.error('Get exercise stats error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to get exercise stats'
      };
    }
  }

  // Get workout history
  async getWorkoutHistory(limit = 50) {
    try {
      const response = await apiClient.get('/api/session/history', {
        params: { limit }
      });

      return {
        success: true,
        sessions: response.data.sessions || []
      };
    } catch (error) {
      console.error('Get workout history error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to get workout history'
      };
    }
  }

  // Get workout plans
  async getWorkoutPlans() {
    try {
      const response = await apiClient.get('/api/plans');

      return {
        success: true,
        plans: response.data.plans || []
      };
    } catch (error) {
      console.error('Get workout plans error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to get workout plans'
      };
    }
  }

  // Create workout plan
  async createPlan(planData) {
    try {
      const response = await apiClient.post('/api/plans/create', planData);

      return {
        success: true,
        plan: response.data.plan
      };
    } catch (error) {
      console.error('Create plan error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to create plan'
      };
    }
  }

  // Activate workout plan
  async activatePlan(planId) {
    try {
      const response = await apiClient.post(`/api/plans/activate/${planId}`);

      return {
        success: true,
        plan: response.data.plan
      };
    } catch (error) {
      console.error('Activate plan error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to activate plan'
      };
    }
  }

  // Get AI coaching status
  async getCoachingStatus() {
    try {
      const response = await apiClient.get('/api/coaching/status');

      return {
        success: true,
        coaching: response.data.coaching
      };
    } catch (error) {
      console.error('Get coaching status error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to get coaching status'
      };
    }
  }

  // Enable AI coaching
  async enableCoaching() {
    try {
      const response = await apiClient.post('/api/coaching/enable');

      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      console.error('Enable coaching error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to enable coaching'
      };
    }
  }

  // Disable AI coaching
  async disableCoaching() {
    try {
      const response = await apiClient.post('/api/coaching/disable');

      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      console.error('Disable coaching error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to disable coaching'
      };
    }
  }

  // Get exercise tips
  async getExerciseTips(exerciseType) {
    try {
      const response = await apiClient.get(`/api/coaching/tips/${encodeURIComponent(exerciseType)}`);

      return {
        success: true,
        tips: response.data.tips
      };
    } catch (error) {
      console.error('Get exercise tips error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to get exercise tips'
      };
    }
  }

  // Health check
  async healthCheck() {
    try {
      const response = await apiClient.get('/health');

      return {
        success: true,
        status: response.data
      };
    } catch (error) {
      console.error('Health check error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Health check failed'
      };
    }
  }
}

// Create and export singleton instance
export const workoutService = new WorkoutService();

// Export individual methods for backward compatibility
export const getAvailableExercises = () => workoutService.getAvailableExercises();
export const startSession = (exerciseType, planId) => workoutService.startSession(exerciseType, planId);
export const endSession = (sessionId, sessionData) => workoutService.endSession(sessionId, sessionData);
export const analyzeFrame = (exerciseType, imageBlob) => workoutService.analyzeFrame(exerciseType, imageBlob);
export const resetExercise = (exerciseType) => workoutService.resetExercise(exerciseType);
export const getExerciseStats = (exerciseType) => workoutService.getExerciseStats(exerciseType);
export const getWorkoutHistory = (limit) => workoutService.getWorkoutHistory(limit);
export const getWorkoutPlans = () => workoutService.getWorkoutPlans();
export const createPlan = (planData) => workoutService.createPlan(planData);
export const activatePlan = (planId) => workoutService.activatePlan(planId);
export const getCoachingStatus = () => workoutService.getCoachingStatus();
export const enableCoaching = () => workoutService.enableCoaching();
export const disableCoaching = () => workoutService.disableCoaching();
export const getExerciseTips = (exerciseType) => workoutService.getExerciseTips(exerciseType);
export const healthCheck = () => workoutService.healthCheck();
