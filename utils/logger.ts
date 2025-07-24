// Production-safe logging utility
// This prevents sensitive data from being logged in production builds

export const log = __DEV__ ? console.log : () => {};
export const error = __DEV__ ? console.error : () => {};
export const warn = __DEV__ ? console.warn : () => {};
export const info = __DEV__ ? console.info : () => {};

// For critical errors that should always be logged
export const criticalError = (message: string, error?: any) => {
  if (__DEV__) {
    console.error(message, error);
  } else {
    // In production, you might want to send to a logging service
    // like Sentry, Crashlytics, etc.
    console.error(message);
  }
};

// For analytics and user behavior tracking
export const analytics = (event: string, data?: any) => {
  if (__DEV__) {
    console.log(`📊 Analytics: ${event}`, data);
  }
  // In production, send to your analytics service
  // Example: Firebase Analytics, Mixpanel, etc.
};

// For performance monitoring
export const performance = (operation: string, duration: number) => {
  if (__DEV__) {
    console.log(`⏱️ Performance: ${operation} took ${duration}ms`);
  }
  // In production, send to performance monitoring service
}; 