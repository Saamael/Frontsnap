import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { User, Map, MapPin, Gem } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LocationProvider, useLocation } from '@/contexts/LocationContext';
import { PlaceFilterProvider } from '@/contexts/PlaceFilterContext';
import { SettingsProvider, useSettings } from '@/contexts/SettingsContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function AppContent() {
  const router = useRouter();
  const { isAuthenticated, isLoading, hasSeenOnboarding } = useAuth();
  const { currentLocation, hasHiddenGem } = useLocation();
  const { colors, isDarkMode } = useSettings();
  const abortControllerRef = useRef<AbortController | null>(null);
  useFrameworkReady();
  
  // iOS-specific debugging
  console.log('🍎 iOS Debug - AppContent rendering with state:', {
    isAuthenticated,
    isLoading,
    hasSeenOnboarding,
    currentLocation
  });

  useEffect(() => {
    // Create abort controller for cleanup
    abortControllerRef.current = new AbortController();
    
    return () => {
      // Abort any ongoing async operations
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Note: LocationContext now handles location updates automatically - no need for focus effects



  const navigateToProfile = () => {
    router.push('/profile');
  };

  const navigateToMap = () => {
    router.push('/map');
  };

  const handleLocationPress = () => {
    router.push('/address-search');
  };

  // Show loading screen
  if (isLoading) {
    console.log('⏳ SHOWING LOADING SCREEN');
    console.log('🍎 iOS Debug - Returning loading screen, header will NOT render');
    return (
      <>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </>
    );
  }

  // Show onboarding for new users
  if (!hasSeenOnboarding) {
    console.log('📚 SHOWING ONBOARDING - NEW USER');
    console.log('🍎 iOS Debug - Returning onboarding screen, header will NOT render');
    return (
      <>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </>
    );
  }

  // Show auth screens for users who completed onboarding but aren't authenticated
  if (!isAuthenticated) {
    console.log('🚫 USER NOT AUTHENTICATED - SHOWING AUTH FLOW');
    console.log('🍎 iOS Debug - Current auth state:', { isAuthenticated, hasSeenOnboarding, isLoading });
    console.log('🍎 iOS Debug - Returning auth screen, header will NOT render');
    return (
      <>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </>
    );
  }

  // Authenticated users see the full app with Discover as main page
  console.log('✅ USER AUTHENTICATED - SHOWING MAIN APP');
  console.log('🍎 iOS Debug - Authentication state confirmed:', { isAuthenticated, hasSeenOnboarding, isLoading });
  console.log('🍎 iOS Debug - About to render main app with header');
  console.log('🔍 Header Debug - isAuthenticated:', isAuthenticated);
  console.log('🔍 Header Debug - hasSeenOnboarding:', hasSeenOnboarding);
  console.log('🔍 Header Debug - isLoading:', isLoading);
  console.log('🔍 Header Debug - currentLocation:', currentLocation);
  console.log('🔍 Header Debug - hasHiddenGem:', hasHiddenGem);

  // Create dynamic styles based on theme
  const dynamicStyles = createDynamicStyles(colors, isDarkMode);
  
  return (
    <SafeAreaView style={dynamicStyles.container}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      {/* Global Header */}
      <View style={dynamicStyles.globalHeader}>
        <TouchableOpacity style={dynamicStyles.headerButton} onPress={navigateToProfile}>
          <User size={24} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        
        <TouchableOpacity style={dynamicStyles.headerButton} onPress={() => router.push('/hidden-gem')}>
          <Gem 
            size={24} 
            color={hasHiddenGem ? "#FFD700" : colors.textSecondary} 
            strokeWidth={2} 
            fill={hasHiddenGem ? "#FFD700" : "none"} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity style={dynamicStyles.locationContainer} onPress={handleLocationPress}>
          <MapPin size={16} color={colors.text} strokeWidth={2} />
          <Text style={dynamicStyles.locationText} numberOfLines={1}>
            {currentLocation}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={dynamicStyles.headerButton} onPress={navigateToMap}>
          <Map size={24} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ headerShown: false }} />
          <Stack.Screen name="map" options={{ headerShown: false }} />
          <Stack.Screen name="hidden-gem" options={{ headerShown: false }} />
          <Stack.Screen name="address-search" options={{ headerShown: false }} />
          <Stack.Screen name="place/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
      </View>
    </SafeAreaView>
  );
}

// Dynamic styles function that takes theme colors
const createDynamicStyles = (colors: any, isDarkMode: boolean = false) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  globalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: colors.background,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    elevation: isDarkMode ? 4 : 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: isDarkMode ? 0.3 : 0.1,
    shadowRadius: 2,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    maxWidth: 200,
    gap: 8,
    position: 'relative',
  },
  locationText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
  headerErrorFallback: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  headerErrorText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

// Note: These styles are now moved into components that use useSettings hook
const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
});

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <AuthProvider>
          <LocationProvider>
            <PlaceFilterProvider>
              <AppContent />
            </PlaceFilterProvider>
          </LocationProvider>
        </AuthProvider>
      </SettingsProvider>
    </ErrorBoundary>
  );
}