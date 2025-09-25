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

// Authentication Service using Twilio OTP backend
class AuthService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Send OTP to phone number
  async sendOTP(phone) {
    try {
      const response = await apiClient.post('/api/otp/send', {
        phone: phone,
        purpose: 'login'
      });

      return {
        success: true,
        message: response.data.message,
        phone: response.data.phone,
        mock_mode: response.data.mock_mode,
        mock_otp: response.data.mock_otp // Only in mock mode
      };
    } catch (error) {
      console.error('Send OTP error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to send OTP'
      };
    }
  }

  // Verify OTP and authenticate user
  async verifyOTP(phone, otp) {
    try {
      const response = await apiClient.post('/api/auth/verify-otp', {
        phone: phone,
        otp: otp
      });

      if (response.data.success) {
        return {
          success: true,
          session_token: response.data.session_token,
          user: response.data.user,
          is_new_user: response.data.is_new_user
        };
      } else {
        return {
          success: false,
          error: response.data.error || 'OTP verification failed'
        };
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'OTP verification failed'
      };
    }
  }

  // Get user profile
  async getProfile(sessionToken) {
    try {
      const response = await apiClient.get('/api/auth/profile', {
        params: { session_token: sessionToken }
      });

      return {
        success: true,
        user: response.data.user
      };
    } catch (error) {
      console.error('Get profile error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to get profile'
      };
    }
  }

  // Update user profile
  async updateProfile(sessionToken, profileData) {
    try {
      const response = await apiClient.post('/api/auth/update-profile', profileData, {
        params: { session_token: sessionToken }
      });

      return {
        success: true,
        user: response.data.user
      };
    } catch (error) {
      console.error('Update profile error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to update profile'
      };
    }
  }

  // Logout user
  async logout(sessionToken) {
    try {
      await apiClient.post('/api/auth/logout', {}, {
        params: { session_token: sessionToken }
      });

      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Logout failed'
      };
    }
  }

  // Get demo credentials for development
  async getDemoCredentials() {
    try {
      const response = await apiClient.get('/api/auth/demo-credentials');
      return {
        success: true,
        demo_phone: response.data.demo_phone,
        demo_otp: response.data.demo_otp
      };
    } catch (error) {
      console.error('Get demo credentials error:', error);
      return {
        success: false,
        error: 'Failed to get demo credentials'
      };
    }
  }

  // Test OTP service
  async testOTPService() {
    try {
      const response = await apiClient.get('/api/otp/test');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Test OTP service error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'OTP service test failed'
      };
    }
  }
}

// Create and export singleton instance
export const authService = new AuthService();

// Export individual methods for backward compatibility
export const sendOTP = (phone) => authService.sendOTP(phone);
export const verifyOTP = (phone, otp) => authService.verifyOTP(phone, otp);
export const getProfile = (sessionToken) => authService.getProfile(sessionToken);
export const updateProfile = (sessionToken, profileData) => authService.updateProfile(sessionToken, profileData);
export const logout = (sessionToken) => authService.logout(sessionToken);
export const getDemoCredentials = () => authService.getDemoCredentials();
export const testOTPService = () => authService.testOTPService();
