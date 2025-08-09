import { withRetry, apiCall, AppError, ErrorType } from '../../utils/error-handling';

// Mock fetch for testing
global.fetch = jest.fn();

describe('Error Handling Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('withRetry', () => {
    it('should succeed on first try', async () => {
      const mockFn = jest.fn().mockResolvedValueOnce('success');
      
      const result = await withRetry(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');
      
      const retryPromise = withRetry(mockFn, { delay: 100 });
      
      // Fast-forward timers for delays
      jest.advanceTimersByTime(300);
      
      const result = await retryPromise;
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should respect maxRetries limit', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Always fails'));
      
      const retryPromise = withRetry(mockFn, { maxRetries: 2, delay: 100 });
      
      // Fast-forward timers
      jest.advanceTimersByTime(300);
      
      await expect(retryPromise).rejects.toThrow('Always fails');
      expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry AbortError', async () => {
      const abortError = new Error('Request aborted');
      abortError.name = 'AbortError';
      const mockFn = jest.fn().mockRejectedValue(abortError);
      
      await expect(withRetry(mockFn)).rejects.toThrow('Request aborted');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should call onRetry callback', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');
      const onRetry = jest.fn();
      
      const retryPromise = withRetry(mockFn, { onRetry, delay: 100 });
      
      jest.advanceTimersByTime(200);
      
      await retryPromise;
      
      expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1);
    });
  });

  describe('apiCall', () => {
    it('should make successful API calls', async () => {
      const mockResponse = { ok: true, json: jest.fn().mockResolvedValue({ data: 'test' }) };
      (fetch as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      const result = await apiCall('https://api.example.com/test');
      
      expect(result).toEqual({ data: 'test' });
      expect(fetch).toHaveBeenCalledWith('https://api.example.com/test', expect.any(Object));
    });

    it('should handle HTTP errors', async () => {
      const mockResponse = { 
        ok: false, 
        status: 404, 
        statusText: 'Not Found' 
      };
      (fetch as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      await expect(apiCall('https://api.example.com/test')).rejects.toThrow(AppError);
    });

    it('should handle network errors', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new TypeError('Network error'));
      
      try {
        await apiCall('https://api.example.com/test');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).type).toBe(ErrorType.NETWORK);
        expect((error as AppError).userMessage).toContain('internet connection');
      }
    });

    it('should handle timeout', async () => {
      (fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 15000))
      );
      
      const apiPromise = apiCall('https://api.example.com/test', { timeout: 5000 });
      
      jest.advanceTimersByTime(6000);
      
      try {
        await apiPromise;
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).type).toBe(ErrorType.TIMEOUT);
      }
    });

    it('should retry failed requests', async () => {
      (fetch as jest.Mock)
        .mockRejectedValueOnce(new TypeError('Network error'))
        .mockResolvedValueOnce({ 
          ok: true, 
          json: jest.fn().mockResolvedValue({ data: 'success' }) 
        });
      
      const apiPromise = apiCall('https://api.example.com/test', { 
        maxRetries: 1, 
        delay: 100 
      });
      
      jest.advanceTimersByTime(200);
      
      const result = await apiPromise;
      
      expect(result).toEqual({ data: 'success' });
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle abort signals', async () => {
      const abortController = new AbortController();
      
      (fetch as jest.Mock).mockImplementation(() => 
        Promise.reject(new DOMException('Aborted', 'AbortError'))
      );
      
      abortController.abort();
      
      try {
        await apiCall('https://api.example.com/test', { 
          abortSignal: abortController.signal 
        });
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).type).toBe(ErrorType.TIMEOUT);
      }
    });
  });

  describe('AppError', () => {
    it('should create AppError with all properties', () => {
      const originalError = new Error('Original');
      const appError = new AppError(
        'Test error',
        ErrorType.VALIDATION,
        'User friendly message',
        400,
        originalError
      );
      
      expect(appError.message).toBe('Test error');
      expect(appError.type).toBe(ErrorType.VALIDATION);
      expect(appError.userMessage).toBe('User friendly message');
      expect(appError.statusCode).toBe(400);
      expect(appError.originalError).toBe(originalError);
      expect(appError.name).toBe('AppError');
    });

    it('should be instance of Error', () => {
      const appError = new AppError('Test', ErrorType.UNKNOWN, 'User message');
      
      expect(appError).toBeInstanceOf(Error);
      expect(appError).toBeInstanceOf(AppError);
    });
  });
});