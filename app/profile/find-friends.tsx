import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Image,
} from 'react-native';
import { 
  ArrowLeft, 
  Search, 
  UserPlus, 
  Users,
  MapPin,
  Check
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { SocialProfile } from '@/lib/supabase';
import { useSocialConnections } from '@/hooks/useSocialConnections';
import { HapticFeedback } from '@/utils/haptics';
import { useToast } from '@/hooks/useToast';
import { Toast } from '@/components/Toast';

export default function FindFriendsScreen() {
  const router = useRouter();
  const { toast, showSuccess, showError, hideToast } = useToast();
  const { 
    followUser, 
    unfollowUser, 
    isFollowing, 
    searchUsers,
    isLoading: connectionsLoading 
  } = useSocialConnections();
  
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<SocialProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

  useEffect(() => {
    if (searchText.trim().length >= 2) {
      performSearch();
    } else {
      setSearchResults([]);
      setSearchPerformed(false);
    }
  }, [searchText]);

  const performSearch = async () => {
    if (!searchText.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await searchUsers(searchText.trim());
      setSearchResults(results);
      setSearchPerformed(true);
    } catch (error) {
      console.error('Error searching users:', error);
      showError('Search Failed', 'Could not search for users');
    } finally {
      setIsSearching(false);
    }
  };

  const handleBack = () => {
    HapticFeedback.light();
    router.back();
  };

  const handleFollowPress = async (user: SocialProfile) => {
    HapticFeedback.medium();
    
    const isCurrentlyFollowing = isFollowing(user.id);
    
    try {
      let success;
      if (isCurrentlyFollowing) {
        success = await unfollowUser(user.id);
        if (success) {
          showSuccess('Unfollowed', `You unfollowed ${user.full_name}`);
        }
      } else {
        success = await followUser(user.id);
        if (success) {
          showSuccess('Following!', `You're now following ${user.full_name}`);
        }
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      showError('Action Failed', 'Could not update follow status');
    }
  };

  const UserCard = ({ user }: { user: SocialProfile }) => {
    const userIsFollowing = isFollowing(user.id);
    
    return (
      <TouchableOpacity 
        style={styles.userCard}
        onPress={() => handleFollowPress(user)}
        accessibilityLabel={`${user.full_name}, ${user.username ? `@${user.username}` : 'no username'}`}
        accessibilityRole="button"
        accessibilityHint={userIsFollowing ? "Double tap to unfollow" : "Double tap to follow"}
      >
        <View style={styles.userInfo}>
          <Image 
            source={{ 
              uri: user.avatar_url || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=200' 
            }} 
            style={styles.avatar}
            accessibilityIgnoresInvertColors={true}
          />
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{user.full_name}</Text>
            {user.username && (
              <Text style={styles.username}>@{user.username}</Text>
            )}
            {user.bio && (
              <Text style={styles.userBio} numberOfLines={2}>{user.bio}</Text>
            )}
          </View>
        </View>
        
        <TouchableOpacity
          style={[
            styles.followButton,
            userIsFollowing && styles.followingButton
          ]}
          onPress={() => handleFollowPress(user)}
          accessibilityLabel={userIsFollowing ? "Unfollow" : "Follow"}
          accessibilityRole="button"
        >
          {userIsFollowing ? (
            <>
              <Check size={16} color="#34C759" strokeWidth={2} />
              <Text style={styles.followingButtonText}>Following</Text>
            </>
          ) : (
            <>
              <UserPlus size={16} color="#007AFF" strokeWidth={2} />
              <Text style={styles.followButtonText}>Follow</Text>
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (isSearching) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.centerText}>Searching for users...</Text>
        </View>
      );
    }

    if (searchPerformed && searchResults.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Users size={48} color="#C7C7CC" strokeWidth={1} />
          <Text style={styles.centerTitle}>No Users Found</Text>
          <Text style={styles.centerText}>
            Try searching for a different name or username
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.centerContainer}>
        <Search size={48} color="#C7C7CC" strokeWidth={1} />
        <Text style={styles.centerTitle}>Find Friends</Text>
        <Text style={styles.centerText}>
          Search by name or username to find friends on FrontSnap
        </Text>
        
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Tips:</Text>
          <Text style={styles.tipText}>• Search for full names or usernames</Text>
          <Text style={styles.tipText}>• Try different variations if you can't find someone</Text>
          <Text style={styles.tipText}>• Ask friends for their usernames</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <ArrowLeft size={24} color="#007AFF" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Friends</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#8E8E93" strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or username..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#8E8E93"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search for friends"
            accessibilityHint="Enter a name or username to find friends"
          />
        </View>
      </View>

      {/* Results */}
      <View style={styles.resultsContainer}>
        {searchResults.length > 0 ? (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <UserCard user={item} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.resultsList}
          />
        ) : (
          renderEmptyState()
        )}
      </View>

      <Toast
        visible={toast.visible}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        duration={toast.duration}
        onHide={hideToast}
      />
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
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C2C2E',
  },
  placeholder: {
    width: 32,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#2C2C2E',
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  resultsList: {
    paddingBottom: 20,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 0.5,
    borderColor: '#E5E5EA',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2E',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 4,
  },
  userBio: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 18,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF10',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#007AFF30',
  },
  followingButton: {
    backgroundColor: '#34C75910',
    borderColor: '#34C75930',
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    marginLeft: 4,
  },
  followingButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#34C759',
    marginLeft: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  centerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C2C2E',
    marginTop: 16,
    marginBottom: 8,
  },
  centerText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  tipsContainer: {
    marginTop: 32,
    alignSelf: 'stretch',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2E',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 6,
  },
});