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
import { getNearbyPlaces, getNearbyPlacesWithFriendAttribution, Place, getCurrentUser, getUserAllPlaces, getNearbyPlacesWithFriendData, getNearbyFriendsOnlyPlaces, getNearbyPublicPlaces } from '@/lib/supabase';
import * as Location from 'expo-location';
import { MapErrorBoundary } from '@/components/ErrorBoundary';
import { withLocationPermission, withLoadingState, AppError, ErrorType } from '@/utils/error-handling';
import { MapClusterer, ClusterUtils, type Cluster } from '@/utils/map-clustering';
import { PlaceFilterToggle } from '@/components/PlaceFilterToggle';
import { usePlaceFilter } from '@/contexts/PlaceFilterContext';
import { OptimizedImage } from '@/components/OptimizedImage';
import { prefetchPlaceThumbs } from '@/utils/image-prefetch';

// Import react-native-maps for native iOS/Android support
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';

// Declare Google Maps types for web platform
declare global {
  interface Window {
    google: any;
  }
  const google: any;
}

const { width, height } = Dimensions.get('window');

// Google Maps Web Component
const GoogleMapWeb = ({ places, onPlacePress, userLocation, mapType }: {
  places: Place[];
  onPlacePress: (place: Place) => void;
  userLocation: { latitude: number; longitude: number } | null;
  mapType: 'standard' | 'satellite';
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const clustererRef = useRef<MapClusterer>(new MapClusterer({ gridSize: 60, maxZoom: 15 }));
  const currentZoomRef = useRef<number>(15);

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

  useEffect(() => {
    if (googleMapRef.current && window.google) {
      googleMapRef.current.setMapTypeId(
        mapType === 'satellite' ? google.maps.MapTypeId.SATELLITE : google.maps.MapTypeId.ROADMAP
      );
    }
  }, [mapType]);

  const initializeMap = () => {
    if (!userLocation || !mapRef.current) return;

    // Load Google Maps script if not already loaded
    if (!window.google) {
      loadGoogleMapsScript();
    } else {
      createMap();
    }
  };

  const loadGoogleMapsScript = async () => {
    try {
      const { loadMapsScript } = await import('@/lib/maps-proxy');
      const scriptUrl = await loadMapsScript();

      const script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        createMap();
      };
      script.onerror = () => {
        console.error('Failed to load Google Maps script');
        // Fallback to placeholder
      };
      document.head.appendChild(script);
    } catch (error) {
      console.error('Error loading Google Maps:', error);
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

      // Add zoom change listener to re-cluster markers
      googleMapRef.current.addListener('zoom_changed', () => {
        const newZoom = googleMapRef.current!.getZoom() || 15;
        if (Math.abs(newZoom - currentZoomRef.current) >= 1) {
          // Re-cluster when zoom changes significantly
          setTimeout(() => updateMarkers(), 100);
        }
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

    // Get current zoom level
    const currentZoom = googleMapRef.current.getZoom() || 15;
    currentZoomRef.current = currentZoom;

    // Cluster places based on zoom level
    const clusters = clustererRef.current.clusterPlaces(places, currentZoom);

    // Create markers for clusters
    clusters.forEach(cluster => {
      try {
        if (cluster.count === 1) {
          // Single place marker
          const place = cluster.places[0];
          const marker = new google.maps.Marker({
            position: { lat: cluster.lat, lng: cluster.lng },
            map: googleMapRef.current,
            title: place.name,
            icon: {
              url: place.image_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiMwMDdBRkYiLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDOC4xMyAyIDUgNS4xMyA1IDlDNSAxNC4yNSAxMiAyMiAxMiAyMkMxMiAyMiAxOSAxNC4yNSAxOSA5QzE5IDUuMTMgMTUuODcgMiAxMiAyWk0xMiAxMS41QzEwLjYyIDExLjUgOS41IDEwLjM4IDkuNSA5QzkuNSA7LjYyIDEwLjYyIDYuNSAxMiA2LjVDMTMuMzggNi41IDE0LjUgNy42MiAxNC41IDlDMTQuNSAxMC4zOCAxMy4zOCAxMS41IDEyIDExLjVaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+',
              scaledSize: new google.maps.Size(40, 40),
              origin: new google.maps.Point(0, 0),
              anchor: new google.maps.Point(20, 40),
            },
          });

          marker.addListener('click', () => {
            onPlacePress(place);
          });

          markersRef.current.push(marker);
        } else {
          // Cluster marker
          const clusterSize = ClusterUtils.getClusterSize(cluster.count);
          const clusterIcon = ClusterUtils.generateClusterIcon(cluster.count, clusterSize);
          
          const marker = new google.maps.Marker({
            position: { lat: cluster.lat, lng: cluster.lng },
            map: googleMapRef.current,
            title: ClusterUtils.getClusterTooltip(cluster),
            icon: {
              url: clusterIcon,
              scaledSize: new google.maps.Size(clusterSize, clusterSize),
              origin: new google.maps.Point(0, 0),
              anchor: new google.maps.Point(clusterSize / 2, clusterSize / 2),
            },
          });

          // Click handler for clusters - zoom in or show place list
          marker.addListener('click', () => {
            if (currentZoom < 18) {
              // Zoom in to expand cluster
              googleMapRef.current!.setCenter({ lat: cluster.lat, lng: cluster.lng });
              googleMapRef.current!.setZoom(currentZoom + 2);
            } else {
              // Show first place or a selection dialog
              if (cluster.places.length > 0) {
                onPlacePress(cluster.places[0]);
              }
            }
          });

          markersRef.current.push(marker);
        }
      } catch (error) {
        console.error('Error creating marker/cluster:', error);
        // Fallback to simple markers
        cluster.places.forEach(place => {
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
        });
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

// Native iOS/Android Map Component using react-native-maps
const NativeMapView = ({ places, onPlacePress, userLocation, mapType }: {
  places: Place[];
  onPlacePress: (place: Place) => void;
  userLocation: { latitude: number; longitude: number } | null;
  mapType: 'standard' | 'satellite';
}) => {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (userLocation && places.length > 0 && mapRef.current) {
      // Fit map to show user location and all places
      const coordinates = [
        userLocation,
        ...places.map(place => ({ latitude: place.latitude, longitude: place.longitude }))
      ];
      
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [userLocation, places]);

  if (!userLocation) {
    return (
      <View style={styles.mapPlaceholder}>
        <MapPin size={48} color="#8E8E93" strokeWidth={1.5} />
        <Text style={styles.mapPlaceholderText}>Loading Map...</Text>
        <Text style={styles.mapPlaceholderSubtext}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <MapView
      ref={mapRef}
      style={{ flex: 1 }}
      provider={PROVIDER_GOOGLE}
      mapType={mapType}
      initialRegion={{
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
      showsUserLocation={true}
      showsMyLocationButton={true}
      showsCompass={true}
      toolbarEnabled={false}
    >
      {/* User Location Circle */}
      <Circle
        center={userLocation}
        radius={100}
        fillColor="rgba(0, 122, 255, 0.2)"
        strokeColor="rgba(0, 122, 255, 0.8)"
        strokeWidth={2}
      />

      {/* Place Markers with Preview Images */}
      {places.map((place) => (
        <Marker
          key={place.id}
          coordinate={{
            latitude: place.latitude,
            longitude: place.longitude,
          }}
          title={place.name}
          description={`${place.category} • ${place.rating?.toFixed(1) || 'N/A'}⭐`}
          onPress={() => onPlacePress(place)}
        >
          {/* Custom Circular Marker with Preview Image */}
          <View style={styles.customMarker}>
            <View style={styles.markerImageContainer}>
              {(place.thumbnail_url || place.image_url) ? (
                <OptimizedImage
                  source={{ uri: place.thumbnail_url || place.image_url }}
                  style={styles.markerImage}
                  cachePolicy="memory-disk"
                  priority="high"
                  resizeMode="cover"
                  placeholder="skeleton"
                />
              ) : (
                <View style={styles.markerPlaceholder}>
                  <MapPin size={16} color="#FFFFFF" strokeWidth={2} />
                </View>
              )}
            </View>
            <View style={styles.markerBorder} />
          </View>
        </Marker>
      ))}
    </MapView>
  );
};

// Fallback component for when Maps are not available
const MapPlaceholder = ({ places, onPlacePress }: {
  places: Place[];
  onPlacePress: (place: Place) => void;
}) => (
  <View style={styles.mapPlaceholder}>
    <MapPin size={48} color="#8E8E93" strokeWidth={1.5} />
    <Text style={styles.mapPlaceholderText}>Interactive Map</Text>
    <Text style={styles.mapPlaceholderSubtext}>
      Map requires additional configuration.
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
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const abortControllerRef = useRef<AbortController | null>(null);
  const prefetchAbortRef = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const { filterMode } = usePlaceFilter();

  const categories = ['All', 'Coffee Shop', 'Restaurant', 'Nail Salon', 'Gym', 'Retail', 'Bookstore'];

  useEffect(() => {
    abortControllerRef.current = new AbortController();
    getCurrentLocationAndLoadPlaces();
    
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

  // React to filter mode changes
  useEffect(() => {
    if (mounted.current && userLocation) {
      console.log(`🗺️ Map filter mode changed to: ${filterMode}`);
      loadPlacesFromSupabase(userLocation);
    }
  }, [filterMode, userLocation]);

  // Prefetch place thumbnails when places change
  useEffect(() => {
    if (places.length > 0 && mounted.current) {
      // Cancel previous prefetch if any
      if (prefetchAbortRef.current) {
        prefetchAbortRef.current.abort();
      }
      
      // Create new abort controller for this prefetch
      prefetchAbortRef.current = new AbortController();
      
      // Prefetch thumbnails with concurrency control
      console.log(`🗺️ Map: Prefetching ${places.length} place thumbnails`);
      prefetchPlaceThumbs(places, { 
        concurrency: 6,
        signal: prefetchAbortRef.current.signal 
      }).catch(error => {
        if (error.name !== 'AbortError') {
          console.warn('Map prefetch error:', error);
        }
      });
    }
  }, [places]);

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
        if (!abortControllerRef.current?.signal.aborted) {
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
        if (!abortControllerRef.current?.signal.aborted) {
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
      if (!abortControllerRef.current?.signal.aborted) {
        setUserLocation(defaultCoords);
      }
      await loadPlacesFromSupabase(defaultCoords);
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsLoading(false);
      }
    }
  };

  const loadPlacesFromSupabase = async (coords: { latitude: number; longitude: number }) => {
    try {
      if (filterMode === 'my_places') {
        // Load user's places from all collections
        console.log(`🏠 Loading user's places on map`);
        const user = await getCurrentUser();
        if (!user) {
          console.log('❌ No authenticated user found for map');
          if (!abortControllerRef.current?.signal.aborted) {
            setPlaces([]);
          }
          return;
        }
        
        const userPlaces = await getUserAllPlaces(user.id);
        console.log(`✅ Loaded ${userPlaces.length} user places on map`);
        
        if (!abortControllerRef.current?.signal.aborted) {
          setPlaces(userPlaces);
        }
      } else if (filterMode === 'friends_places') {
        // Load places that only friends have visited
        console.log(`👥 Loading friends-only places on map`);
        const friendsPlaces = await getNearbyFriendsOnlyPlaces(
          coords.latitude,
          coords.longitude,
          30000 // 30km radius to match discover page
        );
        console.log(`✅ Loaded ${friendsPlaces.length} friends-only places on map`);
        
        if (!abortControllerRef.current?.signal.aborted) {
          setPlaces(friendsPlaces);
        }
      } else {
        // Load nearby places with friend data (everyone's places mode)
        console.log(`🌍 Loading everyone's places with friend data on map`);
        const supabasePlaces = await getNearbyPlacesWithFriendData(
          coords.latitude,
          coords.longitude,
          30000 // 30km radius to match discover page
        );
        console.log(`✅ Loaded ${supabasePlaces.length} places with friend data on map`);
        
        if (!abortControllerRef.current?.signal.aborted) {
          setPlaces(supabasePlaces);
        }
      }
    } catch (error) {
      console.error('Error loading places:', error);
      if (!abortControllerRef.current?.signal.aborted) {
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

  const toggleMapType = () => {
    setMapType(prevType => prevType === 'standard' ? 'satellite' : 'standard');
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

  // Show error state with retry option
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to load map</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => {
              setError(null);
              getCurrentLocationAndLoadPlaces();
            }}
            accessibilityLabel="Retry loading map"
            accessibilityRole="button"
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const filteredPlaces = getFilteredPlaces();
  const hasValidApiKey = __DEV__ 
    ? (process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY && process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY !== 'your_google_maps_api_key')
    : true; // In production, assume proxy is configured

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
          <TouchableOpacity style={styles.headerButton} onPress={toggleMapType}>
            <Layers size={20} color="#007AFF" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Place Filter Toggle */}
      <View style={styles.filterToggleContainer}>
        <PlaceFilterToggle />
      </View>

      {/* Map Container */}
      <View style={styles.mapContainer}>
        <MapErrorBoundary>
          {Platform.OS === 'web' && hasValidApiKey ? (
            <GoogleMapWeb 
              places={filteredPlaces} 
              onPlacePress={handlePlacePress}
              userLocation={userLocation}
              mapType={mapType}
            />
          ) : Platform.OS === 'ios' || Platform.OS === 'android' ? (
            <NativeMapView 
              places={filteredPlaces} 
              onPlacePress={handlePlacePress}
              userLocation={userLocation}
              mapType={mapType}
            />
          ) : (
            <MapPlaceholder places={filteredPlaces} onPlacePress={handlePlacePress} />
          )}
        </MapErrorBoundary>
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
            <OptimizedImage 
              source={{ uri: selectedPlace.thumbnail_url || selectedPlace.image_url }} 
              style={styles.selectedPlaceImage}
              cachePolicy="memory-disk"
              priority="high"
              resizeMode="cover"
            />
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
              <OptimizedImage 
                source={{ uri: place.thumbnail_url || place.image_url }} 
                style={styles.placeCardImage}
                cachePolicy="memory-disk"
                priority="normal"
                resizeMode="cover"
              />
              <View style={styles.placeCardInfo}>
                <Text style={styles.placeCardName} numberOfLines={1}>{place.name}</Text>
                <Text style={styles.placeCardCategory}>{place.category}</Text>
                
                {/* Friend Attribution Badge */}
                {place.addedByFriend && (
                  <View style={styles.friendBadge}>
                    {place.addedByFriend.avatar_url ? (
                      <Image 
                        source={{ uri: place.addedByFriend.avatar_url }} 
                        style={styles.friendAvatar}
                      />
                    ) : (
                      <View style={styles.friendAvatarPlaceholder}>
                        <Text style={styles.friendAvatarInitial}>
                          {place.addedByFriend.full_name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.friendBadgeText} numberOfLines={1}>
                      Added by {place.addedByFriend.username || place.addedByFriend.full_name}
                    </Text>
                  </View>
                )}
                
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
  filterToggleContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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

  // Native Map Marker Styles
  customMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerImageContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  markerPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerBorder: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    top: -2,
    left: -2,
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
    paddingTop: 8,
    paddingBottom: 12,
    maxHeight: 140, // Limit height to give more space to map
  },
  placesListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
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
    height: 70,
  },
  placeCardInfo: {
    padding: 8,
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
  // Friend attribution styles
  friendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF15',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginVertical: 2,
    gap: 4,
  },
  friendAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
  },
  friendAvatarPlaceholder: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendAvatarInitial: {
    fontSize: 8,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  friendBadgeText: {
    fontSize: 9,
    fontWeight: '500',
    color: '#007AFF',
    flex: 1,
  },
});