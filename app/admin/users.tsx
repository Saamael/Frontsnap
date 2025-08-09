import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface UserStats {
  placesCount: number;
  collectionsCount: number;
  connectionsCount: number;
  lastActive: string;
}

export default function AdminUsers() {
  const router = useRouter();
  const [users, setUsers] = useState<Profile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  const loadUsers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        router.replace('/auth/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        Alert.alert('Access Denied', 'Admin privileges required');
        router.back();
        return;
      }

      const { data: usersData, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUsers(usersData || []);
      setFilteredUsers(usersData || []);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadUserStats = async (userId: string) => {
    try {
      const [placesResult, collectionsResult, connectionsResult] = await Promise.all([
        supabase.from('places').select('id', { count: 'exact' }).eq('added_by', userId),
        supabase.from('collections').select('id', { count: 'exact' }).eq('user_id', userId),
        supabase.from('user_connections').select('id', { count: 'exact' }).eq('user_id', userId),
      ]);

      setUserStats({
        placesCount: placesResult.count || 0,
        collectionsCount: collectionsResult.count || 0,
        connectionsCount: connectionsResult.count || 0,
        lastActive: 'Unknown', // TODO: Implement last active tracking
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user =>
        (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.email?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.username?.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const handleUserPress = (user: Profile) => {
    setSelectedUser(user);
    loadUserStats(user.id);
    setShowUserModal(true);
  };

  const handleToggleAdmin = async (user: Profile) => {
    try {
      const newRole = user.role === 'admin' ? 'user' : 'admin';
      
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', user.id);

      if (error) throw error;

      Alert.alert(
        'Success',
        `User ${newRole === 'admin' ? 'granted' : 'revoked'} admin privileges`
      );

      loadUsers(); // Refresh the list
      if (selectedUser && selectedUser.id === user.id) {
        setSelectedUser({ ...selectedUser, role: newRole });
      }
    } catch (error) {
      console.error('Error updating admin status:', error);
      Alert.alert('Error', 'Failed to update admin status');
    }
  };

  const handleToggleSocialFeatures = async (user: Profile) => {
    try {
      const newStatus = !user.allow_social_features;
      
      const { error } = await supabase
        .from('profiles')
        .update({ allow_social_features: newStatus })
        .eq('id', user.id);

      if (error) throw error;

      Alert.alert(
        'Success',
        `Social features ${newStatus ? 'enabled' : 'disabled'} for user`
      );

      loadUsers();
      if (selectedUser && selectedUser.id === user.id) {
        setSelectedUser({ ...selectedUser, allow_social_features: newStatus });
      }
    } catch (error) {
      console.error('Error updating social features:', error);
      Alert.alert('Error', 'Failed to update social features');
    }
  };

  const UserModal = () => (
    <Modal
      visible={showUserModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>User Details</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowUserModal(false)}
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {selectedUser && (
          <ScrollView style={styles.modalContent}>
            <View style={styles.userSection}>
              <Text style={styles.sectionTitle}>Profile Information</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Full Name:</Text>
                <Text style={styles.infoValue}>{selectedUser.full_name || 'Not set'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>{selectedUser.email || 'Not set'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Username:</Text>
                <Text style={styles.infoValue}>{selectedUser.username || 'Not set'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Created:</Text>
                <Text style={styles.infoValue}>
                  {new Date(selectedUser.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>

            {userStats && (
              <View style={styles.userSection}>
                <Text style={styles.sectionTitle}>Statistics</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{userStats.placesCount}</Text>
                    <Text style={styles.statLabel}>Places Added</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{userStats.collectionsCount}</Text>
                    <Text style={styles.statLabel}>Collections</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{userStats.connectionsCount}</Text>
                    <Text style={styles.statLabel}>Connections</Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.userSection}>
              <Text style={styles.sectionTitle}>Permissions & Status</Text>
              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>Admin Privileges</Text>
                  <Text style={styles.toggleDescription}>
                    Can access admin dashboard and manage users
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    selectedUser.role === 'admin' && styles.toggleButtonActive
                  ]}
                  onPress={() => handleToggleAdmin(selectedUser)}
                >
                  <Text style={[
                    styles.toggleButtonText,
                    selectedUser.role === 'admin' && styles.toggleButtonTextActive
                  ]}>
                    {selectedUser.role === 'admin' ? 'Admin' : 'User'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>Social Features</Text>
                  <Text style={styles.toggleDescription}>
                    Can use social features like friends and sharing
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    selectedUser.allow_social_features && styles.toggleButtonActive
                  ]}
                  onPress={() => handleToggleSocialFeatures(selectedUser)}
                >
                  <Text style={[
                    styles.toggleButtonText,
                    selectedUser.allow_social_features && styles.toggleButtonTextActive
                  ]}>
                    {selectedUser.allow_social_features ? 'Enabled' : 'Disabled'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading users...</Text>
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
        <Text style={styles.title}>User Management</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.resultsText}>
          {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
        </Text>

        {filteredUsers.map((user) => (
          <TouchableOpacity
            key={user.id}
            style={styles.userCard}
            onPress={() => handleUserPress(user)}
          >
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.full_name || 'Unknown User'}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
              {user.username && (
                <Text style={styles.userUsername}>@{user.username}</Text>
              )}
            </View>
            <View style={styles.userBadges}>
              {user.is_admin && (
                <View style={[styles.badge, styles.adminBadge]}>
                  <Text style={styles.badgeText}>Admin</Text>
                </View>
              )}
              {user.allow_social_features && (
                <View style={[styles.badge, styles.socialBadge]}>
                  <Text style={styles.badgeText}>Social</Text>
                </View>
              )}
              <Text style={styles.userDate}>
                {new Date(user.created_at).toLocaleDateString()}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <UserModal />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  userCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  userUsername: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 2,
  },
  userBadges: {
    alignItems: 'flex-end',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  adminBadge: {
    backgroundColor: '#FF3B30',
  },
  socialBadge: {
    backgroundColor: '#34C759',
  },
  badgeText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  userDate: {
    fontSize: 12,
    color: '#999',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  userSection: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  toggleDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    maxWidth: '70%',
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    minWidth: 80,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#007AFF',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  toggleButtonTextActive: {
    color: 'white',
  },
});