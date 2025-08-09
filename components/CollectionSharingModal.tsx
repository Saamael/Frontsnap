import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { 
  X, 
  Users, 
  Search, 
  Share2, 
  Copy,
  Check,
  UserPlus
} from 'lucide-react-native';
import { Collection, SocialProfile, enableCollectionSharing, shareCollectionWithFriend, getCollectionShareRecipients } from '@/lib/supabase';
import { useSocialConnections } from '@/hooks/useSocialConnections';
import { UserAvatar } from '@/components/UserAvatar';
import { HapticFeedback } from '@/utils/haptics';
import { useToast } from '@/hooks/useToast';
import * as Clipboard from 'expo-clipboard';

interface CollectionSharingModalProps {
  visible: boolean;
  collection: Collection | null;
  onClose: () => void;
}

export const CollectionSharingModal: React.FC<CollectionSharingModalProps> = ({
  visible,
  collection,
  onClose
}) => {
  const { toast, showSuccess, showError, hideToast } = useToast();
  const { connections, searchUsers } = useSocialConnections();
  
  const [activeTab, setActiveTab] = useState<'friends' | 'link'>('friends');
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<SocialProfile[]>([]);
  const [sharedWith, setSharedWith] = useState<SocialProfile[]>([]);
  const [shareCode, setShareCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (visible && collection) {
      loadSharedUsers();
      if (collection.is_shareable && collection.share_code) {
        setShareCode(collection.share_code);
      }
    }
  }, [visible, collection]);

  useEffect(() => {
    if (searchText.trim().length >= 2) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchText]);

  const loadSharedUsers = async () => {
    if (!collection) return;
    
    try {
      const users = await getCollectionShareRecipients(collection.id);
      setSharedWith(users);
    } catch (error) {
      console.error('Error loading shared users:', error);
    }
  };

  const performSearch = async () => {
    setIsSearching(true);
    try {
      const results = await searchUsers(searchText.trim());
      // Filter out users already shared with
      const filteredResults = results.filter(user => 
        !sharedWith.some(shared => shared.id === user.id)
      );
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleEnableSharing = async () => {
    if (!collection) return;
    
    setIsLoading(true);
    HapticFeedback.medium();
    
    try {
      const result = await enableCollectionSharing(collection.id);
      if (result.success && result.shareCode) {
        setShareCode(result.shareCode);
        showSuccess('Sharing Enabled', 'Your collection can now be shared via link');
      } else {
        showError('Failed to Enable', result.error || 'Could not enable sharing');
      }
    } catch (error) {
      showError('Error', 'Failed to enable sharing');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShareWithFriend = async (friend: SocialProfile) => {
    if (!collection) return;
    
    HapticFeedback.light();
    
    try {
      const result = await shareCollectionWithFriend(collection.id, friend.id);
      if (result.success) {
        setSharedWith(prev => [...prev, friend]);
        setSearchResults(prev => prev.filter(user => user.id !== friend.id));
        showSuccess('Shared!', `Collection shared with ${friend.full_name}`);
      } else {
        showError('Share Failed', result.error || 'Could not share collection');
      }
    } catch (error) {
      showError('Error', 'Failed to share collection');
    }
  };

  const handleCopyLink = async () => {
    if (!shareCode) return;
    
    HapticFeedback.light();
    const shareUrl = `https://frontsnap.app/collection/share/${shareCode}`;
    
    try {
      await Clipboard.setStringAsync(shareUrl);
      showSuccess('Copied!', 'Share link copied to clipboard');
    } catch (error) {
      showError('Copy Failed', 'Could not copy to clipboard');
    }
  };

  const handleNativeShare = async () => {
    if (!shareCode || !collection) return;
    
    HapticFeedback.medium();
    const shareUrl = `https://frontsnap.app/collection/share/${shareCode}`;
    
    try {
      await Share.share({
        message: `Check out my "${collection.name}" collection on FrontSnap!`,
        url: shareUrl,
        title: `${collection.name} - FrontSnap Collection`
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleClose = () => {
    HapticFeedback.light();
    setSearchText('');
    setSearchResults([]);
    onClose();
  };

  const FriendItem = ({ friend, isShared = false }: { friend: SocialProfile; isShared?: boolean }) => (
    <TouchableOpacity 
      style={styles.friendItem}
      onPress={() => !isShared && handleShareWithFriend(friend)}
      disabled={isShared}
    >
      <UserAvatar 
        imageUrl={friend.avatar_url}
        name={friend.full_name}
        size="medium"
      />
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{friend.full_name}</Text>
        {friend.username && (
          <Text style={styles.friendUsername}>@{friend.username}</Text>
        )}
      </View>
      
      {isShared ? (
        <View style={styles.sharedIndicator}>
          <Check size={16} color="#34C759" strokeWidth={2} />
          <Text style={styles.sharedText}>Shared</Text>
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={() => handleShareWithFriend(friend)}
        >
          <UserPlus size={16} color="#007AFF" strokeWidth={2} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  if (!collection) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Share Collection</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="#8E8E93" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View style={styles.collectionInfo}>
          <Text style={styles.collectionName}>{collection.name}</Text>
          <Text style={styles.collectionDescription}>
            {collection.description || 'Share this collection with friends'}
          </Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
            onPress={() => setActiveTab('friends')}
          >
            <Users size={16} color={activeTab === 'friends' ? '#007AFF' : '#8E8E93'} strokeWidth={2} />
            <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
              Friends
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'link' && styles.activeTab]}
            onPress={() => setActiveTab('link')}
          >
            <Share2 size={16} color={activeTab === 'link' ? '#007AFF' : '#8E8E93'} strokeWidth={2} />
            <Text style={[styles.tabText, activeTab === 'link' && styles.activeTabText]}>
              Share Link
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {activeTab === 'friends' ? (
            <>
              {/* Search */}
              <View style={styles.searchContainer}>
                <Search size={16} color="#8E8E93" strokeWidth={2} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search friends..."
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholderTextColor="#8E8E93"
                />
                {isSearching && (
                  <ActivityIndicator size="small" color="#007AFF" />
                )}
              </View>

              {/* Already Shared */}
              {sharedWith.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Shared With</Text>
                  {sharedWith.map(friend => (
                    <FriendItem key={friend.id} friend={friend} isShared />
                  ))}
                </View>
              )}

              {/* Search Results */}
              {searchResults.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Share With</Text>
                  <FlatList
                    data={searchResults}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <FriendItem friend={item} />}
                    showsVerticalScrollIndicator={false}
                  />
                </View>
              )}

              {/* Empty State */}
              {searchText.trim() === '' && sharedWith.length === 0 && (
                <View style={styles.emptyState}>
                  <Users size={48} color="#C7C7CC" strokeWidth={1} />
                  <Text style={styles.emptyTitle}>Share with Friends</Text>
                  <Text style={styles.emptyText}>
                    Search for friends to share this collection with
                  </Text>
                </View>
              )}
            </>
          ) : (
            /* Link Sharing */
            <View style={styles.linkSection}>
              {shareCode ? (
                <>
                  <View style={styles.shareCodeContainer}>
                    <Text style={styles.shareCodeLabel}>Share Code</Text>
                    <View style={styles.shareCodeBox}>
                      <Text style={styles.shareCode}>{shareCode}</Text>
                      <TouchableOpacity onPress={handleCopyLink} style={styles.copyButton}>
                        <Copy size={16} color="#007AFF" strokeWidth={2} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.shareActions}>
                    <TouchableOpacity style={styles.shareActionButton} onPress={handleNativeShare}>
                      <Share2 size={20} color="#007AFF" strokeWidth={2} />
                      <Text style={styles.shareActionText}>Share Link</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.shareNote}>
                    Anyone with this link can view your collection
                  </Text>
                </>
              ) : (
                <View style={styles.enableSharingContainer}>
                  <Share2 size={48} color="#C7C7CC" strokeWidth={1} />
                  <Text style={styles.enableSharingTitle}>Enable Link Sharing</Text>
                  <Text style={styles.enableSharingText}>
                    Generate a shareable link that anyone can use to view this collection
                  </Text>
                  
                  <TouchableOpacity 
                    style={styles.enableButton}
                    onPress={handleEnableSharing}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Share2 size={16} color="#FFFFFF" strokeWidth={2} />
                        <Text style={styles.enableButtonText}>Enable Sharing</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C2C2E',
  },
  closeButton: {
    padding: 4,
  },
  collectionInfo: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  collectionName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C2C2E',
    marginBottom: 4,
  },
  collectionDescription: {
    fontSize: 14,
    color: '#8E8E93',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F2F2F7',
    marginRight: 8,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#007AFF10',
    borderWidth: 1,
    borderColor: '#007AFF30',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginLeft: 6,
  },
  activeTabText: {
    color: '#007AFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2C2C2E',
    marginLeft: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2E',
    marginBottom: 12,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C2C2E',
  },
  friendUsername: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF10',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF30',
  },
  sharedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C75910',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sharedText: {
    fontSize: 12,
    color: '#34C759',
    marginLeft: 4,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C2C2E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  linkSection: {
    flex: 1,
  },
  shareCodeContainer: {
    marginBottom: 24,
  },
  shareCodeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2C2C2E',
    marginBottom: 8,
  },
  shareCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  shareCode: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#2C2C2E',
    letterSpacing: 2,
  },
  copyButton: {
    padding: 4,
  },
  shareActions: {
    marginBottom: 16,
  },
  shareActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  shareActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  shareNote: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  enableSharingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  enableSharingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C2C2E',
    marginTop: 16,
    marginBottom: 8,
  },
  enableSharingText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  enableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  enableButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});