import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { LocationCoords } from '@/types/capture';
import { withLocationPermission, AppError, ErrorType } from '@/utils/error-handling';

export interface UseLocationReturn {
  currentLocation: LocationCoords | null;
  hasPermission: boolean | null;
  isLoading: boolean;
  error: string | null;
  requestPermission: () => Promise<boolean>;
  getCurrentLocation: () => Promise<LocationCoords | null>;
  reverseGeocode: (coords: LocationCoords) => Promise<string>;
}

export const useDeviceLocation = (): UseLocationReturn => {
  const [currentLocation, setCurrentLocation] = useState<LocationCoords | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setHasPermission(status === 'granted');
    } catch (error) {
      console.error('Error checking location permissions:', error);
      setHasPermission(false);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    try {
      setError(null);
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setHasPermission(granted);
      return granted;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setError('Failed to request location permission');
      setHasPermission(false);
      return false;
    }
  };

  const getCurrentLocation = async (): Promise<LocationCoords | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const location = await withLocationPermission(
        async () => {
          // Check if permission is already granted
          if (hasPermission === false) {
            const granted = await requestPermission();
            if (!granted) {
              throw new AppError(
                'Location permission denied',
                ErrorType.PERMISSION,
                'Location access is required for place identification.'
              );
            }
          }

          const result = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          return {
            latitude: result.coords.latitude,
            longitude: result.coords.longitude,
          };
        },
        // Fallback to default location (San Francisco)
        async () => {
          console.log('Using default location (San Francisco)');
          return { latitude: 37.7749, longitude: -122.4194 };
        }
      );

      setCurrentLocation(location);
      return location;
    } catch (error) {
      const errorMessage = error instanceof AppError 
        ? error.userMessage 
        : 'Unable to get your location. Using default location.';
      
      setError(errorMessage);
      
      // Fallback to default location
      const defaultLocation = { latitude: 37.7749, longitude: -122.4194 };
      setCurrentLocation(defaultLocation);
      return defaultLocation;
    } finally {
      setIsLoading(false);
    }
  };

  const reverseGeocode = async (coords: LocationCoords): Promise<string> => {
    try {
      const result = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      if (result.length > 0) {
        const { street, city, region, country } = result[0];
        const addressParts = [street, city, region, country].filter(Boolean);
        return addressParts.join(', ');
      }

      return `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
    }
  };

  return {
    currentLocation,
    hasPermission,
    isLoading,
    error,
    requestPermission,
    getCurrentLocation,
    reverseGeocode,
  };
};