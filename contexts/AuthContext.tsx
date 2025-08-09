import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser, supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasSeenOnboarding: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  signIn: (user: User) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    hasSeenOnboarding: false,
    error: null,
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const initializationRef = useRef<Promise<void> | null>(null);
  const stateWatcherRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastStateRef = useRef<AuthState>(state);

  useEffect(() => {
    // Create abort controller for cleanup
    abortControllerRef.current = new AbortController();
    
    // Initialize auth state
    initializeAuth();
    // Auth state is now handled by Supabase listener
    
    return () => {
      // Abort any ongoing async operations
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Clear state watcher
      if (stateWatcherRef.current) {
        clearInterval(stateWatcherRef.current);
      }
      
      // Clear any pending timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const updateState = (updates: Partial<AuthState>) => {
    console.log('🍎 iOS Debug - updateState called with:', updates);
    console.log('🍎 iOS Debug - abortController signal aborted?', abortControllerRef.current?.signal.aborted);
    
    if (!abortControllerRef.current?.signal.aborted) {
      console.log('🍎 iOS Debug - About to call setState...');
      setState(prevState => {
        const newState = { ...prevState, ...updates };
        console.log('🔄 AuthContext state updating:', {
          previous: { isAuthenticated: prevState.isAuthenticated, hasSeenOnboarding: prevState.hasSeenOnboarding },
          new: { isAuthenticated: newState.isAuthenticated, hasSeenOnboarding: newState.hasSeenOnboarding }
        });
        console.log('🍎 iOS Debug - setState callback executed, returning new state:', {
          isAuthenticated: newState.isAuthenticated,
          hasSeenOnboarding: newState.hasSeenOnboarding,
          isLoading: newState.isLoading
        });
        return newState;
      });
      console.log('🍎 iOS Debug - setState call completed');
    } else {
      console.warn('⚠️ AuthContext: Attempted to update state after abort');
      console.log('🍎 iOS Debug - State update blocked by abort signal!');
    }
  };

  const forceUpdate = () => {
    if (!abortControllerRef.current?.signal.aborted) {
      setState(prevState => ({ ...prevState }));
    }
  };

  // Authentication state synchronization with Supabase
  const syncAuthState = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        // Don't log AuthSessionMissingError as it's expected when no session exists
        if (error.message !== 'Auth session missing.' && !error.message.includes('AuthSessionMissingError')) {
          console.error('Auth sync error:', error);
        }
        return;
      }

      const isCurrentlyAuthenticated = !!user;
      
      // Only update if state actually changed to prevent infinite loops
      if (isCurrentlyAuthenticated !== state.isAuthenticated || 
          (user && user.id !== state.user?.id)) {
        
        console.log('🔄 Auth state sync triggered:', {
          wasAuthenticated: state.isAuthenticated,
          isAuthenticated: isCurrentlyAuthenticated,
          userChanged: user?.id !== state.user?.id
        });

        if (isCurrentlyAuthenticated && user) {
          setState(prev => ({
            ...prev,
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null
          }));
        } else {
          setState(prev => ({
            ...prev,
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          }));
        }
      }
    } catch (error) {
      console.error('Auth sync failed:', error);
    }
  };

  // Set up auth state listener
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: string, session: any) => {
        console.log('🔐 Auth state change:', event);
        await syncAuthState();
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Update last state reference whenever state changes
  useEffect(() => {
    lastStateRef.current = state;
    console.log('📊 AuthState Change Detected:', {
      isAuthenticated: state.isAuthenticated,
      hasSeenOnboarding: state.hasSeenOnboarding,
      isLoading: state.isLoading,
      hasUser: !!state.user
    });
  }, [state]);

  const setError = (error: string | null) => {
    if (!abortControllerRef.current?.signal.aborted) {
      setState(prevState => ({ ...prevState, error }));
    }
  };

  const initializeAuth = async (): Promise<void> => {
    try {
      console.log('🔐 Initializing authentication...');
      
      // Check onboarding status first
      const onboardingValue = await AsyncStorage.getItem('onboarding_completed');
      const hasSeenOnboarding = onboardingValue === 'true';
      
      console.log('📚 Onboarding status:', hasSeenOnboarding);
      
      // Check current user authentication
      const user = await getCurrentUser();
      const isAuthenticated = !!user;
      
      console.log('👤 Authentication status:', isAuthenticated);
      if (user) {
        console.log('👤 User:', { id: user.id, email: user.email });
      }
      
      // If user is authenticated but hasn't seen onboarding, mark onboarding as complete
      let finalOnboardingStatus = hasSeenOnboarding;
      if (isAuthenticated && !hasSeenOnboarding) {
        console.log('🔧 Marking onboarding as complete for authenticated user');
        await AsyncStorage.setItem('onboarding_completed', 'true');
        finalOnboardingStatus = true;
      }
      
      updateState({
        user,
        isAuthenticated,
        hasSeenOnboarding: finalOnboardingStatus,
        isLoading: false,
        error: null,
      });
      
      console.log('✅ Authentication initialization complete');
      console.log('📋 Final state:', {
        isAuthenticated,
        hasSeenOnboarding: finalOnboardingStatus,
      });
      
    } catch (error) {
      console.error('❌ Error initializing auth:', error);
      setError(error instanceof Error ? error.message : 'Authentication initialization failed');
      
      updateState({
        user: null,
        isAuthenticated: false,
        hasSeenOnboarding: false,
        isLoading: false,
      });
    }
  };

  const signIn = async (user: User): Promise<void> => {
    try {
      console.log('🔐 Signing in user:', { id: user.id, email: user.email });
      console.log('🍎 iOS Debug - signIn function started');
      console.log('🔐 Current state before signIn:', {
        isAuthenticated: state.isAuthenticated,
        hasSeenOnboarding: state.hasSeenOnboarding,
        isLoading: state.isLoading
      });
      
      console.log('🍎 iOS Debug - About to set onboarding storage...');
      // Ensure onboarding is marked complete when user signs in
      await AsyncStorage.setItem('onboarding_completed', 'true');
      console.log('🍎 iOS Debug - Onboarding storage set successfully');
      
      console.log('🍎 iOS Debug - About to call updateState...');
      // Update all authentication state at once to prevent race conditions
      updateState({
        user,
        isAuthenticated: true,
        hasSeenOnboarding: true,
        isLoading: false,
        error: null,
      });
      console.log('🍎 iOS Debug - updateState call completed');
      
      console.log('✅ User signed in successfully');
      console.log('🔐 Expected new state after signIn:', {
        isAuthenticated: true,
        hasSeenOnboarding: true,
        isLoading: false
      });
      
      console.log('🍎 iOS Debug - About to set forceUpdate timeout...');
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Force a re-render to ensure state propagation
      timeoutRef.current = setTimeout(() => {
        console.log('🔄 Force updating state to ensure re-render');
        console.log('🍎 iOS Debug - forceUpdate timeout executed');
        forceUpdate();
        timeoutRef.current = null;
      }, 100);
      console.log('🍎 iOS Debug - signIn function completed successfully');
      
    } catch (error) {
      console.error('❌ Error signing in:', error);
      console.log('🍎 iOS Debug - signIn function caught error:', error);
      setError(error instanceof Error ? error.message : 'Sign in failed');
      throw error;
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      console.log('🚪 Signing out user');
      
      updateState({
        user: null,
        isAuthenticated: false,
        error: null,
      });
      
      // Note: We don't clear onboarding status on sign out
      // Users who have seen onboarding don't need to see it again
      
      console.log('✅ User signed out successfully');
    } catch (error) {
      console.error('❌ Error signing out:', error);
      setError(error instanceof Error ? error.message : 'Sign out failed');
      throw error;
    }
  };

  const refreshAuth = async (): Promise<void> => {
    try {
      console.log('🔄 Refreshing authentication...');
      
      const user = await getCurrentUser();
      const isAuthenticated = !!user;
      
      updateState({
        user,
        isAuthenticated,
        error: null,
      });
      
      console.log('✅ Authentication refreshed:', { isAuthenticated });
    } catch (error) {
      console.error('❌ Error refreshing auth:', error);
      setError(error instanceof Error ? error.message : 'Authentication refresh failed');
      
      // On refresh error, assume user is not authenticated
      updateState({
        user: null,
        isAuthenticated: false,
      });
    }
  };

  const completeOnboarding = async (): Promise<void> => {
    try {
      console.log('📚 Completing onboarding...');
      
      await AsyncStorage.setItem('onboarding_completed', 'true');
      updateState({ hasSeenOnboarding: true });
      
      console.log('✅ Onboarding completed');
    } catch (error) {
      console.error('❌ Error completing onboarding:', error);
      setError(error instanceof Error ? error.message : 'Failed to complete onboarding');
      throw error;
    }
  };

  const clearError = (): void => {
    setError(null);
  };

  const contextValue: AuthContextType = {
    ...state,
    signIn,
    signOut,
    refreshAuth,
    completeOnboarding,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for auth status with automatic refresh
export const useAuthStatus = () => {
  const { isAuthenticated, user, isLoading, refreshAuth } = useAuth();
  
  useEffect(() => {
    // Refresh auth status when component mounts if not loading
    if (!isLoading && !user) {
      refreshAuth().catch(console.error);
    }
  }, [isLoading, user, refreshAuth]);
  
  return { isAuthenticated, user, isLoading };
};

// Custom hook for authentication actions
export const useAuthActions = () => {
  const { signIn, signOut, refreshAuth, completeOnboarding, clearError } = useAuth();
  
  return {
    signIn,
    signOut,
    refreshAuth,
    completeOnboarding,
    clearError,
  };
};

// Custom hook for protected routes
export const useRequireAuth = () => {
  const { isAuthenticated, isLoading } = useAuth();
  
  return {
    isAuthenticated,
    isLoading,
    shouldShowAuth: !isLoading && !isAuthenticated,
  };
};