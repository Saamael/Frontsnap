import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  FlatList,
  Share,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  Share2, 
  Edit3, 
  MapPin, 
  Star,
  Trash2,
  Grid3X3,
  List,
  Plus 
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { 
  getCurrentUser, 
  getUserCollectionById, 
  getCollectionPlaces, 
  deleteCollection 
} from '@/lib/supabase';

// Screen dimensions and responsive constants
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallDevice = screenWidth < 375;
const isLargeDevice = screenWidth > 414;

// Enhanced grid layout calculations with iOS optimizations
const CONTENT_PADDING = isSmallDevice ? 16 : 20;
const GRID_SPACING = isSmallDevice ? 10 : 14;
const SAFE_AREA_HORIZONTAL = Platform.OS === 'ios' ? 8 : 0;
const GRID_ITEM_WIDTH = (screenWidth - (CONTENT_PADDING * 2) - GRID_SPACING - SAFE_AREA_HORIZONTAL) / 2;

// iOS-specific layout constants
const HEADER_BUTTON_SIZE = Platform.OS === 'ios' ? 44 : 40;
const CARD_BORDER_RADIUS = Platform.OS === 'ios' ? 16 : 12;

interface Collection {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  color: string;
  is_public: boolean;
  cover_image?: string;
  created_at: string;
  updated_at: string;
  place_count?: number;
}

interface Place {
  id: string;
  name: string;
  category: string;
  rating?: number;
  image_url: string;
  address: string;
}

export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadCollectionAndPlaces();
  }, [id]);

  const loadCollectionAndPlaces = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      
      // Get current user
      const user = await getCurrentUser();
      if (!user) {
        router.replace('/auth/login');
        return;
      }
      setCurrentUser(user);

      console.log('🔍 Loading collection details for ID:', id);
      
      // Load collection details using real implementation
      const collectionData = await getUserCollectionById(id);
      
      if (!collectionData) {
        console.error('❌ Collection not found:', id);
        Alert.alert('Error', 'Collection not found.');
        router.back();
        return;
      }
      
      console.log('✅ Collection loaded:', collectionData.name);
      setCollection(collectionData);
      
      // Load places for this collection using real implementation
      console.log('🔍 Loading places for collection:', collectionData.name);
      const collectionPlaces = await getCollectionPlaces(id);
      
      console.log(`✅ Found ${collectionPlaces.length} places in collection`);
      setPlaces(collectionPlaces);
      
    } catch (error) {
      console.error('❌ Error loading collection:', error);
      Alert.alert('Error', 'Failed to load collection details.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (!collection) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/collection/edit/${collection.id}`);
  };

  const handleShare = async () => {
    if (!collection) return;
    
    try {
      const shareUrl = `frontsnap://collection/${collection.id}`;
      await Share.share({
        message: `Check out my "${collection.name}" collection on FrontSnap! ${shareUrl}`,
        url: shareUrl,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Error sharing collection:', error);
    }
  };

  const handleDelete = () => {
    if (!collection) return;
    
    Alert.alert(
      'Delete Collection',
      `Are you sure you want to delete "${collection.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Implement delete functionality
              console.log('Deleting collection:', collection.id);
              // await deleteCollection(collection.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            } catch (error) {
              console.error('Error deleting collection:', error);
              Alert.alert('Error', 'Failed to delete collection.');
            }
          }
        }
      ]
    );
  };

  const handlePlacePress = (place: Place) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/place/${place.id}`);
  };

  const renderPlaceItem = ({ item }: { item: Place }) => (
    <TouchableOpacity 
      style={[styles.placeCard, viewMode === 'grid' && styles.gridPlaceCard]}
      onPress={() => handlePlacePress(item)}
    >
      <Image 
        source={{ uri: item.image_url }} 
        style={[styles.placeImage, viewMode === 'grid' && styles.gridPlaceImage]}
      />
      <View style={styles.placeInfo}>
        <Text style={styles.placeName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.placeCategory}>{item.category}</Text>
        {item.rating && (
          <View style={styles.rating}>
            <Star size={12} color="#FFD700" strokeWidth={2} fill="#FFD700" />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading collection...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!collection) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Collection not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: Platform.OS === 'ios' ? 0 : insets.top }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#007AFF" />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Share2 size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleEdit}>
            <Edit3 size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
            <Trash2 size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {places.length > 0 ? (
          <FlatList
            data={places}
            renderItem={renderPlaceItem}
            keyExtractor={(item) => item.id}
            numColumns={viewMode === 'grid' ? 2 : 1}
            key={viewMode} // Force re-render when view mode changes
            contentContainerStyle={styles.placesList}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View>
                <View style={styles.collectionInfo}>
                  <Text style={styles.collectionName}>{collection.name}</Text>
                  {collection.description && (
                    <Text style={styles.collectionDescription}>{collection.description}</Text>
                  )}
                  
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{places.length}</Text>
                      <Text style={styles.statLabel}>Places</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{collection.is_public ? 'Public' : 'Private'}</Text>
                      <Text style={styles.statLabel}>Visibility</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.placesSection}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Places</Text>
                    <View style={styles.viewModeToggle}>
                      <TouchableOpacity
                        style={[styles.viewModeButton, viewMode === 'grid' && styles.activeViewMode]}
                        onPress={() => setViewMode('grid')}
                      >
                        <Grid3X3 size={18} color={viewMode === 'grid' ? '#007AFF' : '#8E8E93'} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.viewModeButton, viewMode === 'list' && styles.activeViewMode]}
                        onPress={() => setViewMode('list')}
                      >
                        <List size={18} color={viewMode === 'list' ? '#007AFF' : '#8E8E93'} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            }
            columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
          />
        ) : (
          <View style={[styles.content, styles.emptyContainer]}>
            <View style={styles.collectionInfo}>
              <Text style={styles.collectionName}>{collection.name}</Text>
              {collection.description && (
                <Text style={styles.collectionDescription}>{collection.description}</Text>
              )}
              
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{places.length}</Text>
                  <Text style={styles.statLabel}>Places</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{collection.is_public ? 'Public' : 'Private'}</Text>
                  <Text style={styles.statLabel}>Visibility</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.emptyPlaces}>
              <Text style={styles.emptyTitle}>No Places Yet</Text>
              <Text style={styles.emptySubtitle}>Add places to this collection to see them here</Text>
              <TouchableOpacity style={styles.addButton}>
                <Plus size={20} color="#FFFFFF" />
                <Text style={styles.addButtonText}>Add Places</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E7',
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  backButton: {
    width: HEADER_BUTTON_SIZE,
    height: HEADER_BUTTON_SIZE,
    borderRadius: HEADER_BUTTON_SIZE / 2,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: HEADER_BUTTON_SIZE,
    height: HEADER_BUTTON_SIZE,
    borderRadius: HEADER_BUTTON_SIZE / 2,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  content: {
    flex: 1,
  },
  collectionInfo: {
    paddingHorizontal: CONTENT_PADDING,
    paddingVertical: isSmallDevice ? 16 : 20,
  },
  collectionName: {
    fontSize: isSmallDevice ? 24 : 28,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 8,
    ...Platform.select({
      ios: {
        letterSpacing: -0.5,
        lineHeight: isSmallDevice ? 30 : 34,
      },
      android: {
        lineHeight: isSmallDevice ? 28 : 32,
      },
    }),
  },
  collectionDescription: {
    fontSize: 16,
    color: '#8E8E93',
    lineHeight: 22,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1D1D1F',
  },
  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  placesSection: {
    flex: 1,
    paddingHorizontal: CONTENT_PADDING,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  viewModeToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  viewModeButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeViewMode: {
    backgroundColor: '#F2F2F7',
  },
  placeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: CARD_BORDER_RADIUS,
    marginBottom: isSmallDevice ? 12 : 16,
    borderWidth: Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 1,
    borderColor: '#E5E5E7',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  gridPlaceCard: {
    width: GRID_ITEM_WIDTH,
  },
  placeImage: {
    width: '100%',
    height: isLargeDevice ? 180 : 160,
    borderTopLeftRadius: CARD_BORDER_RADIUS,
    borderTopRightRadius: CARD_BORDER_RADIUS,
    backgroundColor: '#F2F2F7', // Fallback background
  },
  gridPlaceImage: {
    height: isSmallDevice ? 100 : (isLargeDevice ? 140 : 120),
  },
  placeInfo: {
    padding: 12,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  placeCategory: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 4,
  },
  placesList: {
    paddingTop: 8,
    paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 34 : 16),
  },
  gridRow: {
    justifyContent: 'space-between',
    paddingHorizontal: CONTENT_PADDING,
    marginBottom: 0,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyPlaces: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});