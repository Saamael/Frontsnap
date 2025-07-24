import React, { useEffect, useState, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { User, Map, MapPin, Gem } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser } from '@/lib/supabase';

export default function RootLayout() {
  const router = useRouter();
  const [currentLocation, setCurrentLocation] = useState<string>('San Francisco, CA');
  const [hasHiddenGem, setHasHiddenGem] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean>(false);
  const mounted = useRef(true);
  useFrameworkReady();

  useEffect(() => {
    mounted.current = true;
    initializeApp();
    
    return () => {
      mounted.current = false;
    };
  }, []);

  // Listen for when user returns from address search
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated) {
        console.log('🔄 Header focus effect triggered - checking for location updates');
        loadLocationFromStorage();
      }
    }, [isAuthenticated])
  );

  // Load location once when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadLocationFromStorage();
    }
  }, [isAuthenticated]);

      const initializeApp = async () => {
      console.log('⏳ Starting app initialization...');
      
      try {
        // Check authentication first
        console.log('🔐 Checking authentication...');
        const user = await getCurrentUser();
        const authenticated = !!user;
        
        console.log('👤 Authentication result:', authenticated ? '✅ AUTHENTICATED' : '❌ NOT AUTHENTICATED');
        if (user) {
          console.log('👤 User data:', { id: user.id, email: user.email });
        }
        
        // Check if user has seen onboarding
        const onboardingValue = await AsyncStorage.getItem('onboarding_completed');
        let onboardingCompleted = onboardingValue === 'true';
        
        console.log('📚 Onboarding check:');
        console.log('  - Stored value:', onboardingValue);
        console.log('  - Completed:', onboardingCompleted);
        
        // If user is authenticated but onboarding isn't marked complete, mark it complete
        // This handles cases where user signed up but didn't go through onboarding
        if (authenticated && !onboardingCompleted) {
          console.log('🔧 User is authenticated but onboarding not complete - marking as complete');
          await AsyncStorage.setItem('onboarding_completed', 'true');
          onboardingCompleted = true;
        }
        
        if (mounted.current) {
          setHasSeenOnboarding(onboardingCompleted);
          setIsAuthenticated(authenticated);
          
          if (authenticated) {
            getCurrentLocation();
          }
        }
        
        console.log('📋 App state summary:');
        console.log('  - hasSeenOnboarding:', onboardingCompleted);
        console.log('  - isAuthenticated:', authenticated);
        console.log('  - Will show:', !onboardingCompleted ? 'ONBOARDING' : !authenticated ? 'AUTH' : 'MAIN APP');
        
        console.log('🏁 App initialization complete');
    } catch (error) {
      console.error('❌ Error during app initialization:', error);
    } finally {
      if (mounted.current) {
        setIsLoading(false);
      }
    }
  };

  const loadLocationFromStorage = async () => {
    try {
      const savedLocation = await AsyncStorage.getItem('selectedLocation');
      console.log('🔄 Header loading location from storage:', savedLocation);
      
      if (savedLocation) {
        const locationData = JSON.parse(savedLocation);
        console.log('🔄 Header parsed location data:', locationData);
        
        if (locationData.city && locationData.country) {
          const locationString = `${locationData.city}, ${locationData.country}`;
          
          // Only update if location has actually changed
          if (currentLocation !== locationString) {
            console.log('🔄 Header updating location to:', locationString);
            console.log('🔄 Current header location before update:', currentLocation);
            
            if (mounted.current) {
              setCurrentLocation(locationString);
              setHasHiddenGem(Math.random() > 0.3);
              console.log('📍 Header location state updated to:', locationString);
            }
          }
          return;
        }
      }
      
      console.log('🔄 No saved location found, using current location');
      // If no saved location, try to get current location
      await getCurrentLocation();
    } catch (error) {
      console.error('Error loading location from storage:', error);
      await getCurrentLocation();
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        
        if (reverseGeocode.length > 0 && mounted.current) {
          const { city, country } = reverseGeocode[0];
          setCurrentLocation(`${city}, ${country}`);
          setHasHiddenGem(Math.random() > 0.3);
        }
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

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
  return (
    <>
      <View style={styles.container}>
        {/* Global Header */}
        <View style={styles.globalHeader}>
          <TouchableOpacity style={styles.headerButton} onPress={navigateToProfile}>
            <User size={24} color="#2C2C2E" strokeWidth={2} />
          </TouchableOpacity>
          
          {hasHiddenGem && (
            <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/hidden-gem')}>
              <Gem size={24} color="#FFD700" strokeWidth={2} fill="#FFD700" />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.locationContainer} onPress={handleLocationPress}>
            <MapPin size={16} color="#2C2C2E" strokeWidth={2} />
            <Text style={styles.locationText} numberOfLines={1}>
              {currentLocation}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.headerButton} onPress={navigateToMap}>
            <Map size={24} color="#2C2C2E" strokeWidth={2} />
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
            <Stack.Screen name="discover" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
        </View>
      </View>
      <StatusBar style="auto" />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  globalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
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
    color: '#2C2C2E',
    flex: 1,
  },

  content: {
    flex: 1,
  },
});