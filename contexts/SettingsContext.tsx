import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, ColorSchemeName } from 'react-native';

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  units: 'metric' | 'imperial';
  showTraffic: boolean;
  autoLocation: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra_large';
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export interface ThemeColors {
  primary: string;
  background: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  notification: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface SettingsContextType {
  // Current settings state
  settings: AppSettings;
  
  // Current theme colors
  colors: ThemeColors;
  isDarkMode: boolean;
  
  // Update methods
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  resetSettings: () => Promise<void>;
  
  // Loading states
  isLoading: boolean;
  
  // Real-time application
  applySettings: () => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  language: 'en',
  units: 'metric',
  showTraffic: false,
  autoLocation: true,
  fontSize: 'medium',
  soundEnabled: true,
  vibrationEnabled: true,
};

const LIGHT_COLORS: ThemeColors = {
  primary: '#007AFF',
  background: '#FFFFFF',
  surface: '#F2F2F7',
  card: '#FFFFFF',
  text: '#2C2C2E',
  textSecondary: '#8E8E93',
  border: '#E5E5EA',
  notification: '#FF3B30',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#007AFF',
};

const DARK_COLORS: ThemeColors = {
  primary: '#0A84FF',
  background: '#000000',
  surface: '#1C1C1E',
  card: '#2C2C2E',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#38383A',
  notification: '#FF453A',
  success: '#30D158',
  warning: '#FF9F0A',
  error: '#FF453A',
  info: '#64D2FF',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  // Determine current theme
  const getCurrentTheme = (): 'light' | 'dark' => {
    if (settings.theme === 'system') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return settings.theme;
  };

  const isDarkMode = getCurrentTheme() === 'dark';
  const colors = isDarkMode ? DARK_COLORS : LIGHT_COLORS;

  // Load settings on initialization
  useEffect(() => {
    loadSettings();
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener((preferences) => {
      setSystemColorScheme(preferences.colorScheme);
    });

    return () => subscription?.remove();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const savedSettings = await AsyncStorage.getItem('app_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings) as Partial<AppSettings>;
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = async <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ): Promise<void> => {
    try {
      const newSettings = { ...settings, [key]: value };
      
      // Save to AsyncStorage
      await AsyncStorage.setItem('app_settings', JSON.stringify(newSettings));
      
      // Update state
      setSettings(newSettings);
      
      // Apply settings immediately
      applySettings();
    } catch (error) {
      console.error('Error updating setting:', error);
      throw error;
    }
  };

  const resetSettings = async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem('app_settings');
      setSettings(DEFAULT_SETTINGS);
      applySettings();
    } catch (error) {
      console.error('Error resetting settings:', error);
      throw error;
    }
  };

  const applySettings = () => {
    // This method can be extended to apply settings across the app
    // For now, theme changes are handled via context consumers
    
    // Future implementations could include:
    // - Font size updates across components
    // - Map settings propagation
    // - Sound/vibration preference updates
    
    console.log('Settings applied:', settings);
  };

  const contextValue: SettingsContextType = {
    settings,
    colors,
    isDarkMode,
    updateSetting,
    resetSettings,
    isLoading,
    applySettings,
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

export default SettingsContext;