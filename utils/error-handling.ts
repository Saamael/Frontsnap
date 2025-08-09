// Comprehensive error handling and retry utility

export interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: Error, attempt: number) => boolean;
  onRetry?: (error: Error, attempt: number) => void;
}

export interface ApiCallOptions extends RetryOptions {
  timeout?: number;
  abortSignal?: AbortSignal;
}

// Error types for better categorization
export enum ErrorType {
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  PERMISSION = 'PERMISSION',
  VALIDATION = 'VALIDATION',
  API = 'API',
  UNKNOWN = 'UNKNOWN',
}

export class AppError extends Error {
  public type: ErrorType;
  public statusCode?: number;
  public userMessage: string;
  public originalError?: Error;

  constructor(
    message: string,
    type: ErrorType,
    userMessage: string,
    statusCode?: number,
    originalError?: Error
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.userMessage = userMessage;
    this.statusCode = statusCode;
    this.originalError = originalError;
  }
}

// Default retry configuration
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  delay: 1000,
  backoffMultiplier: 2,
  shouldRetry: (error: Error, attempt: number) => {
    // Retry on network errors, timeouts, and server errors
    if (error.name === 'AbortError') return false; // Don't retry aborted requests
    if (error instanceof AppError) {
      return error.type === ErrorType.NETWORK || error.type === ErrorType.TIMEOUT ||
             (error.statusCode && error.statusCode >= 500);
    }
    return true;
  },
  onRetry: (error: Error, attempt: number) => {
    console.warn(`Retrying API call (attempt ${attempt}):`, error.message);
  },
};

// Sleep utility for delays
const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

// Retry wrapper function
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry if this is the last attempt
      if (attempt === config.maxRetries) {
        break;
      }

      // Check if we should retry this error
      if (!config.shouldRetry(lastError, attempt + 1)) {
        break;
      }

      // Call retry callback
      config.onRetry(lastError, attempt + 1);

      // Wait before retrying with exponential backoff
      const delay = config.delay * Math.pow(config.backoffMultiplier, attempt);
      await sleep(delay);
    }
  }

  throw lastError!;
}

// Enhanced fetch wrapper with timeout and retry
export async function apiCall<T>(
  url: string,
  options: RequestInit & ApiCallOptions = {}
): Promise<T> {
  const {
    timeout = 10000,
    abortSignal,
    maxRetries,
    delay,
    backoffMultiplier,
    shouldRetry,
    onRetry,
    ...fetchOptions
  } = options;

  const retryOptions: RetryOptions = {
    maxRetries,
    delay,
    backoffMultiplier,
    shouldRetry,
    onRetry,
  };

  return withRetry(async () => {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Combine abort signals
    let signal = controller.signal;
    if (abortSignal) {
      const combinedController = new AbortController();
      const abortBoth = () => combinedController.abort();
      
      abortSignal.addEventListener('abort', abortBoth);
      controller.signal.addEventListener('abort', abortBoth);
      
      signal = combinedController.signal;
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorType = response.status >= 500 ? ErrorType.API : ErrorType.VALIDATION;
        const userMessage = getErrorMessage(response.status);
        throw new AppError(
          `HTTP ${response.status}: ${response.statusText}`,
          errorType,
          userMessage,
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof AppError) {
        throw error;
      }

      // Handle different error types
      if (error instanceof TypeError) {
        throw new AppError(
          'Network error',
          ErrorType.NETWORK,
          'Please check your internet connection and try again.',
          undefined,
          error as Error
        );
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new AppError(
          'Request timeout',
          ErrorType.TIMEOUT,
          'The request took too long. Please try again.',
          undefined,
          error
        );
      }

      throw new AppError(
        'Unknown error',
        ErrorType.UNKNOWN,
        'Something went wrong. Please try again.',
        undefined,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }, retryOptions);
}

// Get user-friendly error messages
function getErrorMessage(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'Invalid request. Please check your input and try again.';
    case 401:
      return 'You need to sign in to access this feature.';
    case 403:
      return 'You don\'t have permission to access this feature.';
    case 404:
      return 'The requested resource was not found.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
      return 'Server error. Please try again later.';
    case 502:
    case 503:
    case 504:
      return 'Service temporarily unavailable. Please try again later.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

// Location-specific error handling
export async function withLocationPermission<T>(
  fn: () => Promise<T>,
  fallback?: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error('Location permission error:', error);
    
    if (fallback) {
      console.log('Using location fallback...');
      return await fallback();
    }
    
    throw new AppError(
      'Location permission denied',
      ErrorType.PERMISSION,
      'Location access is required for this feature. Please enable location permissions in your device settings.',
      undefined,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

// Camera-specific error handling
export async function withCameraPermission<T>(
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error('Camera permission error:', error);
    
    throw new AppError(
      'Camera permission denied',
      ErrorType.PERMISSION,
      'Camera access is required for this feature. Please enable camera permissions in your device settings.',
      undefined,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

// Generic async operation wrapper with loading states
export async function withLoadingState<T>(
  fn: () => Promise<T>,
  setLoading: (loading: boolean) => void,
  setError?: (error: string | null) => void
): Promise<T | null> {
  try {
    setLoading(true);
    if (setError) setError(null);
    
    const result = await fn();
    return result;
  } catch (error) {
    console.error('Operation failed:', error);
    
    const errorMessage = error instanceof AppError 
      ? error.userMessage 
      : 'Something went wrong. Please try again.';
    
    if (setError) {
      setError(errorMessage);
    }
    
    return null;
  } finally {
    setLoading(false);
  }
}

// Error boundary helper
export function logErrorToCrashlytics(error: Error, errorInfo?: any) {
  // In production, send to crash analytics service
  if (__DEV__) {
    console.error('Error logged:', error, errorInfo);
  } else {
    // Example: Sentry.captureException(error, { extra: errorInfo });
    console.error('Production error:', error.message);
  }
}

// Validate network connectivity
export async function checkNetworkConnectivity(): Promise<boolean> {
  try {
    const response = await fetch('https://httpbin.org/status/200', {
      method: 'HEAD',
      cache: 'no-cache',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}