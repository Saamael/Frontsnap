import * as Haptics from 'expo-haptics';

/**
 * Haptic feedback utilities for improved user experience
 */

export const HapticFeedback = {
  /**
   * Light haptic feedback for button taps and selections
   */
  light: () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  },

  /**
   * Medium haptic feedback for successful actions
   */
  medium: () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  },

  /**
   * Heavy haptic feedback for important actions
   */
  heavy: () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  },

  /**
   * Success haptic feedback for completed actions
   */
  success: () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  },

  /**
   * Warning haptic feedback for caution actions
   */
  warning: () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  },

  /**
   * Error haptic feedback for failed actions
   */
  error: () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  },

  /**
   * Selection haptic feedback for picker/selector changes
   */
  selection: () => {
    try {
      Haptics.selectionAsync();
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  }
};