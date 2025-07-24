// Secure error handling utilities

interface SecureError {
  message: string;
  code?: string;
}

// Safe error messages that don't expose system details
const SAFE_ERROR_MESSAGES = {
  AUTH_FAILED: 'Authentication failed. Please check your credentials and try again.',
  DATABASE_ERROR: 'A database error occurred. Please try again later.',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  VALIDATION_ERROR: 'Invalid input provided. Please check your data and try again.',
  PERMISSION_DENIED: 'You do not have permission to perform this action.',
  RATE_LIMIT: 'Too many requests. Please wait a moment and try again.',
  SERVER_ERROR: 'A server error occurred. Please try again later.',
  NOT_FOUND: 'The requested resource was not found.',
  TIMEOUT: 'Request timed out. Please try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again later.'
};

// Map specific error types to safe messages
export const getSafeErrorMessage = (error: any): SecureError => {
  // Handle Supabase errors
  if (error?.code) {
    switch (error.code) {
      case 'auth/invalid-email':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return { message: SAFE_ERROR_MESSAGES.AUTH_FAILED, code: 'AUTH_FAILED' };
      
      case 'auth/too-many-requests':
        return { message: SAFE_ERROR_MESSAGES.RATE_LIMIT, code: 'RATE_LIMIT' };
      
      case 'auth/network-request-failed':
        return { message: SAFE_ERROR_MESSAGES.NETWORK_ERROR, code: 'NETWORK_ERROR' };
      
      case 'PGRST301': // Row Level Security violation
        return { message: SAFE_ERROR_MESSAGES.PERMISSION_DENIED, code: 'PERMISSION_DENIED' };
      
      case 'PGRST116': // Invalid range
      case 'PGRST102': // Unknown field
        return { message: SAFE_ERROR_MESSAGES.VALIDATION_ERROR, code: 'VALIDATION_ERROR' };
      
      default:
        return { message: SAFE_ERROR_MESSAGES.DATABASE_ERROR, code: 'DATABASE_ERROR' };
    }
  }

  // Handle HTTP errors
  if (error?.status) {
    switch (error.status) {
      case 400:
        return { message: SAFE_ERROR_MESSAGES.VALIDATION_ERROR, code: 'VALIDATION_ERROR' };
      case 401:
        return { message: SAFE_ERROR_MESSAGES.AUTH_FAILED, code: 'AUTH_FAILED' };
      case 403:
        return { message: SAFE_ERROR_MESSAGES.PERMISSION_DENIED, code: 'PERMISSION_DENIED' };
      case 404:
        return { message: SAFE_ERROR_MESSAGES.NOT_FOUND, code: 'NOT_FOUND' };
      case 429:
        return { message: SAFE_ERROR_MESSAGES.RATE_LIMIT, code: 'RATE_LIMIT' };
      case 500:
      case 502:
      case 503:
      case 504:
        return { message: SAFE_ERROR_MESSAGES.SERVER_ERROR, code: 'SERVER_ERROR' };
      default:
        return { message: SAFE_ERROR_MESSAGES.UNKNOWN_ERROR, code: 'UNKNOWN_ERROR' };
    }
  }

  // Handle network errors
  if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
    return { message: SAFE_ERROR_MESSAGES.NETWORK_ERROR, code: 'NETWORK_ERROR' };
  }

  // Handle timeout errors
  if (error?.message?.includes('timeout')) {
    return { message: SAFE_ERROR_MESSAGES.TIMEOUT, code: 'TIMEOUT' };
  }

  // Default safe error
  return { message: SAFE_ERROR_MESSAGES.UNKNOWN_ERROR, code: 'UNKNOWN_ERROR' };
};

// Secure logging function - logs full error details to console but returns safe message
export const logAndGetSafeError = (error: any, context: string): SecureError => {
  // Log full error details for debugging (only in development)
  if (__DEV__) {
    console.error(`[${context}] Error details:`, {
      message: error?.message,
      code: error?.code,
      status: error?.status,
      stack: error?.stack,
      timestamp: new Date().toISOString()
    });
  } else {
    // In production, only log minimal context
    console.error(`[${context}] Error occurred at ${new Date().toISOString()}`);
  }

  return getSafeErrorMessage(error);
};

// Helper to check if an error should be retried
export const shouldRetryError = (error: any): boolean => {
  const safeError = getSafeErrorMessage(error);
  
  // Retry network, timeout, and server errors
  return ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR'].includes(safeError.code || '');
};

// Rate limiting helper
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  
  isRateLimited(key: string, maxAttempts: number = 5, windowMs: number = 300000): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(timestamp => now - timestamp < windowMs);
    
    if (recentAttempts.length >= maxAttempts) {
      return true;
    }
    
    // Add current attempt
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    
    return false;
  }
  
  reset(key: string): void {
    this.attempts.delete(key);
  }
}

export const rateLimiter = new RateLimiter();

// Secure retry function with exponential backoff
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  context: string = 'operation'
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries || !shouldRetryError(error)) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.log(`[${context}] Retry attempt ${attempt + 1} after ${delay}ms`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};