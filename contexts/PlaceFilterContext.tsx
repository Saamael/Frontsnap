import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type PlaceFilterMode = 'my_places' | 'everyones_places' | 'friends_places';

interface PlaceFilterContextType {
  filterMode: PlaceFilterMode;
  setFilterMode: (mode: PlaceFilterMode) => void;
  isLoading: boolean;
}

const PlaceFilterContext = createContext<PlaceFilterContextType | undefined>(undefined);

const FILTER_STORAGE_KEY = '@frontsnap_place_filter_mode';

interface PlaceFilterProviderProps {
  children: ReactNode;
}

export const PlaceFilterProvider: React.FC<PlaceFilterProviderProps> = ({ children }) => {
  const [filterMode, setFilterModeState] = useState<PlaceFilterMode>('everyones_places');
  const [isLoading, setIsLoading] = useState(true);

  // Load saved filter preference on mount
  useEffect(() => {
    loadFilterPreference();
  }, []);

  const loadFilterPreference = async () => {
    try {
      const savedMode = await AsyncStorage.getItem(FILTER_STORAGE_KEY);
      if (savedMode && (savedMode === 'my_places' || savedMode === 'everyones_places' || savedMode === 'friends_places')) {
        setFilterModeState(savedMode as PlaceFilterMode);
      }
    } catch (error) {
      console.error('Error loading filter preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setFilterMode = async (mode: PlaceFilterMode) => {
    try {
      setFilterModeState(mode);
      await AsyncStorage.setItem(FILTER_STORAGE_KEY, mode);
      console.log(`🔄 Filter mode changed to: ${mode}`);
    } catch (error) {
      console.error('Error saving filter preference:', error);
    }
  };

  return (
    <PlaceFilterContext.Provider
      value={{
        filterMode,
        setFilterMode,
        isLoading,
      }}
    >
      {children}
    </PlaceFilterContext.Provider>
  );
};

export const usePlaceFilter = (): PlaceFilterContextType => {
  const context = useContext(PlaceFilterContext);
  if (!context) {
    throw new Error('usePlaceFilter must be used within a PlaceFilterProvider');
  }
  return context;
};
