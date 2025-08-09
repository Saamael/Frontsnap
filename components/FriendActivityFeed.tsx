import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { 
  MapPin, 
  Heart, 
  Plus, 
  Star,
  Trophy,
  Users
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { FriendActivity } from '@/lib/supabase';
import { useFriendActivity } from '@/hooks/useFriendActivity';
import { HapticFeedback } from '@/utils/haptics';

interface FriendActivityFeedProps {
  limit?: number;
  showHeader?: boolean;
  style?: any;
}

export const FriendActivityFeed: React.FC<FriendActivityFeedProps> = ({ 
  limit = 20, 
  showHeader = true,
  style 
}) => {
  const router = useRouter();
  const { activities, isLoading, refreshActivities, loadMore, hasMore } = useFriendActivity(limit);

  const getActivityIcon = (activityType: FriendActivity['activity_type']) => {
    switch (activityType) {
      case 'place_added':
        return <Plus size={16} color="#34C759" strokeWidth={2} />;
      case 'place_saved':
        return <Heart size={16} color="#FF3B30" strokeWidth={2} />;
      case 'collection_created':
        return <Plus size={16} color="#007AFF" strokeWidth={2} />;
      case 'review_added':
        return <Star size={16} color="#FFD700" strokeWidth={2} />;
      case 'hidden_gem_found':
        return <Trophy size={16} color="#FF9500" strokeWidth={2} />;
      default:
        return <MapPin size={16} color="#8E8E93" strokeWidth={2} />;
    }
  };

  const getActivityText = (activity: FriendActivity) => {
    const userName = activity.user_full_name;
    
    switch (activity.activity_type) {
      case 'place_added':
        return `${userName} discovered ${activity.place_name}`;
      case 'place_saved':
        return `${userName} saved ${activity.place_name}`;
      case 'collection_created':
        return `${userName} created collection "${activity.collection_name}"`;
      case 'review_added':
        return `${userName} reviewed ${activity.place_name}`;
      case 'hidden_gem_found':
        return `${userName} found a hidden gem!`;
      default:
        return `${userName} had an activity`;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleActivityPress = (activity: FriendActivity) => {
    HapticFeedback.light();
    
    if (activity.place_id) {
      router.push(`/place/${activity.place_id}`);
    }
  };

  const ActivityCard = ({ activity }: { activity: FriendActivity }) => (
    <TouchableOpacity 
      style={styles.activityCard}
      onPress={() => handleActivityPress(activity)}
      accessibilityLabel={getActivityText(activity)}
      accessibilityRole="button"
      accessibilityHint="Double tap to view details"
    >
      <View style={styles.activityHeader}>
        <View style={styles.userInfo}>
          <Image 
            source={{ 
              uri: activity.user_avatar_url || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=200' 
            }} 
            style={styles.userAvatar}
            accessibilityIgnoresInvertColors={true}
          />
          <View style={styles.activityDetails}>
            <View style={styles.activityTextContainer}>
              {getActivityIcon(activity.activity_type)}
              <Text style={styles.activityText} numberOfLines={2}>
                {getActivityText(activity)}
              </Text>
            </View>
            <Text style={styles.activityTime}>
              {formatTimeAgo(activity.created_at)}
            </Text>
          </View>
        </View>
      </View>
      
      {activity.place_image_url && (
        <Image 
          source={{ uri: activity.place_image_url }} 
          style={styles.placeImage}
          accessibilityLabel={`Photo of ${activity.place_name}`}
          accessibilityIgnoresInvertColors={true}
        />
      )}
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Users size={48} color="#C7C7CC" strokeWidth={1} />
      <Text style={styles.emptyTitle}>No Friend Activity</Text>
      <Text style={styles.emptyText}>
        Follow friends to see their latest discoveries and favorite places here
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!hasMore) return null;
    
    return (
      <TouchableOpacity 
        style={styles.loadMoreButton}
        onPress={loadMore}
        accessibilityLabel="Load more activities"
        accessibilityRole="button"
      >
        <Text style={styles.loadMoreText}>Load More</Text>
      </TouchableOpacity>
    );
  };

  if (isLoading && activities.length === 0) {
    return (
      <View style={[styles.container, style]}>
        {showHeader && (
          <Text style={styles.sectionTitle}>Friend Activity</Text>
        )}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading friend activity...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {showHeader && (
        <Text style={styles.sectionTitle}>Friend Activity</Text>
      )}
      
      {activities.length > 0 ? (
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ActivityCard activity={item} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.activityList}
          refreshControl={
            <RefreshControl 
              refreshing={isLoading} 
              onRefresh={refreshActivities}
            />
          }
          ListFooterComponent={renderFooter}
        />
      ) : (
        renderEmptyState()
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C2C2E',
    marginBottom: 16,
    paddingHorizontal: 20,
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
  activityList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  activityCard: {
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
  activityHeader: {
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  activityDetails: {
    flex: 1,
  },
  activityTextContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  activityText: {
    fontSize: 15,
    color: '#2C2C2E',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  activityTime: {
    fontSize: 13,
    color: '#8E8E93',
  },
  placeImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
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
  },
  loadMoreButton: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loadMoreText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
});