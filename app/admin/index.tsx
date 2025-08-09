import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/database';

type Place = Database['public']['Tables']['places']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface AdminStats {
  totalUsers: number;
  totalPlaces: number;
  recentRegistrations: number;
  flaggedContent: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalPlaces: 0,
    recentRegistrations: 0,
    flaggedContent: 0,
  });
  const [recentPlaces, setRecentPlaces] = useState<Place[]>([]);
  const [recentUsers, setRecentUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'You must be logged in to access admin dashboard');
        router.replace('/auth/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        Alert.alert('Access Denied', 'You do not have admin privileges');
        router.back();
        return;
      }

      const [usersResult, placesResult, recentUsersResult, recentPlacesResult] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('places').select('id', { count: 'exact' }),
        supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('places')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { count: recentRegistrations } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .gte('created_at', oneWeekAgo.toISOString());

      setStats({
        totalUsers: usersResult.count || 0,
        totalPlaces: placesResult.count || 0,
        recentRegistrations: recentRegistrations || 0,
        flaggedContent: 0, // TODO: Implement flagged content counting
      });

      setRecentUsers(recentUsersResult.data || []);
      setRecentPlaces(recentPlacesResult.data || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const StatCard = ({ title, value, icon, color = '#007AFF' }: {
    title: string;
    value: number;
    icon: string;
    color?: string;
  }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon as any} size={24} color={color} />
        <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      </View>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  const QuickAction = ({ title, icon, onPress, color = '#007AFF' }: {
    title: string;
    icon: string;
    onPress: () => void;
    color?: string;
  }) => (
    <TouchableOpacity
      style={[styles.actionButton, { backgroundColor: color }]}
      onPress={onPress}
    >
      <Ionicons name={icon as any} size={20} color="white" />
      <Text style={styles.actionButtonText}>{title}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>FrontSnap Administration</Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon="people"
          color="#007AFF"
        />
        <StatCard
          title="Total Places"
          value={stats.totalPlaces}
          icon="location"
          color="#34C759"
        />
        <StatCard
          title="New Users (7d)"
          value={stats.recentRegistrations}
          icon="person-add"
          color="#FF9500"
        />
        <StatCard
          title="Flagged Content"
          value={stats.flaggedContent}
          icon="flag"
          color="#FF3B30"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <QuickAction
            title="Users"
            icon="people"
            onPress={() => router.push('/admin/users')}
            color="#007AFF"
          />
          <QuickAction
            title="Places"
            icon="location"
            onPress={() => router.push('/admin/places')}
            color="#34C759"
          />
          <QuickAction
            title="Reports"
            icon="flag"
            onPress={() => router.push('/admin/reports')}
            color="#FF3B30"
          />
          <QuickAction
            title="Analytics"
            icon="stats-chart"
            onPress={() => router.push('/admin/analytics')}
            color="#5856D6"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Users</Text>
        {recentUsers.map((user) => (
          <View key={user.id} style={styles.listItem}>
            <View style={styles.userInfo}>
              <Text style={styles.itemTitle}>{user.full_name || 'Unknown User'}</Text>
              <Text style={styles.itemSubtitle}>{user.email}</Text>
            </View>
            <Text style={styles.itemDate}>
              {new Date(user.created_at).toLocaleDateString()}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Places</Text>
        {recentPlaces.map((place) => (
          <TouchableOpacity
            key={place.id}
            style={styles.listItem}
            onPress={() => router.push(`/place/${place.id}`)}
          >
            <View style={styles.placeInfo}>
              <Text style={styles.itemTitle}>{place.name}</Text>
              <Text style={styles.itemSubtitle}>{place.address}</Text>
            </View>
            <View style={styles.placeStats}>
              <Text style={styles.itemDate}>
                {new Date(place.created_at).toLocaleDateString()}
              </Text>
              {place.rating && (
                <Text style={styles.rating}>★ {place.rating.toFixed(1)}</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
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
  header: {
    backgroundColor: 'white',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
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
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userInfo: {
    flex: 1,
  },
  placeInfo: {
    flex: 1,
  },
  placeStats: {
    alignItems: 'flex-end',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  itemDate: {
    fontSize: 12,
    color: '#999',
  },
  rating: {
    fontSize: 12,
    color: '#FF9500',
    marginTop: 2,
  },
});