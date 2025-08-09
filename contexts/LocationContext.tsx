import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { getActiveHiddenGemsByCity } from '@/lib/supabase';

export interface LocationData {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  isCurrentLocation: boolean;
}

export interface LocationContextType {
  currentLocation: string;
  locationData: LocationData | null;
  isLoading: boolean;
  hasHiddenGem: boolean;
  locationKey: number;
  lastLocationUpdate: number;
  updateLocation: (location: LocationData) => Promise<void>;
  getCurrentLocation: () => Promise<void>;
  refreshLocation: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

interface LocationProviderProps {
  children: ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState<string>('San Francisco, CA');
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasHiddenGem, setHasHiddenGem] = useState<boolean>(true);
  const [locationKey, setLocationKey] = useState<number>(Date.now());
  const [lastLocationUpdate, setLastLocationUpdate] = useState<number>(Date.now());

  // Initialize location on mount
  useEffect(() => {
    console.log('🌍 LocationProvider: Initializing location state...');
    loadLocationFromStorage();
  }, []);

  const checkHiddenGemsInCity = async (city: string) => {
    if (!city) return false;
    
    try {
      console.log(`💎 Checking hidden gems for city: ${city}`);
      const activeGems = await getActiveHiddenGemsByCity(city);
      const hasGems = activeGems.length > 0;
      console.log(`💎 Hidden Gem Check for "${city}":`, {
        activeGemsCount: activeGems.length,
        hasGems,
        gems: activeGems.map(g => ({ id: g.id, title: g.title, is_active: g.is_active }))
      });
      setHasHiddenGem(hasGems);
      return hasGems;
    } catch (error) {
      console.error('Error checking hidden gems:', error);
      setHasHiddenGem(false);
      return false;
    }
  };

  const loadLocationFromStorage = async () => {
    try {
      setIsLoading(true);
      const savedLocation = await AsyncStorage.getItem('selectedLocation');
      console.log('🌍 LocationProvider: Loading from storage:', savedLocation);
      
      if (savedLocation) {
        const locationData = JSON.parse(savedLocation) as LocationData;
        console.log('🌍 LocationProvider: Parsed location data:', locationData);
        
        if (locationData.city && locationData.country) {
          const locationString = `${locationData.city}, ${locationData.country}`;
          
          console.log('🌍 LocationProvider: Setting location to:', locationString);
          setCurrentLocation(locationString);
          setLocationData(locationData);
          await checkHiddenGemsInCity(locationData.city);
          return;
        }
      }
      
      console.log('🌍 LocationProvider: No saved location, getting current location...');
      await getCurrentLocationInternal();
    } catch (error) {
      console.error('🌍 LocationProvider: Error loading location:', error);
      await getCurrentLocationInternal();
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentLocationInternal = async () => {
    try {
      console.log('🌍 LocationProvider: Getting current location...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        try {
          // Try reverse geocoding to get city name
          const reverseGeocode = await Location.reverseGeocodeAsync({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
          
          if (reverseGeocode.length > 0) {
            const { city, country } = reverseGeocode[0];
            const locationData: LocationData = {
              city: city || 'Current Location',
              country: country || 'Unknown',
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              isCurrentLocation: true
            };
            
            const locationString = `${locationData.city}, ${locationData.country}`;
            console.log('🌍 LocationProvider: Got reverse geocoded location:', locationString);
            setCurrentLocation(locationString);
            setLocationData(locationData);
            await checkHiddenGemsInCity(locationData.city);
            return;
          }
        } catch (reverseError) {
          console.warn('🌍 LocationProvider: Reverse geocoding failed:', reverseError);
        }
        
        // Fallback if reverse geocoding fails
        const locationData: LocationData = {
          city: 'Current Location',
          country: 'Unknown',
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          isCurrentLocation: true
        };
        
        console.log('🌍 LocationProvider: Using fallback location data:', locationData);
        setCurrentLocation('Current Location');
        setLocationData(locationData);
        await checkHiddenGemsInCity('San Francisco'); // Default city for gems
      } else {
        console.log('🌍 LocationProvider: Location permission denied, using default');
        // Keep default San Francisco
      }
    } catch (error) {
      console.error('🌍 LocationProvider: Error getting current location:', error);
      // Keep default location
    }
  };

  const updateLocation = useCallback(async (location: LocationData) => {
    try {
      console.log('🌍 LocationProvider: Updating location to:', location);
      setIsLoading(true);
      
      // Reset hidden gem state while we check the new location
      setHasHiddenGem(false);
      
      // Update state immediately for reactive UI
      const locationString = `${location.city}, ${location.country}`;
      setCurrentLocation(locationString);
      setLocationData(location);
      
      // Persist to AsyncStorage first
      await AsyncStorage.setItem('selectedLocation', JSON.stringify(location));
      console.log('🌍 LocationProvider: Location updated and saved successfully!');
      
      // Check for hidden gems asynchronously (don't block navigation)
      checkHiddenGemsInCity(location.city).catch(error => {
        console.error('Error checking hidden gems:', error);
      });
      
      // Update location key AND timestamp to force re-renders in components
      const timestamp = Date.now();
      setLocationKey(timestamp);
      setLastLocationUpdate(timestamp);
      
    } catch (error) {
      console.error('🌍 LocationProvider: Error updating location:', error);
      throw error; // Re-throw to allow error handling in components
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getCurrentLocation = useCallback(async () => {
    await getCurrentLocationInternal();
  }, []);

  const refreshLocation = useCallback(async () => {
    console.log('🌍 LocationProvider: Refreshing location...');
    await loadLocationFromStorage();
  }, []);

  const value = useMemo(() => ({
    currentLocation,
    locationData,
    isLoading,
    hasHiddenGem,
    locationKey,
    lastLocationUpdate,
    updateLocation,
    getCurrentLocation,
    refreshLocation
  }), [currentLocation, locationData, isLoading, hasHiddenGem, locationKey, lastLocationUpdate, updateLocation, getCurrentLocation, refreshLocation]);

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};
