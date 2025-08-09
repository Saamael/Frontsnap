import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { 
  X, 
  Plus, 
  Heart, 
  Check, 
  Search,
  Folder,
  Globe,
  Lock
} from 'lucide-react-native';
import { getUserCollections, createCollection, addPlaceToCollection, getCurrentUser, Collection } from '@/lib/supabase';
import { HapticFeedback } from '@/utils/haptics';
import { useToast } from '@/hooks/useToast';

interface CollectionSelectorProps {
  visible: boolean;
  onClose: () => void;
  placeId: string;
  placeName: string;
}

export const CollectionSelector: React.FC<CollectionSelectorProps> = ({
  visible,
  onClose,
  placeId,
  placeName,
}) => {
  const { showSuccess, showError } = useToast();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [filteredCollections, setFilteredCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) {
      loadCollections();
    }
  }, [visible]);

  useEffect(() => {
    filterCollections();
  }, [collections, searchText]);

  const loadCollections = async () => {
    try {
      setIsLoading(true);
      const user = await getCurrentUser();
      if (!user) {
        showError('Authentication Error', 'Please sign in to save places');
        return;
      }

      const userCollections = await getUserCollections(user.id);
      setCollections(userCollections);
    } catch (error) {
      console.error('Error loading collections:', error);
      showError('Loading Error', 'Failed to load your collections');
    } finally {
      setIsLoading(false);
    }
  };

  const filterCollections = () => {
    if (!searchText.trim()) {
      setFilteredCollections(collections);
    } else {
      const filtered = collections.filter(collection =>
        collection.name.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredCollections(filtered);
    }
  };

  const handleCollectionToggle = async (collectionId: string) => {
    try {
      HapticFeedback.selection();
      
      const newSelected = new Set(selectedCollections);
      if (newSelected.has(collectionId)) {
        newSelected.delete(collectionId);
        // TODO: Remove from collection if needed
      } else {
        newSelected.add(collectionId);
        await addPlaceToCollection(placeId, collectionId);
        
        const collection = collections.find(c => c.id === collectionId);
        showSuccess('Added to Collection', `${placeName} added to ${collection?.name}`);
      }
      
      setSelectedCollections(newSelected);
    } catch (error) {
      console.error('Error toggling collection:', error);
      showError('Save Failed', 'Failed to add place to collection');
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) {
      showError('Validation Error', 'Please enter a collection name');
      return;
    }

    try {
      setIsCreating(true);
      HapticFeedback.medium();

      const user = await getCurrentUser();
      if (!user) {
        showError('Authentication Error', 'Please sign in to create collections');
        return;
      }

      const newCollection = await createCollection({
        name: newCollectionName.trim(),
        description: '',
        is_public: false,
        user_id: user.id,
      });

      // Add place to the new collection
      await addPlaceToCollection(placeId, newCollection.id);

      // Update local state
      setCollections(prev => [...prev, newCollection]);
      setSelectedCollections(prev => new Set(prev).add(newCollection.id));
      
      // Reset form
      setNewCollectionName('');
      setShowCreateForm(false);
      
      showSuccess('Collection Created', `${placeName} added to ${newCollection.name}`);
    } catch (error) {
      console.error('Error creating collection:', error);
      showError('Creation Failed', 'Failed to create collection');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    HapticFeedback.light();
    setSearchText('');
    setShowCreateForm(false);
    setNewCollectionName('');
    setSelectedCollections(new Set());
    onClose();
  };

  const CollectionItem = ({ collection }: { collection: Collection }) => {
    const isSelected = selectedCollections.has(collection.id);
    
    return (
      <TouchableOpacity
        style={[styles.collectionItem, isSelected && styles.collectionItemSelected]}
        onPress={() => handleCollectionToggle(collection.id)}
        accessibilityLabel={`${collection.name} collection`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSelected }}
      >
        <View style={styles.collectionItemLeft}>
          <View style={[styles.collectionIcon, { backgroundColor: collection.color || '#007AFF' }]}>
            <Heart size={16} color="#FFFFFF" strokeWidth={2} fill="#FFFFFF" />
          </View>
          <View style={styles.collectionInfo}>
            <Text style={styles.collectionName}>{collection.name}</Text>
            <View style={styles.collectionMeta}>
              <Text style={styles.collectionCount}>
                {collection.places?.length || 0} places
              </Text>
              <View style={styles.privacyIndicator}>
                {collection.is_public ? (
                  <Globe size={12} color="#8E8E93" strokeWidth={2} />
                ) : (
                  <Lock size={12} color="#8E8E93" strokeWidth={2} />
                )}
              </View>
            </View>
          </View>
        </View>
        
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Check size={16} color="#FFFFFF" strokeWidth={2} />}
        </View>
      </TouchableOpacity>
    );
  };

  const CreateCollectionForm = () => (
    <View style={styles.createForm}>
      <TextInput
        style={styles.createInput}
        value={newCollectionName}
        onChangeText={setNewCollectionName}
        placeholder="Collection name"
        placeholderTextColor="#8E8E93"
        maxLength={50}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={handleCreateCollection}
        accessibilityLabel="New collection name"
      />
      <View style={styles.createButtons}>
        <TouchableOpacity
          style={styles.createButtonCancel}
          onPress={() => {
            setShowCreateForm(false);
            setNewCollectionName('');
          }}
          accessibilityLabel="Cancel creating collection"
          accessibilityRole="button"
        >
          <Text style={styles.createButtonCancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.createButtonSave, !newCollectionName.trim() && styles.createButtonDisabled]}
          onPress={handleCreateCollection}
          disabled={isCreating || !newCollectionName.trim()}
          accessibilityLabel="Create collection"
          accessibilityRole="button"
        >
          {isCreating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.createButtonSaveText}>Create</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            accessibilityLabel="Close collection selector"
            accessibilityRole="button"
          >
            <X size={24} color="#8E8E93" strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Save to Collection</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowCreateForm(true)}
            accessibilityLabel="Create new collection"
            accessibilityRole="button"
          >
            <Plus size={24} color="#007AFF" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Place Info */}
        <View style={styles.placeInfo}>
          <Text style={styles.placeName} numberOfLines={1}>
            {placeName}
          </Text>
          <Text style={styles.placeHint}>
            Select collections to save this place
          </Text>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Search size={16} color="#8E8E93" strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search collections..."
            placeholderTextColor="#8E8E93"
            accessibilityLabel="Search collections"
          />
        </View>

        {/* Create Form */}
        {showCreateForm && <CreateCollectionForm />}

        {/* Collections List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading collections...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredCollections}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <CollectionItem collection={item} />}
            style={styles.collectionsList}
            contentContainerStyle={filteredCollections.length === 0 ? styles.emptyContainer : undefined}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Folder size={48} color="#C7C7CC" strokeWidth={1.5} />
                <Text style={styles.emptyTitle}>
                  {searchText ? 'No Collections Found' : 'No Collections Yet'}
                </Text>
                <Text style={styles.emptyMessage}>
                  {searchText 
                    ? 'Try a different search term or create a new collection'
                    : 'Create your first collection to organize your favorite places'
                  }
                </Text>
                {!searchText && (
                  <TouchableOpacity
                    style={styles.emptyButton}
                    onPress={() => setShowCreateForm(true)}
                    accessibilityLabel="Create first collection"
                    accessibilityRole="button"
                  >
                    <Plus size={16} color="#FFFFFF" strokeWidth={2} />
                    <Text style={styles.emptyButtonText}>Create Collection</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

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
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C2C2E',
  },
  addButton: {
    padding: 4,
  },
  placeInfo: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  placeName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C2C2E',
    marginBottom: 4,
  },
  placeHint: {
    fontSize: 14,
    color: '#8E8E93',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F2F2F7',
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2C2C2E',
  },
  createForm: {
    backgroundColor: '#F2F2F7',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  createInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  createButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  createButtonCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  createButtonCancelText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  createButtonSave: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  createButtonSaveText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  collectionsList: {
    flex: 1,
  },
  collectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  collectionItemSelected: {
    backgroundColor: '#F0F8FF',
  },
  collectionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  collectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  collectionInfo: {
    flex: 1,
  },
  collectionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C2C2E',
    marginBottom: 2,
  },
  collectionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  collectionCount: {
    fontSize: 14,
    color: '#8E8E93',
  },
  privacyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C2C2E',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});