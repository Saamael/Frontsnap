import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Heart, MapPin, Star, Plus, Grid3x3 as Grid3X3, List } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { getUserCollections, getCurrentUser, Collection } from '@/lib/supabase';

export default function CollectionsScreen() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedTab, setSelectedTab] = useState<'places' | 'collections'>('collections');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    checkAuthAndLoadData();
    
    return () => {
      mounted.current = false;
    };
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        console.log('🚫 User not authenticated in collections page, redirecting to auth');
        router.replace('/auth/login');
        return;
      }
      
      if (mounted.current) {
        setIsAuthenticated(true);
        await loadUserCollections(user.id);
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      router.replace('/auth/login');
    }
  };

  const loadUserCollections = async (userId: string) => {
    try {
      setIsLoading(true);
      const userCollections = await getUserCollections(userId);
      
      // The getUserCollections function already includes places via join
      const collectionsWithPlaces = userCollections.map((collection) => {
        const places = (collection.places || []).map(place => ({
          ...place,
          // Ensure rating is a number, default to 0 if missing/null
          rating: typeof place.rating === 'number' ? place.rating : 0,
          // Ensure other required fields have defaults
          review_count: place.review_count || 0,
          pros: place.pros || [],
          cons: place.cons || [],
          recommendations: place.recommendations || [],
          week_hours: place.week_hours || []
        }));
        
        return {
          ...collection,
          places: places,
          count: places.length
        };
      });

      // Also get all saved places for the "places" tab
      const allPlaces = collectionsWithPlaces.flatMap(c => c.places);
      
      if (mounted.current) {
        setCollections(collectionsWithPlaces);
        setSavedPlaces(allPlaces);
      }
    } catch (error) {
      console.error('Error loading collections:', error);
    } finally {
      if (mounted.current) {
        setIsLoading(false);
      }
    }
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

  const PlaceCard = ({ place, isGrid = true }: { place: any; isGrid?: boolean }) => (
    <TouchableOpacity 
      style={[styles.placeCard, isGrid && styles.gridPlaceCard]}
      onPress={() => console.log('Navigate to place:', place.id)}
    >
      <Image source={{ uri: place.image_url }} style={[styles.placeImage, isGrid && styles.gridPlaceImage]} />
      
      <View style={styles.placeInfo}>
        <Text style={styles.placeName} numberOfLines={1}>{place.name}</Text>
        <Text style={styles.placeCategory}>{place.category}</Text>
        
        <View style={styles.rating}>
          <Star size={12} color="#FFD700" strokeWidth={2} fill="#FFD700" />
          <Text style={styles.ratingText}>
            {place.rating && typeof place.rating === 'number' ? place.rating.toFixed(1) : '0.0'}
          </Text>
        </View>
        
        <Text style={styles.addedDate}>Added {formatDate(place.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );

  const CollectionCard = ({ collection }: { collection: any }) => (
    <TouchableOpacity 
      style={styles.collectionCard}
      onPress={() => {
        // Navigate to collection details if you have that route
        console.log('Navigate to collection:', collection.id);
      }}
    >
      <View style={[styles.collectionIcon, { backgroundColor: collection.color }]}>
        <Heart size={24} color="#FFFFFF" strokeWidth={2} fill="#FFFFFF" />
      </View>
      
      <View style={styles.collectionInfo}>
        <Text style={styles.collectionName}>{collection.name}</Text>
        <Text style={styles.collectionCount}>{collection.count} places</Text>
      </View>
      
      <View style={styles.collectionPreview}>
        {collection.places.slice(0, 3).map((place: any, index: number) => (
          <Image
            key={place.id}
            source={{ uri: place.image_url }}
            style={[styles.previewImage, { marginLeft: index > 0 ? -8 : 0 }]}
          />
        ))}
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading collections...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Collections</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => {
            // Navigate to create collection or open modal
            console.log('Create new collection');
          }}
        >
          <Plus size={20} color="#007AFF" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabSelector}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'collections' && styles.activeTab]}
          onPress={() => setSelectedTab('collections')}
        >
          <Text style={[styles.tabText, selectedTab === 'collections' && styles.activeTabText]}>
            Collections ({collections.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'places' && styles.activeTab]}
          onPress={() => setSelectedTab('places')}
        >
          <Text style={[styles.tabText, selectedTab === 'places' && styles.activeTabText]}>
            All Places ({savedPlaces.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* View Mode Toggle (only for places) */}
      {selectedTab === 'places' && (
        <View style={styles.viewModeToggle}>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'grid' && styles.activeViewMode]}
            onPress={() => setViewMode('grid')}
          >
            <Grid3X3 size={16} color={viewMode === 'grid' ? '#FFFFFF' : '#8E8E93'} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'list' && styles.activeViewMode]}
            onPress={() => setViewMode('list')}
          >
            <List size={16} color={viewMode === 'list' ? '#FFFFFF' : '#8E8E93'} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {selectedTab === 'collections' ? (
          <View style={styles.collectionsContainer}>
            {collections.length === 0 ? (
              <View style={styles.emptyState}>
                <Heart size={48} color="#C7C7CC" strokeWidth={1.5} />
                <Text style={styles.emptyStateTitle}>No Collections Yet</Text>
                <Text style={styles.emptyStateMessage}>
                  Start creating collections to organize your favorite places!
                </Text>
              </View>
            ) : (
              collections.map(collection => (
                <CollectionCard key={collection.id} collection={collection} />
              ))
            )}
          </View>
        ) : (
          <View style={[styles.placesContainer, viewMode === 'grid' && styles.gridContainer]}>
            {savedPlaces.length === 0 ? (
              <View style={styles.emptyState}>
                <MapPin size={48} color="#C7C7CC" strokeWidth={1.5} />
                <Text style={styles.emptyStateTitle}>No Saved Places</Text>
                <Text style={styles.emptyStateMessage}>
                  Capture places and add them to collections to see them here!
                </Text>
              </View>
            ) : (
              savedPlaces.map(place => (
                <PlaceCard key={place.id} place={place} isGrid={viewMode === 'grid'} />
              ))
            )}
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
    padding: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  createButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  tabSelector: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8E8E93',
  },
  activeTabText: {
    color: '#000000',
  },
  viewModeToggle: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  viewModeButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  activeViewMode: {
    backgroundColor: '#E3F2FF',
  },
  scrollView: {
    flex: 1,
  },
  placesContainer: {
    paddingHorizontal: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  listContainer: {
    gap: 16,
  },
  placeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  gridCard: {
    width: '48%',
    marginBottom: 16,
  },
  listCard: {
    flexDirection: 'row',
    padding: 12,
  },
  placeImage: {
    borderRadius: 8,
  },
  gridImage: {
    width: '100%',
    height: 120,
    marginBottom: 12,
  },
  listImage: {
    width: 80,
    height: 80,
    marginRight: 12,
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  placeCategory: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 8,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
    marginLeft: 4,
  },
  addedDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  collectionsContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  collectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  collectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  collectionInfo: {
    flex: 1,
  },
  collectionName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  collectionCount: {
    fontSize: 14,
    color: '#8E8E93',
  },
  collectionPreview: {
    flexDirection: 'row',
  },
  previewImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
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
    color: '#3C3C43',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
    marginTop: 16,
  },
  gridPlaceCard: {
    width: '48%',
    marginBottom: 16,
  },
  gridPlaceImage: {
    width: '100%',
    height: 120,
    marginBottom: 12,
  },
});