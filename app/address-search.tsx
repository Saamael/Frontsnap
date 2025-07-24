import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, MapPin, Navigation } from 'lucide-react-native';
import * as Location from 'expo-location';
import { searchPlacesByText } from '@/lib/google-places';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SearchResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export default function AddressSearchScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [popularLocations] = useState<string[]>([
    'San Francisco, CA',
    'New York, NY',
    'Los Angeles, CA',
    'Chicago, IL',
    'Miami, FL',
    'Seattle, WA',
    'Austin, TX',
    'Boston, MA'
  ]);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const handleBack = () => {
    router.back();
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      console.log('Searching for:', query);
      const results = await searchPlacesByText(query);
      console.log('Search results:', results.length);
      
      if (mounted.current) {
        setSearchResults(results);
      }
    } catch (error) {
      console.error('Error searching places:', error);
      if (mounted.current) {
        Alert.alert('Search Error', 'Failed to search for places. Please try again.');
      }
    } finally {
      if (mounted.current) {
        setIsSearching(false);
      }
    }
  };

  const handleUseCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant location permission to use current location.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverseGeocode.length > 0 && mounted.current) {
        const { city, country } = reverseGeocode[0];
        const address = `${city}, ${country}`;

        // Save location to AsyncStorage
        const locationData = {
          city: city,
          country: country,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          isCurrentLocation: true
        };
        
        await AsyncStorage.setItem('selectedLocation', JSON.stringify(locationData));
        console.log('Location updated to:', address);
        router.back();
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      if (mounted.current) {
        Alert.alert('Location Error', 'Failed to get current location. Please try again.');
      }
    } finally {
      if (mounted.current) {
        setIsGettingLocation(false);
      }
    }
  };

  const handleSelectLocation = async (result: SearchResult) => {
    console.log('Selected location:', result.name, result.formatted_address);
    
    // Parse the address to get city and country more intelligently
    const addressParts = result.formatted_address.split(', ');
    console.log('Address parts:', addressParts);
    
    let city, country;
    
    if (addressParts.length >= 3) {
      // For addresses like "New York, NY, USA" or "San Francisco, CA, USA"
      city = addressParts[0]; // "New York" or "San Francisco"
      country = addressParts.slice(1).join(', '); // "NY, USA" or "CA, USA"
    } else if (addressParts.length === 2) {
      // For addresses like "London, UK"
      city = addressParts[0];
      country = addressParts[1];
    } else {
      // Fallback to using the result name
      city = result.name;
      country = result.formatted_address;
    }
    
    // Save location to AsyncStorage
    const locationData = {
      city: city,
      country: country,
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      isCurrentLocation: false
    };
    
    await AsyncStorage.setItem('selectedLocation', JSON.stringify(locationData));
    console.log('Location saved:', locationData);

    // Navigate back to the previous screen
    router.back();
  };

  const handlePopularLocationSearch = async (locationName: string) => {
    setSearchQuery(locationName);
    await handleSearch(locationName);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color="#000000" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose Location</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#8E8E93" strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a city or address..."
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              // Debounce search to avoid too many API calls
              if (text.trim().length > 2) {
                handleSearch(text);
              } else {
                setSearchResults([]);
              }
            }}
            placeholderTextColor="#8E8E93"
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => handleSearch(searchQuery)}
          />
        </View>
      </View>

      {/* Current Location Button */}
      <View style={styles.currentLocationContainer}>
        <TouchableOpacity 
          style={[styles.currentLocationButton, isGettingLocation && styles.disabledButton]} 
          onPress={handleUseCurrentLocation}
          disabled={isGettingLocation}
        >
          <Navigation size={20} color={isGettingLocation ? "#8E8E93" : "#007AFF"} strokeWidth={2} />
          <Text style={[styles.currentLocationText, isGettingLocation && styles.disabledText]}>
            {isGettingLocation ? 'Getting location...' : 'Use current location'}
          </Text>
          {isGettingLocation && (
            <ActivityIndicator size="small" color="#8E8E93" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Search Results */}
        {isSearching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        ) : searchResults.length > 0 ? (
          <View style={styles.resultsContainer}>
            <Text style={styles.sectionTitle}>Search Results</Text>
            {searchResults.map((result) => (
              <TouchableOpacity
                key={result.place_id}
                style={styles.resultItem}
                onPress={() => handleSelectLocation(result)}
                activeOpacity={0.7}
              >
                <MapPin size={20} color="#8E8E93" strokeWidth={2} />
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName} numberOfLines={1}>{result.name}</Text>
                  <Text style={styles.resultAddress} numberOfLines={2}>{result.formatted_address}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : searchQuery.trim().length > 2 && !isSearching ? (
          <View style={styles.noResultsContainer}>
            <Search size={48} color="#C7C7CC" strokeWidth={1.5} />
            <Text style={styles.noResultsText}>No results found</Text>
            <Text style={styles.noResultsSubtext}>Try searching for a different location or check your spelling</Text>
          </View>
        ) : (
          /* Popular Locations */
          <View style={styles.popularContainer}>
            <Text style={styles.sectionTitle}>Popular Locations</Text>
            {popularLocations.map((location, index) => (
              <TouchableOpacity
                key={index}
                style={styles.popularItem}
                onPress={() => handlePopularLocationSearch(location)}
                activeOpacity={0.7}
              >
                <MapPin size={20} color="#8E8E93" strokeWidth={2} />
                <Text style={styles.popularText}>{location}</Text>
              </TouchableOpacity>
            ))}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerSpacer: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
  currentLocationContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  currentLocationText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
    flex: 1,
  },
  disabledText: {
    color: '#8E8E93',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  resultsContainer: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    marginBottom: 12,
    gap: 16,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  resultAddress: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 18,
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3C3C43',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  noResultsSubtext: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  popularContainer: {
    paddingHorizontal: 20,
  },
  popularItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    marginBottom: 12,
    gap: 16,
  },
  popularText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
});