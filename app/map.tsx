import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, MapPin, Star, Filter, Layers } from 'lucide-react-native';
import { getNearbyPlaces, Place } from '@/lib/supabase';
import * as Location from 'expo-location';

// Declare Google Maps types for web platform
declare global {
  interface Window {
    google: any;
  }
  const google: any;
}

const { width, height } = Dimensions.get('window');

// Google Maps Web Component
const GoogleMapWeb = ({ places, onPlacePress, userLocation }: {
  places: Place[];
  onPlacePress: (place: Place) => void;
  userLocation: { latitude: number; longitude: number } | null;
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    if (Platform.OS === 'web' && mapRef.current && userLocation) {
      initializeMap();
    }
  }, [userLocation]);

  useEffect(() => {
    if (googleMapRef.current) {
      updateMarkers();
    }
  }, [places]);

  const initializeMap = () => {
    if (!userLocation || !mapRef.current) return;

    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'your_google_maps_api_key') {
      console.warn('Google Maps API key not configured properly');
      return;
    }

    // Load Google Maps script if not already loaded
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        createMap();
      };
      script.onerror = () => {
        console.error('Failed to load Google Maps script');
      };
      document.head.appendChild(script);
    } else {
      createMap();
    }
  };

  const createMap = () => {
    if (!userLocation || !mapRef.current || !window.google) return;

    try {
      googleMapRef.current = new google.maps.Map(mapRef.current, {
        center: { lat: userLocation.latitude, lng: userLocation.longitude },
        zoom: 15,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ],
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      // Add user location marker
      new google.maps.Marker({
        position: { lat: userLocation.latitude, lng: userLocation.longitude },
        map: googleMapRef.current,
        title: 'Your Location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#007AFF',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
      });

      updateMarkers();
    } catch (error) {
      console.error('Error creating Google Map:', error);
    }
  };

  const updateMarkers = () => {
    if (!googleMapRef.current || !window.google) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add place markers with clustering support
    places.forEach(place => {
      try {
        const marker = new google.maps.Marker({
          position: { lat: place.latitude, lng: place.longitude },
          map: googleMapRef.current,
          title: place.name,
          icon: {
            url: place.image_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiMwMDdBRkYiLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDOC4xMyAyIDUgNS4xMyA1IDlDNSAxNC4yNSAxMiAyMiAxMiAyMkMxMiAyMiAxOSAxNC4yNSAxOSA5QzE5IDUuMTMgMTUuODcgMiAxMiAyWk0xMiAxMS41QzEwLjYyIDExLjUgOS41IDEwLjM4IDkuNSA5QzkuNSA3LjYyIDEwLjYyIDYuNSAxMiA2LjVDMTMuMzggNi41IDE0LjUgNy42MiAxNC41IDlDMTQuNSAxMC4zOCAxMy4zOCAxMS41IDEyIDExLjVaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+',
            scaledSize: new google.maps.Size(40, 40),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(20, 40),
          },
        });

        // Add click listener
        marker.addListener('click', () => {
          onPlacePress(place);
        });

        markersRef.current.push(marker);
      } catch (error) {
        console.error('Error creating marker for place:', place.name, error);
        // Fallback to default marker
        const marker = new google.maps.Marker({
          position: { lat: place.latitude, lng: place.longitude },
          map: googleMapRef.current,
          title: place.name,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#007AFF',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          },
        });

        marker.addListener('click', () => {
          onPlacePress(place);
        });

        markersRef.current.push(marker);
      }
    });

    // Adjust map bounds to fit all markers
    if (markersRef.current.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      if (userLocation) {
        bounds.extend(new google.maps.LatLng(userLocation.latitude, userLocation.longitude));
      }
      markersRef.current.forEach(marker => {
        bounds.extend(marker.getPosition()!);
      });
      googleMapRef.current.fitBounds(bounds);
      
      // Ensure minimum zoom level
      const listener = google.maps.event.addListener(googleMapRef.current, 'bounds_changed', () => {
        if (googleMapRef.current!.getZoom()! > 18) {
          googleMapRef.current!.setZoom(18);
        }
        google.maps.event.removeListener(listener);
      });
    }
  };

  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <div
      ref={mapRef}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#f0f0f0',
      }}
    />
  );
};

// Fallback component for when Google Maps is not available
const MapPlaceholder = ({ places, onPlacePress }: {
  places: Place[];
  onPlacePress: (place: Place) => void;
}) => (
  <View style={styles.mapPlaceholder}>
    <MapPin size={48} color="#8E8E93" strokeWidth={1.5} />
    <Text style={styles.mapPlaceholderText}>Interactive Map</Text>
    <Text style={styles.mapPlaceholderSubtext}>
      Google Maps requires configuration and is not available in this demo.
    </Text>
  </View>
);

export default function MapScreen() {
  const router = useRouter();
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const mounted = useRef(true);

  const categories = ['All', 'Coffee Shop', 'Restaurant', 'Nail Salon', 'Gym', 'Retail', 'Bookstore'];

  useEffect(() => {
    mounted.current = true;
    getCurrentLocationAndLoadPlaces();
    
    return () => {
      mounted.current = false;
    };
  }, []);

  const getCurrentLocationAndLoadPlaces = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'For better place finding, we need access to your location. This will be used only when you are in the app. Without it, you might face errors in place finding with capture and won\'t be able to use the maps feature optimally.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Location.requestForegroundPermissionsAsync() }
          ]
        );
        // Use default location if permission denied
        const coords = { latitude: 37.7749, longitude: -122.4194 }; // San Francisco
        if (mounted.current) {
          setUserLocation(coords);
          await loadPlacesFromSupabase(coords);
        }
        return;
      }
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        const coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        };
        if (mounted.current) {
          setUserLocation(coords);
        }
        
        await loadPlacesFromSupabase(coords);
      } else {
        // Use default location (San Francisco) if permission denied
        const defaultCoords = { latitude: 37.7749, longitude: -122.4194 };
        if (mounted.current) {
          setUserLocation(defaultCoords);
        }
        await loadPlacesFromSupabase(defaultCoords);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      // Fallback to default location
      const defaultCoords = { latitude: 37.7749, longitude: -122.4194 };
      if (mounted.current) {
        setUserLocation(defaultCoords);
      }
      await loadPlacesFromSupabase(defaultCoords);
    } finally {
      if (mounted.current) {
        setIsLoading(false);
      }
    }
  };

  const loadPlacesFromSupabase = async (coords: { latitude: number; longitude: number }) => {
    try {
      // Load places from Supabase
      const supabasePlaces = await getNearbyPlaces(coords.latitude, coords.longitude, 5);
      
      if (mounted.current) {
        setPlaces(supabasePlaces);
      }
    } catch (error) {
      console.error('Error loading places:', error);
      if (mounted.current) {
        setPlaces([]);
      }
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handlePlacePress = (place: Place) => {
    setSelectedPlace(place);
  };

  const navigateToPlace = (placeId: string) => {
    router.push(`/place/${placeId}`);
  };

  const calculateDistance = (place: Place): string => {
    if (!userLocation) return 'Unknown';
    
    const R = 6371; // Earth's radius in km
    const dLat = (place.latitude - userLocation.latitude) * Math.PI / 180;
    const dLon = (place.longitude - userLocation.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(userLocation.latitude * Math.PI / 180) * Math.cos(place.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  const filterPlacesByCategory = (category: string) => {
    setSelectedCategory(category);
  };

  const getFilteredPlaces = () => {
    if (selectedCategory === 'All') {
      return places;
    }
    return places.filter(place => place.category === selectedCategory);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const filteredPlaces = getFilteredPlaces();
  const hasValidApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY && 
                        process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY !== 'your_google_maps_api_key';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color="#000000" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Map</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={20} color="#007AFF" strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Layers size={20} color="#007AFF" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Map Container */}
      <View style={styles.mapContainer}>
        {Platform.OS === 'web' && hasValidApiKey ? (
          <GoogleMapWeb 
            places={filteredPlaces} 
            onPlacePress={handlePlacePress}
            userLocation={userLocation}
          />
        ) : (
          <MapPlaceholder places={filteredPlaces} onPlacePress={handlePlacePress} />
        )}
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersOverlay}>
          <View style={styles.filtersContainer}>
            <Text style={styles.filtersTitle}>Map Filters</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categories.map(category => (
                <TouchableOpacity 
                  key={category}
                  style={[
                    styles.filterChip,
                    selectedCategory === category && styles.selectedFilterChip
                  ]}
                  onPress={() => filterPlacesByCategory(category)}
                >
                  <Text style={[
                    styles.filterChipText,
                    selectedCategory === category && styles.selectedFilterChipText
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Selected Place Card */}
      {selectedPlace && (
        <View style={styles.selectedPlaceContainer}>
          <TouchableOpacity 
            style={styles.selectedPlaceCard}
            onPress={() => navigateToPlace(selectedPlace.id)}
          >
            <Image source={{ uri: selectedPlace.image_url }} style={styles.selectedPlaceImage} />
            <View style={styles.selectedPlaceInfo}>
              <Text style={styles.selectedPlaceName}>{selectedPlace.name}</Text>
              <Text style={styles.selectedPlaceCategory}>{selectedPlace.category}</Text>
              <View style={styles.selectedPlaceStats}>
                <View style={styles.selectedPlaceRating}>
                  <Star size={14} color="#FFD700" strokeWidth={2} fill="#FFD700" />
                  <Text style={styles.selectedPlaceRatingText}>{selectedPlace.rating.toFixed(1)}</Text>
                </View>
                <Text style={styles.selectedPlaceDistance}>{calculateDistance(selectedPlace)}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setSelectedPlace(null)}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      )}

      {/* Places List */}
      <View style={styles.placesListContainer}>
        <Text style={styles.placesListTitle}>Nearby Places ({filteredPlaces.length})</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.placesList}>
          {filteredPlaces.map(place => (
            <TouchableOpacity
              key={place.id}
              style={styles.placeCard}
              onPress={() => navigateToPlace(place.id)}
            >
              <Image source={{ uri: place.image_url }} style={styles.placeCardImage} />
              <View style={styles.placeCardInfo}>
                <Text style={styles.placeCardName} numberOfLines={1}>{place.name}</Text>
                <Text style={styles.placeCardCategory}>{place.category}</Text>
                <View style={styles.placeCardRating}>
                  <Star size={12} color="#FFD700" strokeWidth={2} fill="#FFD700" />
                  <Text style={styles.placeCardRatingText}>{place.rating.toFixed(1)}</Text>
                </View>
                <Text style={styles.placeCardDistance}>{calculateDistance(place)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    padding: 32,
  },
  mapPlaceholderText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#3C3C43',
    marginTop: 16,
    marginBottom: 8,
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },

  filtersOverlay: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  filterChip: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  selectedFilterChip: {
    backgroundColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 14,
    color: '#3C3C43',
    fontWeight: '500',
  },
  selectedFilterChipText: {
    color: '#FFFFFF',
  },
  selectedPlaceContainer: {
    position: 'absolute',
    bottom: 200,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  selectedPlaceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  selectedPlaceImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 16,
  },
  selectedPlaceInfo: {
    flex: 1,
  },
  selectedPlaceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  selectedPlaceCategory: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 8,
  },
  selectedPlaceStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedPlaceRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectedPlaceRatingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  selectedPlaceDistance: {
    fontSize: 14,
    color: '#8E8E93',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#8E8E93',
    fontWeight: '300',
  },
  placesListContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5EA',
    paddingTop: 16,
    paddingBottom: 20,
  },
  placesListTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  placesList: {
    paddingLeft: 20,
  },
  placeCard: {
    width: 140,
    marginRight: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    overflow: 'hidden',
  },
  placeCardImage: {
    width: '100%',
    height: 100,
  },
  placeCardInfo: {
    padding: 12,
  },
  placeCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  placeCardCategory: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 8,
  },
  placeCardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  placeCardRatingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
  placeCardDistance: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 4,
  },
});