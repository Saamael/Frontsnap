import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useLocation } from '../../hooks/useLocation';
import * as Location from 'expo-location';

jest.mock('expo-location');

const mockLocation = Location as jest.Mocked<typeof Location>;

describe('useLocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
      granted: true,
      expires: 'never',
      canAskAgain: true,
    });
    mockLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: {
        latitude: 40.7128,
        longitude: -74.0060,
        altitude: null,
        accuracy: 10,
        heading: null,
        speed: null,
        altitudeAccuracy: null,
      },
      timestamp: Date.now(),
    });
  });

  it('should request location permission and get current position', async () => {
    const { result } = renderHook(() => useLocation());

    expect(result.current.loading).toBe(true);
    expect(result.current.location).toBe(null);
    expect(result.current.error).toBe(null);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockLocation.requestForegroundPermissionsAsync).toHaveBeenCalled();
    expect(mockLocation.getCurrentPositionAsync).toHaveBeenCalled();
    expect(result.current.location).toEqual({
      latitude: 40.7128,
      longitude: -74.0060,
    });
  });

  it('should handle permission denied', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'denied',
      granted: false,
      expires: 'never',
      canAskAgain: false,
    });

    const { result } = renderHook(() => useLocation());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Location permission denied');
    expect(result.current.location).toBe(null);
  });

  it('should handle location fetch error', async () => {
    const error = new Error('Location unavailable');
    mockLocation.getCurrentPositionAsync.mockRejectedValue(error);

    const { result } = renderHook(() => useLocation());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to get location');
    expect(result.current.location).toBe(null);
  });

  it('should retry getting location', async () => {
    mockLocation.getCurrentPositionAsync
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          altitude: null,
          accuracy: 10,
          heading: null,
          speed: null,
          altitudeAccuracy: null,
        },
        timestamp: Date.now(),
      });

    const { result } = renderHook(() => useLocation());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to get location');

    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.location).toEqual({
        latitude: 40.7128,
        longitude: -74.0060,
      });
    });

    expect(mockLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(2);
  });

  it('should watch location when requested', async () => {
    let watchCallback: ((location: Location.LocationObject) => void) | null = null;
    
    mockLocation.watchPositionAsync = jest.fn().mockImplementation((options, callback) => {
      watchCallback = callback;
      return Promise.resolve({
        remove: jest.fn(),
      });
    });

    const { result } = renderHook(() => useLocation({ watch: true }));

    await waitFor(() => {
      expect(mockLocation.watchPositionAsync).toHaveBeenCalled();
    });

    const newLocation = {
      coords: {
        latitude: 41.8781,
        longitude: -87.6298,
        altitude: null,
        accuracy: 15,
        heading: null,
        speed: null,
        altitudeAccuracy: null,
      },
      timestamp: Date.now(),
    };

    act(() => {
      if (watchCallback) {
        watchCallback(newLocation);
      }
    });

    expect(result.current.location).toEqual({
      latitude: 41.8781,
      longitude: -87.6298,
    });
  });

  it('should use high accuracy when requested', async () => {
    renderHook(() => useLocation({ highAccuracy: true }));

    await waitFor(() => {
      expect(mockLocation.getCurrentPositionAsync).toHaveBeenCalledWith({
        accuracy: Location.Accuracy.High,
        maximumAge: 60000,
        timeout: 15000,
      });
    });
  });

  it('should use default accuracy when not specified', async () => {
    renderHook(() => useLocation());

    await waitFor(() => {
      expect(mockLocation.getCurrentPositionAsync).toHaveBeenCalledWith({
        accuracy: Location.Accuracy.Balanced,
        maximumAge: 60000,
        timeout: 10000,
      });
    });
  });

  it('should cleanup watch subscription on unmount', async () => {
    const mockRemove = jest.fn();
    mockLocation.watchPositionAsync = jest.fn().mockResolvedValue({
      remove: mockRemove,
    });

    const { unmount } = renderHook(() => useLocation({ watch: true }));

    await waitFor(() => {
      expect(mockLocation.watchPositionAsync).toHaveBeenCalled();
    });

    unmount();

    expect(mockRemove).toHaveBeenCalled();
  });
});