import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { Search, MapPin, Star, Clock, Bookmark, Filter, SlidersHorizontal } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getPlaces, searchPlaces, getNearbyPlaces, getFilteredPlaces, Place, getCurrentUser } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

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
  const [filteredPlaces, setFilteredPlaces] = useState<Place[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSort, setSelectedSort] = useState('Newest');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationDisplayName, setLocationDisplayName] = useState<string>('');
  const router = useRouter();
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    initializeScreen();
    
    return () => {
      mounted.current = false;
    };
  }, []);

  // Filter places when search/category/sort changes
  useEffect(() => {
    filterAndSortPlaces();
  }, [places, searchText, selectedCategory, selectedSort]);

  // Listen for location changes when returning from address search
  useFocusEffect(
    React.useCallback(() => {
      if (mounted.current) {
        loadLocationAndPlaces();
      }
    }, [])
  );

  const initializeScreen = async () => {
    try {
      // Check authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth/login');
        return;
      }

      // Load location and places
      await loadLocationAndPlaces();
    } catch (error) {
      console.error('Error initializing screen:', error);
      router.replace('/auth/login');
    }
  };

  const loadLocationAndPlaces = async () => {
    try {
      setIsLoading(true);
      
      // Load saved location from storage
      const savedLocationStr = await AsyncStorage.getItem('selectedLocation');
      console.log('🔄 Loading saved location:', savedLocationStr);
      
      if (savedLocationStr) {
        const savedLocation: LocationData = JSON.parse(savedLocationStr);
        console.log('📍 Found saved location:', savedLocation);
        
        // Update location state
        setCurrentLocation(savedLocation);
        const displayName = `${savedLocation.city}, ${savedLocation.country}`;
        setLocationDisplayName(displayName);
        console.log('📍 Updated location display to:', displayName);
        
        // Load places for this location
        await loadPlacesForLocation(savedLocation);
      } else {
        console.log('📍 No saved location - loading default places');
        setCurrentLocation(null);
        setLocationDisplayName('');
        await loadDefaultPlaces();
      }
    } catch (error) {
      console.error('Error loading location and places:', error);
      await loadDefaultPlaces();
    } finally {
      setIsLoading(false);
    }
  };

  const loadPlacesForLocation = async (location: LocationData) => {
    try {
      console.log(`🔍 Loading places near ${location.city} (${location.latitude}, ${location.longitude})`);
      
      const nearbyPlaces = await getNearbyPlaces(
        location.latitude,
        location.longitude,
        50 // 50km radius
      );
      
      console.log(`✅ Loaded ${nearbyPlaces.length} places near ${location.city}`);
      setPlaces(nearbyPlaces);
    } catch (error) {
      console.error('Error loading places for location:', error);
      await loadDefaultPlaces();
    }
  };

  const loadDefaultPlaces = async () => {
    try {
      console.log('🔍 Loading default places from database');
      const defaultPlaces = await getPlaces(50, 0);
      console.log(`✅ Loaded ${defaultPlaces.length} default places`);
      setPlaces(defaultPlaces);
    } catch (error) {
      console.error('Error loading default places:', error);
      setPlaces([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLocationAndPlaces();
    setRefreshing(false);
  };

  const filterAndSortPlaces = () => {
    let filtered = places;

    // Apply search filter first
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = places.filter(place => 
        place.name.toLowerCase().includes(searchLower) ||
        place.category.toLowerCase().includes(searchLower) ||
        place.address.toLowerCase().includes(searchLower) ||
        place.ai_summary.toLowerCase().includes(searchLower) ||
        place.pros.some(pro => pro.toLowerCase().includes(searchLower)) ||
        place.cons.some(con => con.toLowerCase().includes(searchLower))
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
    setFilteredPlaces(sorted);
  };

  const handleSearch = (text: string) => {
    setSearchText(text);
  };

  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category);
  };

  const handleSort = (sortOption: string) => {
    setSelectedSort(sortOption);
  };

  const navigateToPlace = (placeId: string) => {
    router.push(`/place/${placeId}`);
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

  const PlaceCard = ({ place }: { place: Place }) => (
    <TouchableOpacity style={styles.placeCard} onPress={() => navigateToPlace(place.id)}>
      <Image source={{ uri: place.image_url }} style={styles.placeImage} />
      
      <View style={styles.placeInfo}>
        <View style={styles.placeHeader}>
          <Text style={styles.placeName}>{place.name}</Text>
          <TouchableOpacity style={styles.bookmarkButton}>
            <Bookmark size={20} color="#8E8E93" strokeWidth={2} />
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
        
        <View style={styles.placeFooter}>
          <Text style={styles.addedBy}>Added {formatDate(place.created_at)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading places...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#8E8E93" strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search places..."
            value={searchText}
            onChangeText={handleSearch}
          />
        </View>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
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
      <ScrollView
        style={styles.placesContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredPlaces.length > 0 ? (
          filteredPlaces.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchText.trim() ? 'No places found matching your search' : 'No places found'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    paddingTop: 16,
    paddingBottom: 16,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 32,
  },
});