// This file provides specialized hooks based on the main SettingsContext
// The main useSettings hook is exported from SettingsContext directly
import { useSettings } from '@/contexts/SettingsContext';

// Re-export the main hook
export { useSettings };

/**
 * Hook to access only theme-related settings
 * Useful for components that only need theme information
 */
export function useTheme() {
  const { colors, isDarkMode, settings } = useSettings();
  
  return {
    colors,
    isDarkMode,
    theme: settings.theme,
  };
}

/**
 * Hook to access only typography settings
 * Useful for components that need font size information
 */
export function useTypography() {
  const { settings } = useSettings();
  
  const fontSizeMultipliers = {
    small: 0.9,
    medium: 1.0,
    large: 1.1,
    extra_large: 1.2,
  };
  
  return {
    fontSize: settings.fontSize,
    fontSizeMultiplier: fontSizeMultipliers[settings.fontSize],
  };
}

/**
 * Hook to access location-related settings
 * Useful for map and location components
 */
export function useLocationSettings() {
  const { settings } = useSettings();
  
  return {
    units: settings.units,
    showTraffic: settings.showTraffic,
    autoLocation: settings.autoLocation,
  };
}

/**
 * Hook to access feedback settings
 * Useful for components that provide haptic/audio feedback
 */
export function useFeedbackSettings() {
  const { settings } = useSettings();
  
  return {
    soundEnabled: settings.soundEnabled,
    vibrationEnabled: settings.vibrationEnabled,
  };
}

export default useSettings;