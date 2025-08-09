import { useSettings } from '@/contexts/SettingsContext';
import { StyleSheet } from 'react-native';

export const useTheme = () => {
  const { colors, isDarkMode } = useSettings();
  
  // Helper function to create themed styles
  const createStyles = <T extends StyleSheet.NamedStyles<T>>(
    stylesFn: (colors: typeof colors, isDarkMode: boolean) => T
  ): T => {
    return StyleSheet.create(stylesFn(colors, isDarkMode));
  };
  
  // Common themed styles
  const commonStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      shadowColor: isDarkMode ? '#000' : '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: isDarkMode ? 8 : 4,
    },
    text: {
      color: colors.text,
    },
    textSecondary: {
      color: colors.textSecondary,
    },
    border: {
      borderColor: colors.border,
    },
    surface: {
      backgroundColor: colors.surface,
    },
    primaryButton: {
      backgroundColor: colors.primary,
    },
    primaryText: {
      color: colors.primary,
    },
  });
  
  return {
    colors,
    isDarkMode,
    createStyles,
    commonStyles,
  };
};

export default useTheme;