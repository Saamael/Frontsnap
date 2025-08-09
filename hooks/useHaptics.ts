import { useCallback } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export interface HapticConfig {
  enableHaptics?: boolean;
}

/**
 * Custom hook for managing haptic feedback throughout the app
 * Based on the latest Expo Haptics API (2024)
 */
export const useHaptics = (config: HapticConfig = { enableHaptics: true }) => {
  const { enableHaptics = true } = config;

  // Selection feedback - for indicating selection changes
  const selectionFeedback = useCallback(() => {
    if (!enableHaptics || Platform.OS === 'web') return;
    try {
      Haptics.selectionAsync();
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [enableHaptics]);

  // Impact feedback - for UI interactions
  const impactLight = useCallback(() => {
    if (!enableHaptics || Platform.OS === 'web') return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [enableHaptics]);

  const impactMedium = useCallback(() => {
    if (!enableHaptics || Platform.OS === 'web') return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [enableHaptics]);

  const impactHeavy = useCallback(() => {
    if (!enableHaptics || Platform.OS === 'web') return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [enableHaptics]);

  // Notification feedback - for success/warning/error states
  const notificationSuccess = useCallback(() => {
    if (!enableHaptics || Platform.OS === 'web') return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [enableHaptics]);

  const notificationWarning = useCallback(() => {
    if (!enableHaptics || Platform.OS === 'web') return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [enableHaptics]);

  const notificationError = useCallback(() => {
    if (!enableHaptics || Platform.OS === 'web') return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [enableHaptics]);

  // Contextual feedback helpers
  const buttonPress = useCallback(() => {
    impactLight();
  }, [impactLight]);

  const toggleSwitch = useCallback(() => {
    selectionFeedback();
  }, [selectionFeedback]);

  const photoCapture = useCallback(() => {
    impactMedium();
  }, [impactMedium]);

  const placeDiscovered = useCallback(() => {
    notificationSuccess();
  }, [notificationSuccess]);

  const hiddenGemFound = useCallback(() => {
    // Double success for special moments
    notificationSuccess();
    setTimeout(() => notificationSuccess(), 150);
  }, [notificationSuccess]);

  const errorOccurred = useCallback(() => {
    notificationError();
  }, [notificationError]);

  const warningAlert = useCallback(() => {
    notificationWarning();
  }, [notificationWarning]);

  const shareSuccess = useCallback(() => {
    notificationSuccess();
  }, [notificationSuccess]);

  const addToCollection = useCallback(() => {
    impactMedium();
  }, [impactMedium]);

  const navigationBack = useCallback(() => {
    impactLight();
  }, [impactLight]);

  const refreshAction = useCallback(() => {
    impactLight();
  }, [impactLight]);

  const longPress = useCallback(() => {
    impactHeavy();
  }, [impactHeavy]);

  const swipeAction = useCallback(() => {
    selectionFeedback();
  }, [selectionFeedback]);

  return {
    // Core haptic functions
    selectionFeedback,
    impactLight,
    impactMedium,
    impactHeavy,
    notificationSuccess,
    notificationWarning,
    notificationError,
    
    // Contextual helpers
    buttonPress,
    toggleSwitch,
    photoCapture,
    placeDiscovered,
    hiddenGemFound,
    errorOccurred,
    warningAlert,
    shareSuccess,
    addToCollection,
    navigationBack,
    refreshAction,
    longPress,
    swipeAction,
  };
};

export default useHaptics;