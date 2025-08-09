import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  TextInput,
  Modal,
  Alert,
  Share,
  Dimensions,
  Switch,
  RefreshControl,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  Plus, 
  Share2, 
  MoreVertical, 
  Grid3X3, 
  List, 
  Star,
  Globe,
  Lock,
  MapPin,
  Calendar,
  X,
  Check
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ScreenErrorBoundary } from '@/components/ErrorBoundary';
import { 
  getCurrentUser, 
  getUserCollectionsWithCount, 
  getPublicCollections, 
  createCollectionWithDetails, 
  getUserAllPlaces,
  updateCollection,
  deleteCollection 
} from '@/lib/supabase';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Responsive design constants
const isSmallDevice = screenWidth < 375;
const CARD_MARGIN = isSmallDevice ? 12 : 16;
const CARD_SPACING = isSmallDevice ? 6 : 8;
const CARD_WIDTH = (screenWidth - (CARD_MARGIN * 2) - CARD_SPACING) / 2;

// iOS-specific constants
const SAFE_AREA_TOP = Platform.OS === 'ios' ? 0 : 16;
const HEADER_HEIGHT = Platform.OS === 'ios' ? 0 : 60;

// Import shared types
import { Collection, Place } from '@/types/place';

// Create Collection Modal Component
const CreateCollectionModal = ({ 
  visible, 
  onClose, 
  onCreateCollection, 
  isLoading 
}: {
  visible: boolean;
  onClose: () => void;
  onCreateCollection: (data: { name: string; description: string; isPublic: boolean; color: string }) => void;
  isLoading: boolean;
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#007AFF');

  const colorOptions = [
    '#007AFF', '#34C759', '#FF9500', '#FF3B30',
    '#AF52DE', '#00C7BE', '#FF2D92', '#A2845E'
  ];

  const handleCreate = () => {
    if (name.trim()) {
      onCreateCollection({
        name: name.trim(),
        description: description.trim(),
        isPublic,
        color: selectedColor
      });
      // Reset form
      setName('');
      setDescription('');
      setIsPublic(false);
      setSelectedColor('#007AFF');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={modalStyles.container}>
        <View style={modalStyles.header}>
          <TouchableOpacity onPress={onClose} style={modalStyles.closeButton}>
            <X size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={modalStyles.title}>New Collection</Text>
          <TouchableOpacity 
            onPress={handleCreate} 
            style={[modalStyles.createButton, !name.trim() && modalStyles.createButtonDisabled]}
            disabled={!name.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Check size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        <View style={modalStyles.content}>
          <View style={modalStyles.inputGroup}>
            <Text style={modalStyles.label}>Collection Name</Text>
            <TextInput
              style={modalStyles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter collection name"
              placeholderTextColor="#8E8E93"
              maxLength={50}
            />
          </View>

          <View style={modalStyles.inputGroup}>
            <Text style={modalStyles.label}>Description (Optional)</Text>
            <TextInput
              style={[modalStyles.input, modalStyles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add a description..."
              placeholderTextColor="#8E8E93"
              multiline
              numberOfLines={3}
              maxLength={200}
            />
          </View>

          <View style={modalStyles.inputGroup}>
            <View style={modalStyles.switchRow}>
              <View>
                <Text style={modalStyles.label}>Make Public</Text>
                <Text style={modalStyles.helpText}>Others can discover and save this collection</Text>
              </View>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                trackColor={{ false: '#E5E5E7', true: '#34C759' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          <View style={modalStyles.inputGroup}>
            <Text style={modalStyles.label}>Collection Color</Text>
            <View style={modalStyles.colorGrid}>
              {colorOptions.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    modalStyles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && modalStyles.colorOptionSelected
                  ]}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// Add Collection Card Component
const AddCollectionCard = React.memo(({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity 
    style={styles.addCollectionCard}
    onPress={onPress}
    activeOpacity={0.9}
  >
    <View style={styles.addCollectionContent}>
      <Plus size={32} color="#007AFF" strokeWidth={2} />
      <Text style={styles.addCollectionText}>Create Collection</Text>
    </View>
  </TouchableOpacity>
));

// Modern Collection Card Component
const ModernCollectionCard = React.memo(({ 
  collection, 
  onPress, 
  onShare, 
  onMenu 
}: {
  collection: Collection;
  onPress: () => void;
  onShare: () => void;
  onMenu: () => void;
}) => {
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }, []);

  return (
    <TouchableOpacity 
      style={styles.modernCollectionCard}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Cover Image or Color */}
      <View style={styles.collectionCover}>
        {collection.cover_image ? (
          <Image 
            source={{ uri: collection.cover_image }} 
            style={styles.coverImage} 
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
            placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
          />
        ) : (
          <View style={[styles.emptyCover, { backgroundColor: collection.color || '#007AFF' }]} />
        )}
        
        {/* Overlay with badge and share button */}
        <View style={styles.collectionOverlay}>
          <View style={styles.collectionBadge}>
            {collection.is_public ? (
              <View style={styles.publicBadge}>
                <Globe size={10} color="#FFFFFF" />
              </View>
            ) : (
              <View style={styles.privateBadge}>
                <Lock size={10} color="#FFFFFF" />
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Collection Details */}
      <View style={styles.collectionDetails}>
        <View style={styles.collectionHeader}>
          <Text style={styles.modernCollectionName} numberOfLines={1}>
            {collection.name}
          </Text>
          <TouchableOpacity
            style={styles.collectionMenuButton}
            onPress={onMenu}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <MoreVertical size={16} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        {collection.description && (
          <Text style={styles.collectionDescription} numberOfLines={2}>
            {collection.description}
          </Text>
        )}

        <View style={styles.collectionFooter}>
          <Text style={styles.collectionDate}>
            {formatDate(collection.created_at)} • {collection.place_count || 0} places
          </Text>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={onShare}
            hitSlop={{ top: 5, right: 5, bottom: 5, left: 5 }}
          >
            <Share2 size={14} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// Place Card Component
const PlaceCard = ({ place, isGrid = true }: { place: Place; isGrid?: boolean }) => (
  <TouchableOpacity 
    style={[styles.placeCard, isGrid && styles.gridPlaceCard]}
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      console.log('Navigate to place:', place.id);
    }}
  >
    <Image 
      source={{ uri: place.image_url }} 
      style={[styles.placeImage, isGrid && styles.gridPlaceImage]}
      contentFit="cover"
      transition={200}
      cachePolicy="memory-disk"
      placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
    />
    
    <View style={styles.placeInfo}>
      <Text style={styles.placeName} numberOfLines={1}>{place.name}</Text>
      <Text style={styles.placeCategory}>{place.category}</Text>
      
      <View style={styles.rating}>
        <Star size={12} color="#FFD700" strokeWidth={2} fill="#FFD700" />
        <Text style={styles.ratingText}>
          {place.rating ? place.rating.toFixed(1) : '0.0'}
        </Text>
      </View>
    </View>
  </TouchableOpacity>
);

export default function CollectionsScreen() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'collections' | 'places'>('collections');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadUserAndData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      if (selectedTab === 'collections') {
        loadCollections();
      } else {
        loadPlaces();
      }
    }
  }, [selectedTab, currentUser]);

  const loadUserAndData = async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) {
        router.replace('/auth/login');
        return;
      }
      setCurrentUser(user);
      await loadCollections();
    } catch (error) {
      console.error('Error loading user:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadCollections = async () => {
    if (!currentUser) return;
    
    try {
      const userCollections = await getUserCollectionsWithCount(currentUser.id);
      setCollections(userCollections);
    } catch (error) {
      console.error('Error loading collections:', error);
      Alert.alert('Error', 'Failed to load collections.');
    }
  };

  const loadPlaces = async () => {
    if (!currentUser) return;
    
    try {
      const userPlaces = await getUserAllPlaces(currentUser.id);
      setPlaces(userPlaces);
    } catch (error) {
      console.error('Error loading places:', error);
      Alert.alert('Error', 'Failed to load places.');
    }
  };

  const handleCreateCollection = async (data: { 
    name: string; 
    description: string; 
    isPublic: boolean; 
    color: string 
  }) => {
    if (!currentUser) return;
    
    setIsCreatingCollection(true);
    try {
      const { data: newCollection, error } = await createCollectionWithDetails({
        name: data.name,
        description: data.description,
        user_id: currentUser.id,
        color: data.color,
        is_public: data.isPublic
      });
      
      if (error) {
        Alert.alert('Error', 'Failed to create collection. Please try again.');
        return;
      }
      
      if (newCollection) {
        // Add to local state with place_count: 0
        const collectionWithCount = { ...newCollection, place_count: 0 };
        setCollections(prev => [collectionWithCount, ...prev]);
        setShowCreateModal(false);
        
        // Show success feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success', 'Collection created successfully!');
      }
    } catch (error) {
      console.error('Error creating collection:', error);
      Alert.alert('Error', 'Failed to create collection. Please try again.');
    } finally {
      setIsCreatingCollection(false);
    }
  };

  const handleShareCollection = async (collection: Collection) => {
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

  const handleCollectionMenu = (collection: Collection) => {
    Alert.alert(
      collection.name,
      'Choose an action',
      [
        { 
          text: 'Edit', 
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push(`/collection/edit/${collection.id}`);
          }
        },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => handleDeleteCollection(collection.id, collection.name) 
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleDeleteCollection = async (collectionId: string, collectionName: string) => {
    Alert.alert(
      'Delete Collection',
      `Are you sure you want to delete "${collectionName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await deleteCollection(collectionId);
              if (error) {
                Alert.alert('Error', 'Failed to delete collection. Please try again.');
                return;
              }
              
              // Remove from local state
              setCollections(prev => prev.filter(c => c.id !== collectionId));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', 'Collection deleted successfully.');
            } catch (error) {
              console.error('Error deleting collection:', error);
              Alert.alert('Error', 'Failed to delete collection. Please try again.');
            }
          }
        }
      ]
    );
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (selectedTab === 'collections') {
        await loadCollections();
      } else {
        await loadPlaces();
      }
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [selectedTab, currentUser]);

  const renderCollectionItem = ({ item, index }: { item: Collection | { id: 'add-button' }; index: number }) => {
    // Render the + button as the first item
    if (item.id === 'add-button') {
      return (
        <AddCollectionCard
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowCreateModal(true);
          }}
        />
      );
    }

    // Render regular collection card
    const collection = item as Collection;
    return (
      <ModernCollectionCard
        collection={collection}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/collection/${collection.id}`);
        }}
        onShare={() => handleShareCollection(collection)}
        onMenu={() => handleCollectionMenu(collection)}
      />
    );
  };

  const renderPlaceItem = ({ item }: { item: Place }) => (
    <PlaceCard place={item} isGrid={viewMode === 'grid'} />
  );

  const EmptyCollections = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No Collections Yet</Text>
      <Text style={styles.emptySubtitle}>Use the "Create Collection" card above to get started!</Text>
    </View>
  );

  const EmptyPlaces = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No Saved Places</Text>
      <Text style={styles.emptySubtitle}>Start discovering and saving places you love</Text>
    </View>
  );

  if (loading) {
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
    <ScreenErrorBoundary>
      <SafeAreaView style={[styles.container, { paddingTop: Platform.OS === 'ios' ? 0 : insets.top }]}>
      {/* Header - Conditional rendering for cleaner UI */}
      {Platform.OS !== 'ios' && (
        <View style={styles.header}>
        </View>
      )}

      {/* Tab Selector */}
      <View style={styles.tabSelector}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'collections' && styles.activeTab]}
          onPress={() => {
            Haptics.selectionAsync();
            setSelectedTab('collections');
          }}
        >
          <Text style={[styles.tabText, selectedTab === 'collections' && styles.activeTabText]}>
            Collections ({collections.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'places' && styles.activeTab]}
          onPress={() => {
            Haptics.selectionAsync();
            setSelectedTab('places');
          }}
        >
          <Text style={[styles.tabText, selectedTab === 'places' && styles.activeTabText]}>
            All Places ({places.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* View Mode Toggle (only for places) */}
      {selectedTab === 'places' && (
        <View style={styles.viewModeToggle}>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'grid' && styles.activeViewMode]}
            onPress={() => {
              Haptics.selectionAsync();
              setViewMode('grid');
            }}
          >
            <Grid3X3 size={isSmallDevice ? 16 : 18} color={viewMode === 'grid' ? '#007AFF' : '#8E8E93'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'list' && styles.activeViewMode]}
            onPress={() => {
              Haptics.selectionAsync();
              setViewMode('list');
            }}
          >
            <List size={isSmallDevice ? 16 : 18} color={viewMode === 'list' ? '#007AFF' : '#8E8E93'} />
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {selectedTab === 'collections' ? (
        <FlatList
          data={[{ id: 'add-button' }, ...collections]}
          renderItem={renderCollectionItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContainer}
          ListFooterComponent={collections.length === 0 ? EmptyCollections : undefined}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          key={viewMode} // Force re-render when viewMode changes
          data={places}
          renderItem={renderPlaceItem}
          keyExtractor={(item) => item.id}
          numColumns={viewMode === 'grid' ? 2 : 1}
          columnWrapperStyle={viewMode === 'grid' ? styles.row : undefined}
          contentContainerStyle={[
            styles.listContainer,
            places.length === 0 && styles.emptyListContainer
          ]}
          ListEmptyComponent={EmptyPlaces}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create Collection Modal */}
      <CreateCollectionModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateCollection={handleCreateCollection}
        isLoading={isCreatingCollection}
      />
      </SafeAreaView>
    </ScreenErrorBoundary>
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
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
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
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1D1D1F',
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    marginHorizontal: CARD_MARGIN,
    marginVertical: isSmallDevice ? 12 : 16,
    borderRadius: Platform.OS === 'ios' ? 10 : 12,
    padding: 3,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
      },
    }),
  },
  tab: {
    flex: 1,
    paddingVertical: isSmallDevice ? 10 : 12,
    paddingHorizontal: isSmallDevice ? 12 : 16,
    borderRadius: Platform.OS === 'ios' ? 7 : 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8E8E93',
  },
  activeTabText: {
    color: '#1D1D1F',
  },
  viewModeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  viewModeButton: {
    width: isSmallDevice ? 36 : 40,
    height: isSmallDevice ? 36 : 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  activeViewMode: {
    backgroundColor: '#F2F2F7',
  },
  listContainer: {
    paddingHorizontal: CARD_MARGIN,
    paddingTop: 0,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16, // Account for home indicator
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    marginBottom: 0,
  },
  addCollectionCard: {
    width: CARD_WIDTH,
    height: isSmallDevice ? 180 : 200,
    backgroundColor: '#F8F9FA',
    borderRadius: Platform.OS === 'ios' ? 14 : 16,
    marginBottom: isSmallDevice ? 16 : 20,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  addCollectionContent: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  addCollectionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'center',
  },
  modernCollectionCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'ios' ? 14 : 16,
    marginBottom: isSmallDevice ? 16 : 20,
    borderWidth: Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 1,
    borderColor: '#E5E5E7',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  collectionCover: {
    width: '100%',
    height: isSmallDevice ? 100 : 120,
    borderTopLeftRadius: Platform.OS === 'ios' ? 14 : 16,
    borderTopRightRadius: Platform.OS === 'ios' ? 14 : 16,
    overflow: 'hidden',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  emptyCover: {
    width: '100%',
    height: '100%',
  },
  collectionOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  collectionBadge: {
    flexDirection: 'row',
  },
  publicBadge: {
    backgroundColor: 'rgba(52, 199, 89, 0.9)',
    borderRadius: 12,
    padding: 4,
  },
  privateBadge: {
    backgroundColor: 'rgba(142, 142, 147, 0.9)',
    borderRadius: 12,
    padding: 4,
  },
  collectionDetails: {
    padding: 12,
  },
  collectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modernCollectionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    flex: 1,
  },
  collectionMenuButton: {
    padding: 4,
  },
  collectionDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
    lineHeight: 18,
  },
  collectionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  collectionDate: {
    fontSize: 12,
    color: '#8E8E93',
    flex: 1,
  },
  shareButton: {
    padding: 4,
  },
  placeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'ios' ? 12 : 12,
    marginBottom: isSmallDevice ? 12 : 16,
    borderWidth: Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 1,
    borderColor: '#E5E5E7',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  gridPlaceCard: {
    width: CARD_WIDTH,
  },
  placeImage: {
    width: '100%',
    height: 160,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  gridPlaceImage: {
    height: isSmallDevice ? 100 : 120,
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});

const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  createButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#8E8E93',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E7',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  helpText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'transparent',
    marginRight: 12,
    marginBottom: 12,
  },
  colorOptionSelected: {
    borderColor: '#007AFF',
  },
});
