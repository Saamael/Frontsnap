import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Gem, Search } from 'lucide-react-native';
import { getCurrentUser, createHiddenGem, getActiveHiddenGemsByCity, getDiscoveredHiddenGemsByCity, HiddenGem, supabase } from '@/lib/supabase';
import { searchPlaces } from '@/lib/google-places';

interface HiddenGemFormData {
  city: string;
  country: string;
  title: string;
  description: string;
  reward: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  clues: string[];
  rules: string[];
  hint_image_url: string;
  latitude: number;
  longitude: number;
  time_left: string;
  google_place_id?: string;
  place_name?: string;
  place_address?: string;
}

interface PlaceSearchResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  photos?: Array<{
    photo_reference: string;
  }>;
  rating?: number;
  types: string[];
}

export default function AdminHiddenGemsScreen() {
  const [hiddenGems, setHiddenGems] = useState<HiddenGem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedCity, setSelectedCity] = useState('San Francisco');
  const [showPlaceSearch, setShowPlaceSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSearchResult | null>(null);
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState<HiddenGemFormData>({
    city: 'San Francisco',
    country: 'CA',
    title: '',
    description: '',
    reward: '',
    difficulty: 'Medium',
    clues: ['', '', ''],
    rules: ['Only one winner per hidden gem', 'Photo must clearly show the location', 'Must be taken within the designated area'],
    hint_image_url: '',
    latitude: 37.7749,
    longitude: -122.4194,
    time_left: '30 days',
    google_place_id: '',
    place_name: '',
    place_address: ''
  });

  useEffect(() => {
    checkAuthAndLoadGems();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadHiddenGems();
    }
  }, [selectedCity, isAuthenticated]);

  const checkAuthAndLoadGems = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        router.replace('/auth/login');
        return;
      }
      
      // Check if user has admin role
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error || profile?.role !== 'admin') {
        Alert.alert('Access Denied', 'Admin privileges required to access this page');
        router.replace('/profile');
        return;
      }
      
      setIsAuthenticated(true);
      await loadHiddenGems();
    } catch (error) {
      console.error('Error checking authentication:', error);
      router.replace('/auth/login');
    }
  };

  const loadHiddenGems = async () => {
    try {
      setIsLoading(true);
      const [activeGems, discoveredGems] = await Promise.all([
        getActiveHiddenGemsByCity(selectedCity),
        getDiscoveredHiddenGemsByCity(selectedCity)
      ]);
      
      setHiddenGems([...activeGems, ...discoveredGems]);
    } catch (error) {
      console.error('Error loading hidden gems:', error);
      Alert.alert('Error', 'Failed to load hidden gems. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGem = async () => {
    if (!formData.title || !formData.description || !formData.reward) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setIsCreating(true);
      const { data, error } = await createHiddenGem(formData);
      
      if (error) {
        Alert.alert('Error', `Failed to create hidden gem: ${error.message}`);
        return;
      }

      if (data) {
        Alert.alert('Success', 'Hidden gem created successfully!');
        setShowCreateForm(false);
        resetForm();
        loadHiddenGems();
      }
    } catch (error) {
      console.error('Error creating hidden gem:', error);
      Alert.alert('Error', 'Failed to create hidden gem');
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      city: selectedCity,
      country: selectedCity === 'San Francisco' ? 'CA' : selectedCity === 'New York' ? 'NY' : 'CA',
      title: '',
      description: '',
      reward: '',
      difficulty: 'Medium',
      clues: ['', '', ''],
      rules: ['Only one winner per hidden gem', 'Photo must clearly show the location', 'Must be taken within the designated area'],
      hint_image_url: '',
      latitude: selectedCity === 'San Francisco' ? 37.7749 : selectedCity === 'New York' ? 40.7282 : 34.0522,
      longitude: selectedCity === 'San Francisco' ? -122.4194 : selectedCity === 'New York' ? -74.0021 : -118.2437,
      time_left: '30 days',
      google_place_id: '',
      place_name: '',
      place_address: ''
    });
  };

  const updateClue = (index: number, value: string) => {
    const newClues = [...formData.clues];
    newClues[index] = value;
    setFormData({ ...formData, clues: newClues });
  };

  const handleSearchPlaces = async () => {
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    try {
      const results = await searchPlaces(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching places:', error);
      Alert.alert('Error', 'Failed to search places');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectPlace = (place: PlaceSearchResult) => {
    setSelectedPlace(place);
    
    // Extract city and country from address
    const addressParts = place.formatted_address.split(', ');
    const country = addressParts[addressParts.length - 1];
    const city = addressParts.length > 2 ? addressParts[addressParts.length - 3] : addressParts[0];

    setFormData({
      ...formData,
      google_place_id: place.place_id,
      place_name: place.name,
      place_address: place.formatted_address,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      city: city,
      country: country,
      title: `Find ${place.name}`,
      description: `Discover this hidden gem at ${place.name}`,
      hint_image_url: place.photos?.[0] 
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${place.photos[0].photo_reference}&key=${process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY}`
        : '',
    });

    setShowPlaceSearch(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading hidden gems...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#2C2C2E" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin: Hidden Gems</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowCreateForm(true)}>
          <Plus size={24} color="#007AFF" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* City Selector */}
      <View style={styles.citySelector}>
        {['San Francisco', 'New York', 'Los Angeles'].map((city) => (
          <TouchableOpacity
            key={city}
            style={[styles.cityButton, selectedCity === city && styles.cityButtonActive]}
            onPress={() => setSelectedCity(city)}
          >
            <Text style={[styles.cityButtonText, selectedCity === city && styles.cityButtonTextActive]}>
              {city}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollView}>
        {hiddenGems.length === 0 ? (
          <View style={styles.emptyState}>
            <Gem size={64} color="#C7C7CC" strokeWidth={1.5} />
            <Text style={styles.emptyStateTitle}>No Hidden Gems</Text>
            <Text style={styles.emptyStateMessage}>
              Create your first hidden gem for {selectedCity}!
            </Text>
          </View>
        ) : (
          hiddenGems.map((gem) => (
            <View key={gem.id} style={styles.gemCard}>
              <View style={styles.gemHeader}>
                <View style={styles.gemInfo}>
                  <Text style={styles.gemTitle}>{gem.title}</Text>
                  <Text style={styles.gemReward}>Reward: {gem.reward}</Text>
                </View>
                <View style={styles.gemStatus}>
                  <View style={[styles.statusBadge, gem.is_active ? styles.activeBadge : styles.discoveredBadge]}>
                    <Text style={[styles.statusText, gem.is_active ? styles.activeText : styles.discoveredText]}>
                      {gem.is_active ? '🔶 Active' : '◇ Discovered'}
                    </Text>
                  </View>
                </View>
              </View>
              <Text style={styles.gemDescription}>{gem.description}</Text>
              <View style={styles.gemStats}>
                <Text style={styles.statText}>Attempts: {gem.attempts}</Text>
                <Text style={styles.statText}>Participants: {gem.participants}</Text>
                <Text style={styles.statText}>Difficulty: {gem.difficulty}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Create Form Modal */}
      <Modal visible={showCreateForm} animationType="slide" presentationStyle="formSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Hidden Gem</Text>
            <TouchableOpacity onPress={() => setShowCreateForm(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.formContainer}>
            {/* Place Selection */}
            <View style={styles.formSection}>
              <Text style={styles.labelText}>Location *</Text>
              {selectedPlace ? (
                <View style={styles.selectedPlace}>
                  <View style={styles.selectedPlaceInfo}>
                    <Text style={styles.selectedPlaceName}>{selectedPlace.name}</Text>
                    <Text style={styles.selectedPlaceAddress}>{selectedPlace.formatted_address}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowPlaceSearch(true)}>
                    <Text style={styles.changeButton}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.selectPlaceButton}
                  onPress={() => setShowPlaceSearch(true)}
                >
                  <Search size={20} color="#007AFF" strokeWidth={2} />
                  <Text style={styles.selectPlaceText}>Search & Select Place</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.formSection}>
              <Text style={styles.labelText}>Title *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                placeholder="The Secret Garden Café"
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.labelText}>Description *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="A hidden rooftop café tucked away..."
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.labelText}>Reward *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.reward}
                onChangeText={(text) => setFormData({ ...formData, reward: text })}
                placeholder="$50 Gift Card + Exclusive Badge"
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.labelText}>Hint Image URL</Text>
              <TextInput
                style={styles.textInput}
                value={formData.hint_image_url}
                onChangeText={(text) => setFormData({ ...formData, hint_image_url: text })}
                placeholder="https://images.pexels.com/..."
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.labelText}>Clues</Text>
              {formData.clues.map((clue, index) => (
                <TextInput
                  key={index}
                  style={[styles.textInput, styles.clueInput]}
                  value={clue}
                  onChangeText={(text) => updateClue(index, text)}
                  placeholder={`Clue ${index + 1}`}
                />
              ))}
            </View>

            <View style={styles.formSection}>
              <Text style={styles.labelText}>Location</Text>
              <View style={styles.locationRow}>
                <TextInput
                  style={[styles.textInput, styles.halfInput]}
                  value={formData.latitude.toString()}
                  onChangeText={(text) => setFormData({ ...formData, latitude: parseFloat(text) || 0 })}
                  placeholder="Latitude"
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.textInput, styles.halfInput]}
                  value={formData.longitude.toString()}
                  onChangeText={(text) => setFormData({ ...formData, longitude: parseFloat(text) || 0 })}
                  placeholder="Longitude"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <TouchableOpacity 
              style={styles.createButton}
              onPress={handleCreateGem}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.createButtonText}>Create Hidden Gem</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Place Search Modal */}
      <Modal visible={showPlaceSearch} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPlaceSearch(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Search Places</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search for a place..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchPlaces}
            />
            <TouchableOpacity
              style={styles.searchButton}
              onPress={handleSearchPlaces}
              disabled={searchLoading}
            >
              {searchLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Search size={20} color="white" strokeWidth={2} />
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.searchResults}>
            {searchResults.map((place) => (
              <TouchableOpacity
                key={place.place_id}
                style={styles.placeResult}
                onPress={() => handleSelectPlace(place)}
              >
                <View style={styles.placeInfo}>
                  <Text style={styles.placeName}>{place.name}</Text>
                  <Text style={styles.placeAddress}>{place.formatted_address}</Text>
                  {place.rating && (
                    <Text style={styles.placeRating}>⭐ {place.rating}</Text>
                  )}
                </View>
                <ArrowLeft size={20} color="#666" strokeWidth={2} style={{ transform: [{ rotate: '180deg' }] }} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    color: '#2C2C2E',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  citySelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  cityButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  cityButtonActive: {
    backgroundColor: '#007AFF',
  },
  cityButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2C2C2E',
  },
  cityButtonTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#2C2C2E',
    fontWeight: '600',
    marginTop: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C2C2E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
  },
  gemCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  gemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  gemInfo: {
    flex: 1,
  },
  gemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C2C2E',
    marginBottom: 4,
  },
  gemReward: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  gemStatus: {
    marginLeft: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#FFD700',
  },
  discoveredBadge: {
    backgroundColor: '#8E8E93',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeText: {
    color: '#000000',
  },
  discoveredText: {
    color: '#FFFFFF',
  },
  gemDescription: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
    marginBottom: 12,
  },
  gemStats: {
    flexDirection: 'row',
  },
  statText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
    marginRight: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C2C2E',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  formSection: {
    marginBottom: 20,
  },
  labelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2E',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2C2C2E',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  clueInput: {
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
  },
  halfInput: {
    flex: 1,
    marginHorizontal: 6,
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 40,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  selectPlaceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    gap: 8,
  },
  selectPlaceText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  selectedPlace: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderWidth: 2,
    borderColor: '#34C759',
    borderRadius: 12,
    padding: 16,
  },
  selectedPlaceInfo: {
    flex: 1,
  },
  selectedPlaceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2E',
  },
  selectedPlaceAddress: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  changeButton: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  modalHeaderSpacer: {
    width: 60,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2C2C2E',
  },
  searchButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResults: {
    flex: 1,
    paddingHorizontal: 20,
  },
  placeResult: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2E',
  },
  placeAddress: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  placeRating: {
    fontSize: 14,
    color: '#FFD700',
    marginTop: 4,
  },
});