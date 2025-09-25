import ReactGA from 'react-ga4';

const TRACKING_ID = process.env.REACT_APP_GOOGLE_ANALYTICS_ID;
const isDevelopment = process.env.NODE_ENV === 'development';

class Analytics {
  constructor() {
    this.isInitialized = false;
    this.init();
  }

  init() {
    if (TRACKING_ID && !isDevelopment) {
      ReactGA.initialize(TRACKING_ID, {
        debug: process.env.REACT_APP_DEBUG_MODE === 'true',
        titleCase: false,
        gaOptions: {
          userId: this.getUserId()
        }
      });
      this.isInitialized = true;
      console.log('Google Analytics initialized');
    } else {
      console.log('Google Analytics disabled in development mode');
    }
  }

  getUserId() {
    // Get or create a unique user ID
    let userId = localStorage.getItem('analytics_user_id');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('analytics_user_id', userId);
    }
    return userId;
  }

  // Track page views
  pageView(path, title) {
    if (this.isInitialized) {
      ReactGA.send({ 
        hitType: 'pageview', 
        page: path,
        title: title 
      });
    }
  }

  // Track events
  event(action, category = 'User', label = '', value = 0) {
    if (this.isInitialized) {
      ReactGA.event({
        action,
        category,
        label,
        value
      });
    }
  }

  // Track user login
  login(method = 'demo') {
    this.event('login', 'Authentication', method);
  }

  // Track user logout
  logout() {
    this.event('logout', 'Authentication');
  }

  // Track nutrition logging
  logFood(foodName, calories) {
    this.event('log_food', 'Nutrition', foodName, calories);
  }

  // Track workout completion
  completeWorkout(workoutType, duration) {
    this.event('complete_workout', 'Fitness', workoutType, duration);
  }

  // Track feature usage
  useFeature(featureName) {
    this.event('use_feature', 'Features', featureName);
  }

  // Track errors
  error(errorMessage, errorCategory = 'JavaScript Error') {
    this.event('error', errorCategory, errorMessage);
  }

  // Set user properties
  setUserProperties(properties) {
    if (this.isInitialized) {
      ReactGA.set(properties);
    }
  }

  // Track timing events
  timing(category, variable, value, label) {
    if (this.isInitialized) {
      ReactGA.send({
        hitType: 'timing',
        timingCategory: category,
        timingVar: variable,
        timingValue: value,
        timingLabel: label
      });
    }
  }
}

// Create singleton instance
const analytics = new Analytics();

export default analytics;
