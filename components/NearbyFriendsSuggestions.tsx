import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { 
  MapPin, 
  Users, 
  Navigation,
  UserPlus,
  Heart
} from 'lucide-react-native';
import { 
  NearbyUser, 
  findNearbyUsers, 
  findUsersInCity,
  getLocationPrivacySettings
} from '@/lib/supabase';
import { useSocialConnections } from '@/hooks/useSocialConnections';
import { UserAvatar } from '@/components/UserAvatar';
import { HapticFeedback } from '@/utils/haptics';
import { useToast } from '@/hooks/useToast';

type SuggestionMode = 'nearby' | 'city';

interface NearbyFriendsSuggestionsProps {
  onUserSelect?: (user: NearbyUser) => void;
}

export const NearbyFriendsSuggestions: React.FC<NearbyFriendsSuggestionsProps> = ({
  onUserSelect
}) => {
  const { showSuccess, showError } = useToast();
  const { followUser, isFollowing } = useSocialConnections();
  
  const [mode, setMode] = useState<SuggestionMode>('city');
  const [users, setUsers] = useState<NearbyUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canShowNearby, setCanShowNearby] = useState(false);

  useEffect(() => {
    checkLocationPermissions();
    loadSuggestions();
  }, [mode]);

  const checkLocationPermissions = async () => {
    try {
      const settings = await getLocationPrivacySettings();
      setCanShowNearby(settings?.allow_nearby_suggestions ?? false);
    } catch (error) {
      console.error('Error checking location permissions:', error);
    }
  };

  const loadSuggestions = async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      let suggestions: NearbyUser[] = [];

      if (mode === 'nearby' && canShowNearby) {
        suggestions = await findNearbyUsers(50, 20);
      } else if (mode === 'city') {
        suggestions = await findUsersInCity(20);
      }

      setUsers(suggestions);
    } catch (error) {
      console.error('Error loading suggestions:', error);
      showError('Load Failed', 'Could not load friend suggestions');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleFollowUser = async (user: NearbyUser) => {
    HapticFeedback.light();

    try {
      const success = await followUser(user.id);
      if (success) {
        showSuccess('Following!', `You're now following ${user.full_name}`);
        // Remove user from suggestions since they're now following
        setUsers(prev => prev.filter(u => u.id !== user.id));
      }
    } catch (error) {
      showError('Follow Failed', 'Could not follow user');
    }
  };

  const handleRefresh = () => {
    loadSuggestions(true);
  };

  const formatDistance = (distanceKm: number): string => {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m away`;
    } else if (distanceKm < 10) {
      return `${distanceKm.toFixed(1)}km away`;
    } else {
      return `${Math.round(distanceKm)}km away`;
    }
  };

  const formatMutualFriends = (count: number): string => {
    if (count === 0) return 'No mutual friends';
    return `${count} mutual friend${count > 1 ? 's' : ''}`;
  };

  const renderUserItem = ({ item: user }: { item: NearbyUser }) => (
    <TouchableOpacity 
      style={styles.userItem}
      onPress={() => onUserSelect?.(user)}
    >
      <UserAvatar 
        imageUrl={user.avatar_url}
        name={user.full_name}
        size="large"
      />
      
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user.full_name}</Text>
        {user.username && (
          <Text style={styles.userUsername}>@{user.username}</Text>
        )}
        
        <View style={styles.userStats}>
          {mode === 'nearby' && user.distance_km !== undefined ? (
            <View style={styles.statItem}>
              <Navigation size={12} color="#007AFF" strokeWidth={2} />
              <Text style={styles.statText}>{formatDistance(user.distance_km)}</Text>
            </View>
          ) : (
            user.current_city && (
              <View style={styles.statItem}>
                <MapPin size={12} color="#007AFF" strokeWidth={2} />
                <Text style={styles.statText}>{user.current_city}</Text>
              </View>
            )
          )}
          
          {user.mutual_friends_count > 0 && (
            <View style={styles.statItem}>
              <Heart size={12} color="#FF3B30" strokeWidth={2} />
              <Text style={styles.statText}>{formatMutualFriends(user.mutual_friends_count)}</Text>
            </View>
          )}
        </View>

        {user.bio && (
          <Text style={styles.userBio} numberOfLines={2}>{user.bio}</Text>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.followButton,
          isFollowing(user.id) && styles.followingButton
        ]}
        onPress={() => handleFollowUser(user)}
        disabled={isFollowing(user.id)}
      >
        <UserPlus 
          size={16} 
          color={isFollowing(user.id) ? '#34C759' : '#007AFF'} 
          strokeWidth={2} 
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Users size={48} color="#C7C7CC" strokeWidth={1} />
      <Text style={styles.emptyTitle}>
        {mode === 'nearby' ? 'No Nearby Users' : 'No Users in Your City'}
      </Text>
      <Text style={styles.emptyText}>
        {mode === 'nearby' 
          ? 'No users found within 50km of your location'
          : 'No other FrontSnap users found in your city'
        }
      </Text>
    </View>
  );

  if (isLoading && users.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Finding suggestions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <MapPin size={24} color="#007AFF" strokeWidth={2} />
        <Text style={styles.headerTitle}>Friend Suggestions</Text>
      </View>

      {/* Mode Toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'city' && styles.activeModeButton]}
          onPress={() => setMode('city')}
        >
          <MapPin size={16} color={mode === 'city' ? '#007AFF' : '#8E8E93'} strokeWidth={2} />
          <Text style={[styles.modeButtonText, mode === 'city' && styles.activeModeButtonText]}>
            Same City
          </Text>
        </TouchableOpacity>

        {canShowNearby && (
          <TouchableOpacity
            style={[styles.modeButton, mode === 'nearby' && styles.activeModeButton]}
            onPress={() => setMode('nearby')}
          >
            <Navigation size={16} color={mode === 'nearby' ? '#007AFF' : '#8E8E93'} strokeWidth={2} />
            <Text style={[styles.modeButtonText, mode === 'nearby' && styles.activeModeButtonText]}>
              Nearby
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* User List */}
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderUserItem}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={users.length === 0 ? styles.emptyContainer : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C2C2E',
    marginLeft: 12,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  activeModeButton: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginLeft: 6,
  },
  activeModeButtonText: {
    color: '#007AFF',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2E',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 6,
  },
  userStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
  },
  userBio: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 18,
  },
  followButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF10',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF30',
  },
  followingButton: {
    backgroundColor: '#34C75910',
    borderColor: '#34C75930',
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
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
    lineHeight: 20,
  },
});