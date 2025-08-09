import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  TrendingUp, 
  Users, 
  MapPin,
  Heart,
  Star,
  Calendar,
  Eye
} from 'lucide-react-native';
import { useFriendActivity } from '@/hooks/useFriendActivity';
import { useSocialConnections } from '@/hooks/useSocialConnections';
import { UserAvatar } from '@/components/UserAvatar';
import { HapticFeedback } from '@/utils/haptics';

interface ActivityStats {
  total_activities: number;
  places_added: number;
  reviews_given: number;
  collections_created: number;
  period: 'week' | 'month';
}

export default function ActivityDashboardScreen() {
  const router = useRouter();
  const { activities, isLoading, refreshActivities } = useFriendActivity();
  const { connectionsCount } = useSocialConnections();
  
  const [stats, setStats] = useState<ActivityStats>({
    total_activities: 0,
    places_added: 0,
    reviews_given: 0,
    collections_created: 0,
    period: 'week'
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    calculateStats();
  }, [activities]);

  const calculateStats = () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const recentActivities = activities.filter(activity => 
      new Date(activity.created_at) >= weekAgo
    );

    const newStats: ActivityStats = {
      total_activities: recentActivities.length,
      places_added: recentActivities.filter(a => a.activity_type === 'place_added').length,
      reviews_given: recentActivities.filter(a => a.activity_type === 'review_added').length,
      collections_created: recentActivities.filter(a => a.activity_type === 'collection_created').length,
      period: 'week'
    };

    setStats(newStats);
  };

  const handleBack = () => {
    HapticFeedback.light();
    router.back();
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshActivities();
    setIsRefreshing(false);
  };

  const formatActivityType = (type: string): string => {
    switch (type) {
      case 'place_added': return 'Added a place';
      case 'place_saved': return 'Saved a place';
      case 'collection_created': return 'Created collection';
      case 'review_added': return 'Left a review';
      case 'hidden_gem_found': return 'Found hidden gem';
      default: return 'Activity';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'place_added': return <MapPin size={16} color="#34C759" strokeWidth={2} />;
      case 'place_saved': return <Heart size={16} color="#FF3B30" strokeWidth={2} />;
      case 'collection_created': return <Star size={16} color="#FF9500" strokeWidth={2} />;
      case 'review_added': return <Eye size={16} color="#007AFF" strokeWidth={2} />;
      case 'hidden_gem_found': return <TrendingUp size={16} color="#AF52DE" strokeWidth={2} />;
      default: return <MapPin size={16} color="#8E8E93" strokeWidth={2} />;
    }
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
    
    return date.toLocaleDateString();
  };

  const StatCard = ({ icon, title, value, subtitle }: {
    icon: React.ReactNode;
    title: string;
    value: number;
    subtitle: string;
  }) => (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>{icon}</View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
    </View>
  );

  const ActivityItem = ({ activity }: { activity: any }) => (
    <View style={styles.activityItem}>
      <UserAvatar 
        imageUrl={activity.user_avatar_url}
        name={activity.user_full_name}
        size="medium"
      />
      
      <View style={styles.activityContent}>
        <View style={styles.activityHeader}>
          <Text style={styles.activityUser}>{activity.user_full_name}</Text>
          <View style={styles.activityTypeContainer}>
            {getActivityIcon(activity.activity_type)}
            <Text style={styles.activityTime}>
              {formatRelativeTime(activity.created_at)}
            </Text>
          </View>
        </View>
        
        <Text style={styles.activityDescription}>
          {formatActivityType(activity.activity_type)}
          {activity.place_name && (
            <Text style={styles.activityPlace}> • {activity.place_name}</Text>
          )}
        </Text>
        
        {activity.metadata?.description && (
          <Text style={styles.activityMeta} numberOfLines={2}>
            {activity.metadata.description}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Activity Dashboard',
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <ArrowLeft size={24} color="#007AFF" strokeWidth={2} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header Stats */}
        <View style={styles.header}>
          <TrendingUp size={24} color="#007AFF" strokeWidth={2} />
          <Text style={styles.headerTitle}>Activity Overview</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon={<Users size={20} color="#007AFF" strokeWidth={2} />}
            title="Following"
            value={connectionsCount.following_count}
            subtitle="Friends"
          />
          <StatCard
            icon={<Heart size={20} color="#FF3B30" strokeWidth={2} />}
            title="Followers"
            value={connectionsCount.followers_count}
            subtitle="People"
          />
          <StatCard
            icon={<MapPin size={20} color="#34C759" strokeWidth={2} />}
            title="Places Added"
            value={stats.places_added}
            subtitle="This week"
          />
          <StatCard
            icon={<Star size={20} color="#FF9500" strokeWidth={2} />}
            title="Collections"
            value={stats.collections_created}
            subtitle="This week"
          />
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={20} color="#8E8E93" strokeWidth={2} />
            <Text style={styles.sectionTitle}>Recent Friend Activity</Text>
          </View>

          {isLoading && activities.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading activity...</Text>
            </View>
          ) : activities.length > 0 ? (
            <View style={styles.activitiesList}>
              {activities.slice(0, 10).map((activity, index) => (
                <ActivityItem key={`${activity.id}-${index}`} activity={activity} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Users size={48} color="#C7C7CC" strokeWidth={1} />
              <Text style={styles.emptyTitle}>No Recent Activity</Text>
              <Text style={styles.emptyText}>
                Follow friends to see their activity here
              </Text>
            </View>
          )}
        </View>

        {/* Activity Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Week Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Activities</Text>
              <Text style={styles.summaryValue}>{stats.total_activities}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Most Active Day</Text>
              <Text style={styles.summaryValue}>
                {activities.length > 0 ? 'Today' : 'No activity'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Reviews Given</Text>
              <Text style={styles.summaryValue}>{stats.reviews_given}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C2C2E',
    marginLeft: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 32,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C2C2E',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2C2C2E',
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C2C2E',
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  activitiesList: {
    gap: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  activityUser: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C2C2E',
  },
  activityTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityTime: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
  },
  activityDescription: {
    fontSize: 14,
    color: '#2C2C2E',
    marginBottom: 4,
  },
  activityPlace: {
    color: '#007AFF',
  },
  activityMeta: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 16,
  },
  emptyState: {
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
  summaryCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C2C2E',
  },
});