import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase, deletePlace } from '../../lib/supabase';
import type { Database } from '../../types/database';

type Place = Database['public']['Tables']['places']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface PlaceWithProfile extends Place {
  profiles?: Profile;
}

export default function AdminPlaces() {
  const router = useRouter();
  const [places, setPlaces] = useState<PlaceWithProfile[]>([]);
  const [filteredPlaces, setFilteredPlaces] = useState<PlaceWithProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceWithProfile | null>(null);
  const [showPlaceModal, setShowPlaceModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const categories = ['all', 'restaurant', 'cafe', 'attraction', 'shopping', 'entertainment', 'other'];

  const loadPlaces = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        router.replace('/auth/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        Alert.alert('Access Denied', 'Admin privileges required');
        router.back();
        return;
      }

      const { data: placesData, error } = await supabase
        .from('places')
        .select(`
          *,
          profiles:added_by (
            id,
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPlaces(placesData || []);
      setFilteredPlaces(placesData || []);
    } catch (error) {
      console.error('Error loading places:', error);
      Alert.alert('Error', 'Failed to load places');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPlaces();
  }, []);

  useEffect(() => {
    let filtered = places;

    if (filterCategory !== 'all') {
      filtered = filtered.filter(place => 
        place.category?.toLowerCase() === filterCategory.toLowerCase()
      );
    }

    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(place =>
        (place.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (place.address?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (place.category?.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    setFilteredPlaces(filtered);
  }, [searchQuery, places, filterCategory]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPlaces();
  };

  const handlePlacePress = (place: PlaceWithProfile) => {
    setSelectedPlace(place);
    setShowPlaceModal(true);
  };

  const handleTogglePublic = async (place: PlaceWithProfile) => {
    try {
      const newPublicStatus = !place.is_public;
      
      const { error } = await supabase
        .from('places')
        .update({ is_public: newPublicStatus })
        .eq('id', place.id);

      if (error) throw error;

      Alert.alert(
        'Success',
        `Place ${newPublicStatus ? 'made public' : 'made private'}`
      );

      loadPlaces();
      if (selectedPlace && selectedPlace.id === place.id) {
        setSelectedPlace({ ...selectedPlace, is_public: newPublicStatus });
      }
    } catch (error) {
      console.error('Error updating place visibility:', error);
      Alert.alert('Error', 'Failed to update place visibility');
    }
  };

  const handleDeletePlace = async (place: PlaceWithProfile) => {
    Alert.alert(
      'Delete Place',
      `Are you sure you want to delete "${place.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await deletePlace(place.id);

              if (error) throw error;

              Alert.alert('Success', 'Place deleted successfully');
              setShowPlaceModal(false);
              loadPlaces();
            } catch (error) {
              console.error('Error deleting place:', error);
              Alert.alert('Error', 'Failed to delete place');
            }
          }
        }
      ]
    );
  };

  const CategoryFilter = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoryFilter}
    >
      {categories.map((category) => (
        <TouchableOpacity
          key={category}
          style={[
            styles.categoryButton,
            filterCategory === category && styles.categoryButtonActive
          ]}
          onPress={() => setFilterCategory(category)}
        >
          <Text style={[
            styles.categoryButtonText,
            filterCategory === category && styles.categoryButtonTextActive
          ]}>
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const PlaceModal = () => (
    <Modal
      visible={showPlaceModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Place Details</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowPlaceModal(false)}
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {selectedPlace && (
          <ScrollView style={styles.modalContent}>
            {selectedPlace.image_url && (
              <Image
                source={{ uri: selectedPlace.image_url }}
                style={styles.placeImage}
                resizeMode="cover"
              />
            )}

            <View style={styles.placeSection}>
              <Text style={styles.sectionTitle}>Basic Information</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name:</Text>
                <Text style={styles.infoValue}>{selectedPlace.name}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Category:</Text>
                <Text style={styles.infoValue}>{selectedPlace.category || 'Not set'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Address:</Text>
                <Text style={styles.infoValue}>{selectedPlace.address}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Rating:</Text>
                <Text style={styles.infoValue}>
                  {selectedPlace.rating ? `★ ${selectedPlace.rating.toFixed(1)}` : 'No rating'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Added By:</Text>
                <Text style={styles.infoValue}>
                  {selectedPlace.profiles?.full_name || 'Unknown User'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Created:</Text>
                <Text style={styles.infoValue}>
                  {new Date(selectedPlace.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>

            {selectedPlace.ai_summary && (
              <View style={styles.placeSection}>
                <Text style={styles.sectionTitle}>AI Summary</Text>
                <Text style={styles.summaryText}>{selectedPlace.ai_summary}</Text>
              </View>
            )}

            {(selectedPlace.pros?.length || selectedPlace.cons?.length) && (
              <View style={styles.placeSection}>
                <Text style={styles.sectionTitle}>Pros & Cons</Text>
                {selectedPlace.pros?.length > 0 && (
                  <View style={styles.prosConsSection}>
                    <Text style={styles.prosConsTitle}>Pros:</Text>
                    {selectedPlace.pros.map((pro, index) => (
                      <Text key={index} style={styles.prosConsItem}>• {pro}</Text>
                    ))}
                  </View>
                )}
                {selectedPlace.cons?.length > 0 && (
                  <View style={styles.prosConsSection}>
                    <Text style={styles.prosConsTitle}>Cons:</Text>
                    {selectedPlace.cons.map((con, index) => (
                      <Text key={index} style={styles.prosConsItem}>• {con}</Text>
                    ))}
                  </View>
                )}
              </View>
            )}

            <View style={styles.placeSection}>
              <Text style={styles.sectionTitle}>Admin Actions</Text>
              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>Public Visibility</Text>
                  <Text style={styles.toggleDescription}>
                    Controls whether this place is visible to other users
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    selectedPlace.is_public && styles.toggleButtonActive
                  ]}
                  onPress={() => handleTogglePublic(selectedPlace)}
                >
                  <Text style={[
                    styles.toggleButtonText,
                    selectedPlace.is_public && styles.toggleButtonTextActive
                  ]}>
                    {selectedPlace.is_public ? 'Public' : 'Private'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeletePlace(selectedPlace)}
              >
                <Ionicons name="trash" size={20} color="white" />
                <Text style={styles.deleteButtonText}>Delete Place</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading places...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Place Management</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search places..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <CategoryFilter />

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.resultsText}>
          {filteredPlaces.length} place{filteredPlaces.length !== 1 ? 's' : ''} found
        </Text>

        {filteredPlaces.map((place) => (
          <TouchableOpacity
            key={place.id}
            style={styles.placeCard}
            onPress={() => handlePlacePress(place)}
          >
            {place.image_url && (
              <Image
                source={{ uri: place.image_url }}
                style={styles.cardImage}
                resizeMode="cover"
              />
            )}
            <View style={styles.cardContent}>
              <View style={styles.placeInfo}>
                <Text style={styles.placeName}>{place.name}</Text>
                <Text style={styles.placeAddress}>{place.address}</Text>
                <Text style={styles.placeCategory}>{place.category}</Text>
              </View>
              <View style={styles.placeMeta}>
                {place.rating && (
                  <Text style={styles.rating}>★ {place.rating.toFixed(1)}</Text>
                )}
                <View style={styles.badges}>
                  {!place.is_public && (
                    <View style={[styles.badge, styles.privateBadge]}>
                      <Text style={styles.badgeText}>Private</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.placeDate}>
                  {new Date(place.created_at).toLocaleDateString()}
                </Text>
                <Text style={styles.addedBy}>
                  by {place.profiles?.full_name || 'Unknown'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <PlaceModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  categoryFilter: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#007AFF',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  categoryButtonTextActive: {
    color: 'white',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  placeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 120,
  },
  cardContent: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  placeAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  placeCategory: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  placeMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  rating: {
    fontSize: 14,
    color: '#FF9500',
    fontWeight: '600',
  },
  badges: {
    flexDirection: 'row',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  privateBadge: {
    backgroundColor: '#FF9500',
  },
  badgeText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  placeDate: {
    fontSize: 12,
    color: '#999',
  },
  addedBy: {
    fontSize: 12,
    color: '#999',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
  },
  placeImage: {
    width: '100%',
    height: 200,
  },
  placeSection: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    width: '30%',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  summaryText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  prosConsSection: {
    marginBottom: 12,
  },
  prosConsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  prosConsItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  toggleDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    maxWidth: '70%',
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    minWidth: 80,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#007AFF',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  toggleButtonTextActive: {
    color: 'white',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});