import { useState, useCallback } from 'react';
import { ToastType } from '@/components/Toast';
import { HapticFeedback } from '@/utils/haptics';

export interface ToastState {
  visible: boolean;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export const useToast = () => {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    duration: 3000,
  });

  const showToast = useCallback((
    type: ToastType,
    title: string,
    message?: string,
    duration: number = 3000
  ) => {
    // Trigger appropriate haptic feedback
    switch (type) {
      case 'success':
        HapticFeedback.success();
        break;
      case 'error':
        HapticFeedback.error();
        break;
      case 'warning':
        HapticFeedback.warning();
        break;
      case 'info':
        HapticFeedback.light();
        break;
    }

    setToast({
      visible: true,
      type,
      title,
      message,
      duration,
    });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  const showSuccess = useCallback((title: string, message?: string, duration?: number) => {
    showToast('success', title, message, duration);
  }, [showToast]);

  const showError = useCallback((title: string, message?: string, duration?: number) => {
    showToast('error', title, message, duration);
  }, [showToast]);

  const showWarning = useCallback((title: string, message?: string, duration?: number) => {
    showToast('warning', title, message, duration);
  }, [showToast]);

  const showInfo = useCallback((title: string, message?: string, duration?: number) => {
    showToast('info', title, message, duration);
  }, [showToast]);

  return {
    toast,
    showToast,
    hideToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};