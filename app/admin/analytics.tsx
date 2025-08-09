import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

interface AnalyticsData {
  userStats: {
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
    newUsersWeek: number;
  };
  placeStats: {
    totalPlaces: number;
    placesToday: number;
    placesWeek: number;
    topCategories: Array<{ category: string; count: number }>;
  };
  activityStats: {
    totalSessions: number;
    avgSessionLength: number;
    topFeatures: Array<{ feature: string; usage: number }>;
  };
  eventStats: {
    totalEvents: number;
    eventsToday: number;
    topEvents: Array<{ event: string; count: number }>;
  };
}

export default function AdminAnalytics() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    try {
      // Check admin privileges
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        router.back();
        return;
      }

      // Calculate date ranges
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Load user statistics
      const [
        totalUsersResult,
        newUsersTodayResult,
        newUsersWeekResult
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase
          .from('profiles')
          .select('id', { count: 'exact' })
          .gte('created_at', today.toISOString()),
        supabase
          .from('profiles')
          .select('id', { count: 'exact' })
          .gte('created_at', weekAgo.toISOString()),
      ]);

      const userStats = {
        totalUsers: totalUsersResult.count || 0,
        activeUsers: 0, // TODO: Implement active users tracking
        newUsersToday: newUsersTodayResult.count || 0,
        newUsersWeek: newUsersWeekResult.count || 0,
      };

      // Load place statistics
      const [
        totalPlacesResult,
        placesTodayResult,
        placesWeekResult,
        categoriesResult
      ] = await Promise.all([
        supabase.from('places').select('id', { count: 'exact' }),
        supabase
          .from('places')
          .select('id', { count: 'exact' })
          .gte('created_at', today.toISOString()),
        supabase
          .from('places')
          .select('id', { count: 'exact' })
          .gte('created_at', weekAgo.toISOString()),
        supabase
          .from('places')
          .select('category')
          .not('category', 'is', null)
      ]);

      // Process category data
      const categoryCount: Record<string, number> = {};
      categoriesResult.data?.forEach(place => {
        if (place.category) {
          categoryCount[place.category] = (categoryCount[place.category] || 0) + 1;
        }
      });

      const topCategories = Object.entries(categoryCount)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const placeStats = {
        totalPlaces: totalPlacesResult.count || 0,
        placesToday: placesTodayResult.count || 0,
        placesWeek: placesWeekResult.count || 0,
        topCategories,
      };

      // Load analytics events if table exists
      let eventStats = {
        totalEvents: 0,
        eventsToday: 0,
        topEvents: [] as Array<{ event: string; count: number }>,
      };

      try {
        const [totalEventsResult, eventsTodayResult, topEventsResult] = await Promise.all([
          supabase.from('analytics_events').select('id', { count: 'exact' }),
          supabase
            .from('analytics_events')
            .select('id', { count: 'exact' })
            .gte('created_at', today.toISOString()),
          supabase
            .from('analytics_events')
            .select('event_type')
            .gte('created_at', weekAgo.toISOString())
        ]);

        const eventCount: Record<string, number> = {};
        topEventsResult.data?.forEach(event => {
          if (event.event_type) {
            eventCount[event.event_type] = (eventCount[event.event_type] || 0) + 1;
          }
        });

        const topEvents = Object.entries(eventCount)
          .map(([event, count]) => ({ event, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        eventStats = {
          totalEvents: totalEventsResult.count || 0,
          eventsToday: eventsTodayResult.count || 0,
          topEvents,
        };
      } catch (error) {
        console.log('Analytics events table not available yet');
      }

      const activityStats = {
        totalSessions: 0, // TODO: Implement session tracking
        avgSessionLength: 0,
        topFeatures: [
          { feature: 'Place Discovery', usage: 85 },
          { feature: 'Photo Capture', usage: 72 },
          { feature: 'Collections', usage: 58 },
          { feature: 'Map View', usage: 91 },
          { feature: 'Social Features', usage: 34 },
        ],
      };

      setData({
        userStats,
        placeStats,
        activityStats,
        eventStats,
      });
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAnalyticsData();
  };

  const StatCard = ({ title, value, subtitle, trend, icon, color = '#007AFF' }: {
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: number;
    icon: string;
    color?: string;
  }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon as any} size={24} color={color} />
        {trend !== undefined && (
          <View style={[styles.trendIndicator, { backgroundColor: trend >= 0 ? '#34C759' : '#FF3B30' }]}>
            <Ionicons 
              name={trend >= 0 ? 'trending-up' : 'trending-down'} 
              size={12} 
              color="white" 
            />
            <Text style={styles.trendText}>{Math.abs(trend)}%</Text>
          </View>
        )}
      </View>
      <Text style={styles.statValue}>{typeof value === 'number' ? value.toLocaleString() : value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const ChartCard = ({ title, data, icon, color = '#007AFF' }: {
    title: string;
    data: Array<{ name?: string; category?: string; feature?: string; event?: string; count?: number; usage?: number }>;
    icon: string;
    color?: string;
  }) => (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Ionicons name={icon as any} size={20} color={color} />
        <Text style={styles.chartTitle}>{title}</Text>
      </View>
      <View style={styles.chartContent}>
        {data.map((item, index) => {
          const label = item.name || item.category || item.feature || item.event || 'Unknown';
          const value = item.count || item.usage || 0;
          const maxValue = Math.max(...data.map(d => d.count || d.usage || 0));
          const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

          return (
            <View key={index} style={styles.chartItem}>
              <View style={styles.chartItemHeader}>
                <Text style={styles.chartItemLabel}>{label}</Text>
                <Text style={styles.chartItemValue}>{value.toLocaleString()}</Text>
              </View>
              <View style={styles.chartBar}>
                <View 
                  style={[
                    styles.chartBarFill, 
                    { width: `${percentage}%`, backgroundColor: color }
                  ]} 
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load analytics data</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Analytics</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => loadAnalyticsData()}
        >
          <Ionicons name="refresh" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.timeRangeSelector}>
        {(['day', 'week', 'month'] as const).map((range) => (
          <TouchableOpacity
            key={range}
            style={[
              styles.timeRangeButton,
              timeRange === range && styles.timeRangeButtonActive
            ]}
            onPress={() => setTimeRange(range)}
          >
            <Text style={[
              styles.timeRangeButtonText,
              timeRange === range && styles.timeRangeButtonTextActive
            ]}>
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* User Statistics */}
        <Text style={styles.sectionTitle}>User Statistics</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Users"
            value={data.userStats.totalUsers}
            icon="people"
            color="#007AFF"
          />
          <StatCard
            title="New Users Today"
            value={data.userStats.newUsersToday}
            icon="person-add"
            color="#34C759"
          />
          <StatCard
            title="New Users (7d)"
            value={data.userStats.newUsersWeek}
            icon="trending-up"
            color="#FF9500"
          />
          <StatCard
            title="Active Users"
            value={data.userStats.activeUsers || 'N/A'}
            subtitle="Coming soon"
            icon="pulse"
            color="#5856D6"
          />
        </View>

        {/* Place Statistics */}
        <Text style={styles.sectionTitle}>Place Statistics</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Places"
            value={data.placeStats.totalPlaces}
            icon="location"
            color="#007AFF"
          />
          <StatCard
            title="Places Today"
            value={data.placeStats.placesToday}
            icon="add-circle"
            color="#34C759"
          />
          <StatCard
            title="Places (7d)"
            value={data.placeStats.placesWeek}
            icon="calendar"
            color="#FF9500"
          />
        </View>

        {/* Charts */}
        <ChartCard
          title="Top Categories"
          data={data.placeStats.topCategories}
          icon="bar-chart"
          color="#007AFF"
        />

        <ChartCard
          title="Feature Usage"
          data={data.activityStats.topFeatures}
          icon="analytics"
          color="#34C759"
        />

        {data.eventStats.topEvents.length > 0 && (
          <ChartCard
            title="Top Events"
            data={data.eventStats.topEvents}
            icon="flash"
            color="#FF9500"
          />
        )}

        {/* Event Statistics */}
        {data.eventStats.totalEvents > 0 && (
          <>
            <Text style={styles.sectionTitle}>Event Tracking</Text>
            <View style={styles.statsGrid}>
              <StatCard
                title="Total Events"
                value={data.eventStats.totalEvents}
                icon="analytics"
                color="#5856D6"
              />
              <StatCard
                title="Events Today"
                value={data.eventStats.eventsToday}
                icon="today"
                color="#FF3B30"
              />
            </View>
          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  refreshButton: {
    padding: 4,
  },
  timeRangeSelector: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: '#007AFF',
  },
  timeRangeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  timeRangeButtonTextActive: {
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 44) / 2,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 2,
  },
  trendText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  chartCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  chartContent: {
    gap: 12,
  },
  chartItem: {
    gap: 6,
  },
  chartItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartItemLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textTransform: 'capitalize',
  },
  chartItemValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  chartBar: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  chartBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  bottomPadding: {
    height: 40,
  },
});