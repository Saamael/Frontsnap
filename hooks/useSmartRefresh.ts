import { useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface UseSmartRefreshProps {
  refreshFunction: () => Promise<void>;
  intervalMs?: number; // Default 30 seconds
  onlyWhenActive?: boolean; // Default true
  enabled?: boolean; // Default true
}

export const useSmartRefresh = ({
  refreshFunction,
  intervalMs = 30000, // 30 seconds
  onlyWhenActive = true,
  enabled = true
}: UseSmartRefreshProps) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);
  
  const startInterval = useCallback(() => {
    if (!enabled) return;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(async () => {
      if (!onlyWhenActive || appState.current === 'active') {
        try {
          console.log('🔄 Smart refresh: Starting auto-refresh...');
          await refreshFunction();
          console.log('🔄 Smart refresh: Auto-refresh completed successfully');
        } catch (error) {
          console.error('🔄 Smart refresh: Auto-refresh failed:', error);
        }
      }
    }, intervalMs);
    
    console.log(`🔄 Smart refresh: Interval started (${intervalMs / 1000}s)`);
  }, [refreshFunction, intervalMs, onlyWhenActive, enabled]);
  
  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('🔄 Smart refresh: Interval stopped');
    }
  }, []);
  
  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    const prevState = appState.current;
    appState.current = nextAppState;
    
    if (enabled && prevState.match(/inactive|background/) && nextAppState === 'active') {
      console.log('🔄 Smart refresh: App came to foreground, triggering refresh');
      refreshFunction().catch(error => {
        console.error('🔄 Smart refresh: Foreground refresh failed:', error);
      });
    }
  }, [refreshFunction, enabled]);
  
  useEffect(() => {
    if (enabled) {
      startInterval();
    } else {
      stopInterval();
    }
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      stopInterval();
      subscription?.remove();
    };
  }, [startInterval, stopInterval, handleAppStateChange, enabled]);
  
  return { 
    startInterval, 
    stopInterval,
    isActive: intervalRef.current !== null
  };
};