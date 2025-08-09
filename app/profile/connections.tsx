import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  RefreshControl,
} from 'react-native';
import { 
  ArrowLeft, 
  Users, 
  UserPlus,
  UserMinus,
  Search
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { UserConnection, SocialProfile, supabase } from '@/lib/supabase';
import { useSocialConnections } from '@/hooks/useSocialConnections';
import { HapticFeedback } from '@/utils/haptics';
import { useToast } from '@/hooks/useToast';
import { Toast } from '@/components/Toast';

type TabType = 'following' | 'followers';

export default function ConnectionsScreen() {
  const router = useRouter();
  const { toast, showSuccess, showError, hideToast } = useToast();
  const { 
    connections,
    connectionsCount,
    unfollowUser,
    isLoading,
    refreshConnections
  } = useSocialConnections();
  
  const [activeTab, setActiveTab] = useState<TabType>('following');
  const [followingUsers, setFollowingUsers] = useState<SocialProfile[]>([]);
  const [followersUsers, setFollowersUsers] = useState<SocialProfile[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadConnections();
  }, [connections]);

  const loadConnections = async () => {
    try {
      // Load following users (people current user follows)
      if (connections.length > 0) {
        const followingIds = connections.map(conn => conn.connected_user_id);
        const { data: followingData } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, bio, allow_social_features')
          .in('id', followingIds)
          .eq('allow_social_features', true);
        
        setFollowingUsers(followingData || []);
      } else {
        setFollowingUsers([]);
      }

      // Load followers (people who follow current user)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: followersData } = await supabase
          .from('user_connections')
          .select(`
            user_id,
            profiles!user_connections_user_id_fkey (
              id,
              full_name,
              username,
              avatar_url,
              bio,
              allow_social_features
            )
          `)
          .eq('connected_user_id', user.id);

        const followers = followersData
          ?.map(item => item.profiles as any)
          .filter(profile => profile?.allow_social_features) || [];
        
        setFollowersUsers(followers);
      }
    } catch (error) {
      console.error('Error loading connections:', error);
    }
  };

  const handleBack = () => {
    HapticFeedback.light();
    router.back();
  };

  const handleTabChange = (tab: TabType) => {
    HapticFeedback.selection();
    setActiveTab(tab);
  };

  const handleUnfollow = async (userId: string, userName: string) => {
    HapticFeedback.medium();
    
    try {
      const success = await unfollowUser(userId);
      if (success) {
        showSuccess('Unfollowed', `You unfollowed ${userName}`);
        // Remove from local state immediately
        setFollowingUsers(prev => prev.filter(user => user.id !== userId));
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
      showError('Action Failed', 'Could not unfollow user');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    HapticFeedback.light();
    try {
      await refreshConnections();
      showSuccess('Refreshed', 'Connections updated');
    } catch (error) {
      showError('Refresh Failed', 'Could not refresh connections');
    } finally {
      setRefreshing(false);
    }
  };

  const UserConnectionCard = ({ user, type }: { user: SocialProfile; type: TabType }) => (
    <TouchableOpacity 
      style={styles.userCard}
      accessibilityLabel={`${user.full_name}, ${user.username ? `@${user.username}` : 'no username'}`}
      accessibilityRole="button"
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
      
      {type === 'following' && (
        <TouchableOpacity
          style={styles.unfollowButton}
          onPress={() => handleUnfollow(user.id, user.full_name)}
          accessibilityLabel="Unfollow"
          accessibilityRole="button"
          accessibilityHint="Double tap to unfollow this user"
        >
          <UserMinus size={16} color="#FF3B30" strokeWidth={2} />
          <Text style={styles.unfollowButtonText}>Unfollow</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  const renderEmptyState = () => {
    const isFollowing = activeTab === 'following';
    
    return (
      <View style={styles.emptyContainer}>
        <Users size={48} color="#C7C7CC" strokeWidth={1} />
        <Text style={styles.emptyTitle}>
          {isFollowing ? 'No Following' : 'No Followers'}
        </Text>
        <Text style={styles.emptyText}>
          {isFollowing 
            ? "You're not following anyone yet. Find friends to see their favorite places!"
            : "No one is following you yet. Share your username with friends to connect!"
          }
        </Text>
        
        {isFollowing && (
          <TouchableOpacity
            style={styles.findFriendsButton}
            onPress={() => router.push('/profile/find-friends')}
            accessibilityLabel="Find friends"
            accessibilityRole="button"
          >
            <Search size={16} color="#007AFF" strokeWidth={2} />
            <Text style={styles.findFriendsButtonText}>Find Friends</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const currentUsers = activeTab === 'following' ? followingUsers : followersUsers;
  const currentCount = activeTab === 'following' ? connectionsCount.following_count : connectionsCount.followers_count;

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
        <Text style={styles.headerTitle}>Connections</Text>
        <TouchableOpacity
          style={styles.findButton}
          onPress={() => router.push('/profile/find-friends')}
          accessibilityLabel="Find friends"
          accessibilityRole="button"
        >
          <Search size={20} color="#007AFF" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'following' && styles.activeTab
          ]}
          onPress={() => handleTabChange('following')}
          accessibilityLabel="Following tab"
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'following' }}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'following' && styles.activeTabText
          ]}>
            Following
          </Text>
          <Text style={[
            styles.tabCount,
            activeTab === 'following' && styles.activeTabCount
          ]}>
            {connectionsCount.following_count}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'followers' && styles.activeTab
          ]}
          onPress={() => handleTabChange('followers')}
          accessibilityLabel="Followers tab"
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'followers' }}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'followers' && styles.activeTabText
          ]}>
            Followers
          </Text>
          <Text style={[
            styles.tabCount,
            activeTab === 'followers' && styles.activeTabCount
          ]}>
            {connectionsCount.followers_count}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {currentUsers.length > 0 ? (
          <FlatList
            data={currentUsers}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <UserConnectionCard user={item} type={activeTab} />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.usersList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {renderEmptyState()}
          </ScrollView>
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
  findButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    margin: 20,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8E8E93',
    marginRight: 4,
  },
  activeTabText: {
    color: '#007AFF',
  },
  tabCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    backgroundColor: '#E5E5EA',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    textAlign: 'center',
  },
  activeTabCount: {
    color: '#FFFFFF',
    backgroundColor: '#007AFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  usersList: {
    paddingBottom: 20,
  },
  scrollContent: {
    flexGrow: 1,
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
  unfollowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B3010',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#FF3B3030',
  },
  unfollowButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF3B30',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C2C2E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  findFriendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF10',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#007AFF30',
  },
  findFriendsButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
    marginLeft: 8,
  },
});