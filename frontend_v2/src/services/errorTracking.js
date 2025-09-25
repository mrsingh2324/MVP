import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

const SENTRY_DSN = process.env.REACT_APP_SENTRY_DSN;
const isDevelopment = process.env.NODE_ENV === 'development';

class ErrorTracking {
  constructor() {
    this.isInitialized = false;
    this.init();
  }

  init() {
    if (SENTRY_DSN && !isDevelopment) {
      Sentry.init({
        dsn: SENTRY_DSN,
        integrations: [
          new BrowserTracing({
            // Set tracing sample rate
            tracePropagationTargets: ['localhost', /^https:\/\/yourapi\.domain\.com\/api/],
          }),
        ],
        // Performance Monitoring
        tracesSampleRate: 0.1,
        // Release Health
        autoSessionTracking: true,
        // Debug mode
        debug: process.env.REACT_APP_DEBUG_MODE === 'true',
        environment: process.env.NODE_ENV,
        beforeSend(event, hint) {
          // Filter out development errors
          if (isDevelopment) {
            return null;
          }
          return event;
        }
      });

      this.isInitialized = true;
      console.log('Sentry error tracking initialized');
    } else {
      console.log('Sentry disabled in development mode');
    }
  }

  // Set user context
  setUser(user) {
    if (this.isInitialized) {
      Sentry.setUser({
        id: user.id,
        email: user.email || user.phone,
        username: user.phone || user.id,
        isDemo: user.isDemo || false
      });
    }
  }

  // Set additional context
  setContext(key, context) {
    if (this.isInitialized) {
      Sentry.setContext(key, context);
    }
  }

  // Add breadcrumb
  addBreadcrumb(message, category = 'default', level = 'info', data = {}) {
    if (this.isInitialized) {
      Sentry.addBreadcrumb({
        message,
        category,
        level,
        data,
        timestamp: Date.now() / 1000
      });
    }
  }

  // Capture exception
  captureException(error, context = {}) {
    if (this.isInitialized) {
      Sentry.withScope((scope) => {
        Object.keys(context).forEach(key => {
          scope.setContext(key, context[key]);
        });
        Sentry.captureException(error);
      });
    } else {
      console.error('Error captured:', error, context);
    }
  }

  // Capture message
  captureMessage(message, level = 'info', context = {}) {
    if (this.isInitialized) {
      Sentry.withScope((scope) => {
        Object.keys(context).forEach(key => {
          scope.setContext(key, context[key]);
        });
        Sentry.captureMessage(message, level);
      });
    } else {
      console.log('Message captured:', message, context);
    }
  }

  // Start transaction (updated for newer Sentry versions)
  startTransaction(name, op = 'navigation') {
    if (this.isInitialized) {
      return Sentry.startSpan({ name, op }, () => {});
    }
    return null;
  }

  // Performance monitoring
  measurePerformance(name, fn) {
    const start = performance.now();
    
    try {
      const result = fn();
      const end = performance.now();
      
      this.addBreadcrumb(
        `Performance: ${name} took ${(end - start).toFixed(2)}ms`,
        'performance',
        'info',
        { duration: end - start }
      );
      
      return result;
    } catch (error) {
      this.captureException(error, { function: name });
      throw error;
    }
  }

  // Async performance monitoring
  async measureAsyncPerformance(name, asyncFn) {
    const start = performance.now();
    
    try {
      const result = await asyncFn();
      const end = performance.now();
      
      this.addBreadcrumb(
        `Async Performance: ${name} took ${(end - start).toFixed(2)}ms`,
        'performance',
        'info',
        { duration: end - start }
      );
      
      return result;
    } catch (error) {
      this.captureException(error, { function: name });
      throw error;
    }
  }
}

// Create singleton instance
const errorTracking = new ErrorTracking();

export default errorTracking;
