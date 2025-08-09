import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  FlatList,
} from 'react-native';
import { Search, MapPin, Star, Clock, Bookmark, Filter, SlidersHorizontal, Users, UserPlus, Globe } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getPlaces, searchPlaces, getNearbyPlaces, getFilteredPlaces, Place, getCurrentUser, getPublicPlaces, getNearbyPublicPlaces, getUserCollections, getCollectionPlaces, getUserAllPlaces, getPlacesWithFriendData, getNearbyPlacesWithFriendData, getFriendsOnlyPlaces, getNearbyFriendsOnlyPlaces, trackUserActivity, getPlacesInCityAndNearby, getFriendsOnlyPlacesInCityAndNearby, getPlacesWithFriendDataInCityAndNearby } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { HapticFeedback } from '@/utils/haptics';
import { useToast } from '@/hooks/useToast';
import { Toast } from '@/components/Toast';
import { CollectionSelector } from '@/components/CollectionSelector';
import { useLocation } from '@/contexts/LocationContext';
import { ScreenErrorBoundary } from '@/components/ErrorBoundary';
import { OptimizedImage } from '@/components/OptimizedImage';
import { validateSearchQuery, sanitizeInput } from '@/lib/validation';
import { PlaceCardSkeleton, ListLoadingSkeleton } from '@/components/LoadingSkeletons';
import { PlaceFilterToggle } from '@/components/PlaceFilterToggle';
import { usePlaceFilter } from '@/contexts/PlaceFilterContext';
import { useRealtimePlaces } from '@/hooks/useRealtimePlaces';
import { useSmartRefresh } from '@/hooks/useSmartRefresh';
import { prefetchPlacesWithPriority } from '@/utils/image-prefetch';

const categories = ['All', 'Coffee Shop', 'Restaurant', 'Nail Salon', 'Gym', 'Retail', 'Bookstore'];
const sortOptions = ['Distance', 'Rating', 'Newest', 'Most Reviews'];

interface LocationData {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  isCurrentLocation: boolean;
}

export default function DiscoverScreen() {
  const [searchText, setSearchText] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSort, setSelectedSort] = useState('Newest');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [localLocation, setLocalLocation] = useState<LocationData | null>(null);
  const [locationDisplayName, setLocationDisplayName] = useState<string>('');
  const router = useRouter();
  const mounted = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const prefetchAbortRef = useRef<AbortController | null>(null);
  const { toast, showSuccess, showError, showWarning, hideToast } = useToast();
  const { currentLocation: contextLocation, locationData, refreshLocation, isLoading: isLocationLoading, lastLocationUpdate } = useLocation();
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [showCollectionSelector, setShowCollectionSelector] = useState(false);
  const { filterMode, setFilterMode } = usePlaceFilter();
  // Social features state (Phase 2)
  const [userHasSocialFeatures, setUserHasSocialFeatures] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Preloading cache for all filter modes
  const [cachedPlaces, setCachedPlaces] = useState<{
    my_places: Place[];
    everyones_places: Place[];
    friends_places: Place[];
  }>({
    my_places: [],
    everyones_places: [],
    friends_places: []
  });
  const [cacheStatus, setCacheStatus] = useState<{
    my_places: 'loading' | 'ready' | 'error';
    everyones_places: 'loading' | 'ready' | 'error';
    friends_places: 'loading' | 'ready' | 'error';
  }>({
    my_places: 'loading',
    everyones_places: 'loading', 
    friends_places: 'loading'
  });

  // Real-time handlers for live updates
  const handleNewPlace = useCallback((newPlace: Place) => {
    console.log('🔄 Real-time: New place added:', newPlace.name);
    
    // Add to all relevant cached data
    setCachedPlaces(prev => ({
      ...prev,
      everyones_places: [newPlace, ...prev.everyones_places],
      // Add to my_places only if it's the current user's place
      my_places: newPlace.added_by === currentUser?.id 
        ? [newPlace, ...prev.my_places] 
        : prev.my_places
    }));
    
    // Update current display if relevant
    if (filterMode === 'everyones_places' || 
        (filterMode === 'my_places' && newPlace.added_by === currentUser?.id)) {
      setPlaces(prev => [newPlace, ...prev]);
    }
    
    // Show toast notification
    showSuccess('New Place', `${newPlace.name} was just added nearby!`);
  }, [filterMode, currentUser, setCachedPlaces, setPlaces, showSuccess]);

  const handleUpdatedPlace = useCallback((updatedPlace: Place) => {
    console.log('🔄 Real-time: Place updated:', updatedPlace.name);
    
    // Update all cached data
    setCachedPlaces(prev => ({
      my_places: prev.my_places.map(p => p.id === updatedPlace.id ? updatedPlace : p),
      everyones_places: prev.everyones_places.map(p => p.id === updatedPlace.id ? updatedPlace : p),
      friends_places: prev.friends_places.map(p => p.id === updatedPlace.id ? updatedPlace : p)
    }));
    
    // Update current display
    setPlaces(prev => prev.map(p => p.id === updatedPlace.id ? updatedPlace : p));
  }, [setCachedPlaces, setPlaces]);

  const handleDeletedPlace = useCallback((placeId: string) => {
    console.log('🔄 Real-time: Place deleted:', placeId);
    
    // Remove from all cached data
    setCachedPlaces(prev => ({
      my_places: prev.my_places.filter(p => p.id !== placeId),
      everyones_places: prev.everyones_places.filter(p => p.id !== placeId),
      friends_places: prev.friends_places.filter(p => p.id !== placeId)
    }));
    
    // Remove from current display
    setPlaces(prev => prev.filter(p => p.id !== placeId));
  }, [setCachedPlaces, setPlaces]);

  // Enable real-time subscriptions
  useRealtimePlaces({
    locationData,
    onPlaceAdded: handleNewPlace,
    onPlaceUpdated: handleUpdatedPlace,
    onPlaceDeleted: handleDeletedPlace
  });

  // Smart refresh for background updates and app state changes  
  const refreshAllData = useCallback(async () => {
    if (locationData && mounted.current && !isLoading) {
      console.log('🔄 Smart refresh: Refreshing cached data only');
      // Only refresh the current filter mode to avoid clearing visible images
      await preloadAllFilterModes(locationData);
    }
  }, [locationData, isLoading]);

  useSmartRefresh({
    refreshFunction: refreshAllData,
    intervalMs: 30000, // Refresh every 30 seconds
    onlyWhenActive: true,
    enabled: isAuthenticated && !!locationData
  });

  useEffect(() => {
    mounted.current = true;
    abortControllerRef.current = new AbortController();
    initializeScreen();
    
    // Filter switching via buttons only
    console.log('🔲 Filter buttons enabled for switching modes');
    
    return () => {
      mounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (prefetchAbortRef.current) {
        prefetchAbortRef.current.abort();
      }
    };
  }, []);

  // Memoized filtered places to prevent unnecessary re-renders
  const filteredPlaces = useMemo(() => {
    let filtered = places;

    // Apply search filter first
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = places.filter(place => 
        place.name.toLowerCase().includes(searchLower) ||
        place.category.toLowerCase().includes(searchLower) ||
        place.address.toLowerCase().includes(searchLower) ||
        place.ai_summary?.toLowerCase().includes(searchLower) ||
        place.pros?.some(pro => pro.toLowerCase().includes(searchLower)) ||
        place.cons?.some(con => con.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply category filter (only if no search text)
    if (!searchText.trim() && selectedCategory !== 'All') {
      filtered = filtered.filter(place => place.category === selectedCategory);
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (selectedSort) {
        case 'Rating':
          // Sort by rating (descending), then by review count
          if (b.rating !== a.rating) {
            return b.rating - a.rating;
          }
          return b.review_count - a.review_count;
        case 'Newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'Most Reviews':
          return b.review_count - a.review_count;
        case 'Distance':
          // Distance sorting would need coordinates calculation
          // For now, sort by rating as fallback
          return b.rating - a.rating;
        default:
          return 0;
      }
    });
    
    console.log(`🔍 Filtered ${places.length} places to ${sorted.length} results`);
    console.log(`📊 Search: "${searchText}", Category: "${selectedCategory}", Sort: "${selectedSort}"`);
    return sorted;
  }, [places, searchText, selectedCategory, selectedSort]);

  // Prefetch images when filtered places change (above-the-fold first)
  useEffect(() => {
    if (filteredPlaces.length > 0 && mounted.current && !isLoading) {
      // Cancel previous prefetch if any
      if (prefetchAbortRef.current) {
        prefetchAbortRef.current.abort();
      }
      
      // Create new abort controller for this prefetch
      prefetchAbortRef.current = new AbortController();
      
      // Prefetch with priority - first 6 items immediately, rest in background
      console.log(`🖼️ Discover: Prefetching ${filteredPlaces.length} place images with priority`);
      prefetchPlacesWithPriority(
        filteredPlaces, 
        6, // First 6 items are high priority
        { signal: prefetchAbortRef.current.signal }
      ).catch(error => {
        if (error.name !== 'AbortError') {
          console.warn('Discover prefetch error:', error);
        }
      });
    }
  }, [filteredPlaces, isLoading]);

  // React to filter mode changes - use cached data for instant switching
  useEffect(() => {
    if (mounted.current && locationData) {
      console.log(`🔄 Filter mode changed to: ${filterMode} - switching to cached data`);
      
      // Immediately switch to cached data
      const cachedData = cachedPlaces[filterMode];
      const status = cacheStatus[filterMode];
      
      if (status === 'ready' && cachedData) {
        console.log(`⚡ Using cached data for ${filterMode}:`, cachedData.length, 'places');
        setPlaces(cachedData);
        setIsLoading(false);
      } else if (status === 'loading') {
        console.log(`⏳ Cache still loading for ${filterMode}`);
        setIsLoading(true);
        // Data will be set when cache finishes loading
      } else {
        console.log(`🔄 Cache miss for ${filterMode} - loading fresh data`);
        loadPlacesForLocation(locationData);
      }
    }
  }, [filterMode, cachedPlaces, cacheStatus]);

  // Note: Filter mode changes are now handled by the filterMode useEffect above

  // Note: No longer need useFocusEffect workaround - LocationContext handles updates instantly

  // Listen for location context changes (PRIMARY LOCATION SOURCE)
  useEffect(() => {
    if (locationData && mounted.current) {
      console.log('📍 LocationContext data changed - preloading all modes:', locationData);
      setLocalLocation(locationData);
      const displayName = `${locationData.city}, ${locationData.country}`;
      setLocationDisplayName(displayName);
      
      // Only clear cache if location actually changed (not just context update)
      if (localLocation?.city !== locationData.city || localLocation?.country !== locationData.country) {
        console.log('🔄 Location changed - clearing cache for fresh data');
        setCachedPlaces({
          my_places: [],
          everyones_places: [],
          friends_places: []
        });
        setCacheStatus({
          my_places: 'loading',
          everyones_places: 'loading', 
          friends_places: 'loading'
        });
        
        // Preload all filter modes for instant switching (only on location change)
        preloadAllFilterModes(locationData);
      } else {
        console.log('📍 Location context update - keeping existing cache');
      }
      
      setIsLoading(false);
    } else if (contextLocation && mounted.current) {
      console.log('📍 LocationContext location string updated:', contextLocation);
      setLocationDisplayName(contextLocation);
    } else if (mounted.current && !isLocationLoading) {
      console.log('📍 No location data available - showing empty state');
      setPlaces([]);
      setLocationDisplayName('Select Location');
      setIsLoading(false);
    }
  }, [locationData, contextLocation, isLocationLoading, userHasSocialFeatures]);
  
  // Watch cache updates and update current places when ready
  useEffect(() => {
    if (mounted.current) {
      const currentStatus = cacheStatus[filterMode];
      const currentCache = cachedPlaces[filterMode];
      
      if (currentStatus === 'ready' && currentCache) {
        console.log(`💾 Cache ready for ${filterMode} - updating places:`, currentCache.length);
        setPlaces(currentCache);
        setIsLoading(false);
      } else if (currentStatus === 'loading') {
        console.log(`🔄 Cache loading for ${filterMode}`);
        setIsLoading(true);
      }
    }
  }, [cachedPlaces, cacheStatus, filterMode]);

  const initializeScreen = async () => {
    try {
      // Check if operation was aborted
      if (abortControllerRef.current?.signal.aborted) return;
      
      // Check authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (abortControllerRef.current?.signal.aborted) return;
      
      if (!user) {
        router.replace('/auth/login');
        return;
      }

      // Check if user has social features enabled (Phase 2)
      try {
        const profile = await getCurrentUser();
        setCurrentUser(profile); // Store current user for real-time handlers
        if (profile?.allow_social_features) {
          setUserHasSocialFeatures(true);
        }
      } catch (error) {
        console.log('Could not check social features status:', error);
      }

      // No longer load from AsyncStorage - LocationContext useEffect will handle everything
      console.log('✅ Authentication verified - waiting for LocationContext to load places');
    } catch (error) {
      if (abortControllerRef.current?.signal.aborted) return;
      console.error('Error initializing screen:', error);
      router.replace('/auth/login');
    }
  };

  // REMOVED: loadLocationAndPlaces() - now using LocationContext exclusively

  const loadPlacesForLocation = async (location: LocationData) => {
    try {
      if (filterMode === 'my_places') {
        // Load user's places from collections with CORRECT filtering:
        // 1. All places in same city name
        // 2. PLUS places within 30km of city borders
        console.log(`🏠 Loading user's places in "${location.city}" + 30km radius (${location.latitude}, ${location.longitude})`);
        const user = await getCurrentUser();
        if (!user) {
          console.log('❌ No authenticated user found');
          setPlaces([]);
          return;
        }
        
        const allUserPlaces = await getUserAllPlaces(user.id);
        console.log(`📊 Loaded ${allUserPlaces.length} total user places - applying city + 30km filtering...`);
        
        // Helper function to extract city from address
        const extractCityFromAddress = (address: string): string => {
          if (!address) return '';
          const parts = address.split(',').map(part => part.trim());
          if (parts.length >= 2) {
            return parts[parts.length - 2] || parts[0];
          }
          return parts[0] || '';
        };
        
        // CORRECT FILTERING: Same city name OR within 30km radius
        const filteredUserPlaces = allUserPlaces.filter(place => {
          // Check if place is in same city
          const placeCity = extractCityFromAddress(place.address);
          const isSameCity = placeCity.toLowerCase().includes(location.city.toLowerCase()) || 
                            location.city.toLowerCase().includes(placeCity.toLowerCase());
          
          if (isSameCity) {
            console.log(`🏠 Including user place "${place.name}" - same city: "${placeCity}"`);
            return true;
          }
          
          // Check if within 30km radius
          const distance = calculateDistance(
            location.latitude,
            location.longitude,
            place.latitude,
            place.longitude
          );
          const withinRadius = distance <= 30000; // 30km in meters
          
          if (withinRadius) {
            console.log(`🗺️ Including user place "${place.name}" - within ${Math.round(distance/1000)}km radius (city: "${placeCity}")`);
            return true;
          }
          
          return false;
        });
        
        console.log(`✅ Loaded ${filteredUserPlaces.length} user places in "${location.city}" + nearby areas`);
        setPlaces(filteredUserPlaces);
      } else {
        // Load public places using CORRECT filtering: city name + 30km radius
        console.log(`🌍 Loading public places in "${location.city}" + 30km radius (${location.latitude}, ${location.longitude})`);
        
        let nearbyPlaces;
        
        // Use enhanced functions with proper city + radius filtering
        if (filterMode === 'friends_places') {
          // Friends-only mode: only show places friends have visited
          nearbyPlaces = await getFriendsOnlyPlacesInCityAndNearby(
            location.city,
            location.latitude,
            location.longitude,
            30000 // 30km radius from city borders
          );
          console.log(`✅ Loaded ${nearbyPlaces.length} friends-only places in "${location.city}" + nearby`);
        } else if (userHasSocialFeatures) {
          // Everyone mode with friend data: show all places + friend indicators
          nearbyPlaces = await getPlacesWithFriendDataInCityAndNearby(
            location.city,
            location.latitude,
            location.longitude,
            30000 // 30km radius from city borders
          );
          console.log(`✅ Loaded ${nearbyPlaces.length} places with friend data in "${location.city}" + nearby`);
        } else {
          // No social features: regular public places
          nearbyPlaces = await getPlacesInCityAndNearby(
            location.city,
            location.latitude,
            location.longitude,
            30000 // 30km radius from city borders
          );
          console.log(`✅ Loaded ${nearbyPlaces.length} public places in "${location.city}" + nearby`);
        }
        
        setPlaces(nearbyPlaces);
      }
    } catch (error) {
      console.error('Error loading places for location:', error);
      setPlaces([]); // Show empty state instead of loading all places
      showError('Location Error', 'Failed to load places for your location');
    }
  };

  // Helper function to calculate distance between two points (in meters)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };
  
  // Preload all filter modes for instant switching
  const preloadAllFilterModes = async (location: LocationData) => {
    if (!location) return;
    
    console.log('🚀 Preloading all filter modes for instant switching...');
    
    // Preload My Places
    const preloadMyPlaces = async () => {
      try {
        setCacheStatus(prev => ({ ...prev, my_places: 'loading' }));
        const user = await getCurrentUser();
        if (!user) {
          setCachedPlaces(prev => ({ ...prev, my_places: [] }));
          setCacheStatus(prev => ({ ...prev, my_places: 'ready' }));
          return;
        }
        
        const allUserPlaces = await getUserAllPlaces(user.id);
        const extractCityFromAddress = (address: string): string => {
          if (!address) return '';
          const parts = address.split(',').map(part => part.trim());
          if (parts.length >= 2) {
            return parts[parts.length - 2] || parts[0];
          }
          return parts[0] || '';
        };
        
        const filteredUserPlaces = allUserPlaces.filter(place => {
          const placeCity = extractCityFromAddress(place.address);
          const isSameCity = placeCity.toLowerCase().includes(location.city.toLowerCase()) || 
                            location.city.toLowerCase().includes(placeCity.toLowerCase());
          if (isSameCity) return true;
          
          const distance = calculateDistance(
            location.latitude, location.longitude, place.latitude, place.longitude
          );
          return distance <= 30000;
        });
        
        setCachedPlaces(prev => ({ ...prev, my_places: filteredUserPlaces }));
        setCacheStatus(prev => ({ ...prev, my_places: 'ready' }));
        console.log('✅ My Places preloaded:', filteredUserPlaces.length, 'places');
        
        // Prefetch images for cached data in background
        if (filteredUserPlaces.length > 0) {
          prefetchPlacesWithPriority(filteredUserPlaces, 4, { concurrency: 4 }).catch(() => {});
        }
      } catch (error) {
        console.error('❌ Error preloading My Places:', error);
        setCacheStatus(prev => ({ ...prev, my_places: 'error' }));
      }
    };
    
    // Preload Everyone Places
    const preloadEveryonePlaces = async () => {
      try {
        setCacheStatus(prev => ({ ...prev, everyones_places: 'loading' }));
        const everyonePlaces = userHasSocialFeatures
          ? await getPlacesWithFriendDataInCityAndNearby(location.city, location.latitude, location.longitude, 30000)
          : await getPlacesInCityAndNearby(location.city, location.latitude, location.longitude, 30000);
          
        setCachedPlaces(prev => ({ ...prev, everyones_places: everyonePlaces }));
        setCacheStatus(prev => ({ ...prev, everyones_places: 'ready' }));
        console.log('✅ Everyone Places preloaded:', everyonePlaces.length, 'places');
        
        // Prefetch images for cached data in background
        if (everyonePlaces.length > 0) {
          prefetchPlacesWithPriority(everyonePlaces, 4, { concurrency: 4 }).catch(() => {});
        }
      } catch (error) {
        console.error('❌ Error preloading Everyone Places:', error);
        setCacheStatus(prev => ({ ...prev, everyones_places: 'error' }));
      }
    };
    
    // Preload Friends Places
    const preloadFriendsPlaces = async () => {
      try {
        setCacheStatus(prev => ({ ...prev, friends_places: 'loading' }));
        const friendsPlaces = await getFriendsOnlyPlacesInCityAndNearby(
          location.city, location.latitude, location.longitude, 30000
        );
        
        setCachedPlaces(prev => ({ ...prev, friends_places: friendsPlaces }));
        setCacheStatus(prev => ({ ...prev, friends_places: 'ready' }));
        console.log('✅ Friends Places preloaded:', friendsPlaces.length, 'places');
        
        // Prefetch images for cached data in background
        if (friendsPlaces.length > 0) {
          prefetchPlacesWithPriority(friendsPlaces, 4, { concurrency: 4 }).catch(() => {});
        }
      } catch (error) {
        console.error('❌ Error preloading Friends Places:', error);
        setCacheStatus(prev => ({ ...prev, friends_places: 'error' }));
      }
    };
    
    // Load all modes in parallel
    await Promise.all([
      preloadMyPlaces(),
      preloadEveryonePlaces(), 
      preloadFriendsPlaces()
    ]);
    
    console.log('🎯 All filter modes preloaded and cached!');
  };

  // REMOVED: loadDefaultPlaces() - no longer needed, using proximity filtering only

  const onRefresh = async () => {
    setRefreshing(true);
    HapticFeedback.light();
    try {
      // Refresh location context
      await refreshLocation();
      
      // Clear cache and reload all filter modes
      if (locationData) {
        console.log('🔄 Refreshing all cached filter modes...');
        setCacheStatus({
          my_places: 'loading',
          everyones_places: 'loading', 
          friends_places: 'loading'
        });
        await preloadAllFilterModes(locationData);
      }
      
      showSuccess('Refreshed', 'All modes updated successfully');
    } catch (error) {
      showError('Refresh Failed', 'Unable to refresh places');
    } finally {
      setRefreshing(false);
    }
  };


  const handleSearch = (text: string) => {
    // Sanitize input to prevent XSS
    const sanitizedText = sanitizeInput(text, 100);
    
    // Validate search query if it's not empty
    if (sanitizedText.trim()) {
      const validation = validateSearchQuery(sanitizedText);
      if (!validation.isValid) {
        showError('Invalid Search', validation.error || 'Please enter a valid search term');
        return;
      }
      setSearchText(validation.sanitizedValue || sanitizedText);
    } else {
      setSearchText(sanitizedText);
    }
  };

  const handleCategoryFilter = (category: string) => {
    HapticFeedback.selection();
    setSelectedCategory(category);
  };

  const handleSort = (sortOption: string) => {
    HapticFeedback.selection();
    setSelectedSort(sortOption);
  };

  const navigateToPlace = (placeId: string) => {
    HapticFeedback.light();
    router.push(`/place/${placeId}`);
  };

  const handleBookmarkPress = (place: Place) => {
    HapticFeedback.medium();
    setSelectedPlace(place);
    setShowCollectionSelector(true);
  };

  const handleCollectionSelectorClose = async (placeSaved?: boolean) => {
    // Track activity if place was saved (Phase 2)
    if (placeSaved && selectedPlace && userHasSocialFeatures) {
      try {
        await trackUserActivity('place_saved', selectedPlace.id);
      } catch (error) {
        console.log('Could not track place save activity:', error);
      }
    }
    
    setShowCollectionSelector(false);
    setSelectedPlace(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `${Math.ceil(diffDays / 30)} months ago`;
  };

  const PlaceCard = React.memo(({ place }: { place: Place }) => {
    const [isSaved, setIsSaved] = useState(false);
    
    // Check if place is saved in user's collections on mount
    useEffect(() => {
      checkIfPlaceSaved();
    }, [place.id]);
    
    const checkIfPlaceSaved = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) return;
        
        // Check if place exists in any of user's collections
        const collections = await getUserCollections(user.id);
        let placeSaved = false;
        
        for (const collection of collections) {
          const places = await getCollectionPlaces(collection.id);
          if (places.some((p: Place) => p.id === place.id)) {
            placeSaved = true;
            break;
          }
        }
        
        setIsSaved(placeSaved);
      } catch (error) {
        console.error('Error checking if place is saved:', error);
      }
    };
    
    const accessibilityLabel = `${place.name}, ${place.category}, rated ${place.rating.toFixed(1)} stars, ${place.is_open ? 'currently open' : 'currently closed'}`;
    
    return (
      <TouchableOpacity 
        style={styles.placeCard} 
        onPress={() => navigateToPlace(place.id)}
        activeOpacity={1}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityHint="Double tap to view place details"
      >
        <OptimizedImage 
          source={{ uri: place.thumbnail_url || place.image_url }} 
          style={styles.placeImage}
          cachePolicy="memory-disk"
          placeholder="skeleton"
          resizeMode="cover"
          accessibilityLabel={`Photo of ${place.name}`}
        />
      
      <View style={styles.placeInfo}>
        <View style={styles.placeHeader}>
          <Text style={styles.placeName}>{place.name}</Text>
          <TouchableOpacity 
            style={styles.bookmarkButton}
            activeOpacity={0.7}
            onPress={() => {
              handleBookmarkPress(place);
              // Update saved state after saving
              checkIfPlaceSaved();
            }}
            accessibilityLabel={isSaved ? "Already saved to collection" : "Save to collection"}
            accessibilityRole="button"
            accessibilityHint={isSaved ? "This place is already saved" : "Save this place to a collection"}
          >
            <Bookmark 
              size={20} 
              color={isSaved ? "#6B7280" : "#8E8E93"} 
              strokeWidth={2} 
              fill={isSaved ? "#6B7280" : "none"}
            />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.placeCategory}>{place.category}</Text>
        
        <View style={styles.placeLocation}>
          <MapPin size={14} color="#8E8E93" strokeWidth={2} />
          <Text style={styles.placeAddress}>{place.address}</Text>
        </View>
        
        <View style={styles.placeStats}>
          <View style={styles.rating}>
            <Star size={14} color="#FFD700" strokeWidth={2} fill="#FFD700" />
            <Text style={styles.ratingText}>{place.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>({place.review_count})</Text>
          </View>
          
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: place.is_open ? '#34C759' : '#FF3B30' }]} />
            <Text style={styles.statusText}>{place.is_open ? 'Open' : 'Closed'}</Text>
          </View>
        </View>
        
        <Text style={styles.aiSummary} numberOfLines={2}>
          {place.ai_summary}
        </Text>

        {/* Friend Indicator (Phase 2) */}
        {place.friend_visited_count && place.friend_visited_count > 0 && place.friend_visitor_names && place.friend_visitor_names.length > 0 && (
          <View style={styles.friendIndicator}>
            <Users size={14} color="#007AFF" strokeWidth={2} />
            <Text style={styles.friendText}>
              {place.friend_visited_count <= 2 
                ? `${place.friend_visitor_names.slice(0, 2).join(' and ')} been here`
                : `${place.friend_visited_count} friends been here`
              }
            </Text>
            {place.friend_visited_count > 2 && (
              <Text style={styles.friendNames} numberOfLines={1}>
                • {place.friend_visitor_names.slice(0, 2).join(', ')}
                {place.friend_visitor_names.length > 2 && ` +${place.friend_visitor_names.length - 2} more`}
              </Text>
            )}
          </View>
        )}
        
        <View style={styles.placeFooter}>
          <Text style={styles.addedBy}>Added {formatDate(place.created_at)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

  if (isLoading) {
    return (
      <ScreenErrorBoundary>
        <SafeAreaView style={styles.container}>
          {/* Search Bar Skeleton */}
          <View style={styles.searchContainer}>
            <View style={[styles.searchInputContainer, { backgroundColor: '#F2F2F7' }]}>
              <View style={{ width: 20, height: 20, backgroundColor: '#E5E5EA', borderRadius: 10 }} />
              <View style={{ flex: 1, height: 16, backgroundColor: '#E5E5EA', borderRadius: 8, marginLeft: 12 }} />
            </View>
            <View style={[styles.filterButton, { backgroundColor: '#E5E5EA' }]} />
          </View>
          
          {/* Places List Skeleton */}
          <ListLoadingSkeleton count={6} ItemSkeleton={PlaceCardSkeleton} />
        </SafeAreaView>
      </ScreenErrorBoundary>
    );
  }

  return (
    <ScreenErrorBoundary>
      <SafeAreaView style={styles.container}>
        {/* Place Filter Toggle */}
        <View style={styles.filterToggleContainer}>
          <PlaceFilterToggle />
        </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#8E8E93" strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search places..."
            value={searchText}
            onChangeText={handleSearch}
            accessibilityLabel="Search places"
            accessibilityHint="Enter text to search for places"
          />
        </View>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => {
            HapticFeedback.light();
            setShowFilters(!showFilters);
          }}
          accessibilityLabel={showFilters ? "Hide filters" : "Show filters"}
          accessibilityRole="button"
          accessibilityHint="Toggle filter options for places"
        >
          <SlidersHorizontal size={20} color="#007AFF" strokeWidth={2} />
        </TouchableOpacity>
      </View>



      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          {/* Categories */}
          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>Categories</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {categories.map(category => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton,
                    selectedCategory === category && styles.selectedCategoryButton
                  ]}
                  onPress={() => handleCategoryFilter(category)}
                  accessibilityLabel={`Filter by ${category}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedCategory === category }}
                  accessibilityHint={`Show only ${category === 'All' ? 'all places' : category.toLowerCase() + ' places'}`}
                >
                  <Text style={[
                    styles.categoryButtonText,
                    selectedCategory === category && styles.selectedCategoryButtonText
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Sort Options */}
          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>Sort by</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {sortOptions.map(option => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.categoryButton,
                    selectedSort === option && styles.selectedCategoryButton
                  ]}
                  onPress={() => handleSort(option)}
                  accessibilityLabel={`Sort by ${option}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedSort === option }}
                  accessibilityHint={`Sort places by ${option.toLowerCase()}`}
                >
                  <Text style={[
                    styles.categoryButtonText,
                    selectedSort === option && styles.selectedCategoryButtonText
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Places List */}
      <FlatList
        data={filteredPlaces}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PlaceCard place={item} />}
        style={styles.placesContainer}
        contentContainerStyle={filteredPlaces.length === 0 ? styles.emptyListContainer : undefined}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchText.trim() 
                ? 'No places found matching your search' 
                : filterMode === 'friends_places'
                  ? 'No friends\' places found yet' 
                  : 'No places found'
              }
            </Text>
            {filterMode === 'friends_places' && !searchText.trim() && (
              <View style={styles.emptyActions}>
                <TouchableOpacity 
                  style={styles.findFriendsButton}
                  onPress={() => router.push('/profile/find-friends')}
                  accessibilityLabel="Find friends"
                  accessibilityRole="button"
                >
                  <UserPlus size={20} color="#007AFF" strokeWidth={2} />
                  <Text style={styles.findFriendsText}>Find Friends</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.switchToEveryoneButton}
                  onPress={() => setFilterMode('everyones_places')}
                  accessibilityLabel="Switch to everyone mode"
                  accessibilityRole="button"
                >
                  <Globe size={20} color="#8E8E93" strokeWidth={2} />
                  <Text style={styles.switchToEveryoneText}>View All Places</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={10}
        getItemLayout={(data, index) => ({
          length: 200, // Approximate item height
          offset: 200 * index,
          index,
        })}
      />
      
      <Toast
        visible={toast.visible}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        duration={toast.duration}
        onHide={hideToast}
      />

      {selectedPlace && (
        <CollectionSelector
          visible={showCollectionSelector}
          onClose={handleCollectionSelectorClose}
          placeId={selectedPlace.id}
          placeName={selectedPlace.name}
        />
      )}
      </SafeAreaView>
    </ScreenErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  filterToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#000000',
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  filtersContainer: {
    backgroundColor: '#F9F9F9',
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  categoryScroll: {
    paddingLeft: 20,
  },
  categoryButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  selectedCategoryButton: {
    backgroundColor: '#2C2C2E',
    borderColor: '#2C2C2E',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#3C3C43',
    fontWeight: '500',
  },
  selectedCategoryButtonText: {
    color: '#FFFFFF',
  },
  placesContainer: {
    flex: 1,
  },
  placeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  placeImage: {
    width: '100%',
    height: 200,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  placeInfo: {
    padding: 16,
  },
  placeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  placeName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  bookmarkButton: {
    padding: 4,
  },
  placeCategory: {
    fontSize: 14,
    color: '#2C2C2E',
    fontWeight: '500',
    marginBottom: 8,
  },
  placeLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  placeAddress: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 6,
    flex: 1,
  },
  placeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  aiSummary: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
    marginBottom: 12,
  },
  placeFooter: {
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5EA',
    paddingTop: 12,
  },
  addedBy: {
    fontSize: 12,
    color: '#8E8E93',
  },
  // Friend indicator styles (Phase 2)
  friendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF10',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  friendText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 4,
  },
  friendNames: {
    fontSize: 11,
    color: '#8E8E93',
    marginLeft: 4,
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 32,
    marginBottom: 24,
  },
  emptyActions: {
    width: '100%',
    paddingHorizontal: 32,
    gap: 12,
  },
  findFriendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  findFriendsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  switchToEveryoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  switchToEveryoneText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8E8E93',
    marginLeft: 8,
  },
});