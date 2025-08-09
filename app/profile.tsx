import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  User, 
  Users,
  Settings, 
  Camera, 
  Heart, 
  MapPin, 
  Star, 
  ChevronRight, 
  LogOut, 
  Shield, 
  Bell, 
  CircleHelp as HelpCircle, 
  Info,
  Trophy,
  Award
} from 'lucide-react-native';
import { 
  getCurrentUser, 
  getProfile, 
  signOut, 
  getUserPlacesCount, 
  getUserCollectionsCount, 
  getUserReviewsCount,
  Profile 
} from '@/lib/supabase';
import { useSocialConnections } from '@/hooks/useSocialConnections';
import { HapticFeedback } from '@/utils/haptics';
import { useToast } from '@/hooks/useToast';
import { Toast } from '@/components/Toast';
import { Loading } from '@/components/Loading';
import { SimpleAvatar } from '@/components/SimpleAvatar';
import { Colors, Typography, Spacing } from '@/constants/theme';

interface UserStats {
  placesScanned: number;
  collectionsSaved: number;
  reviewsGenerated: number;
}

interface UserAchievements {
  level: string;
  points: number;
  nextLevel: string;
  pointsToNext: number;
}

const menuSections = [
  {
    title: 'Account',
    items: [
      { id: 'profile', title: 'Edit Profile', icon: User, color: '#007AFF' },
      { id: 'privacy', title: 'Privacy & Security', icon: Shield, color: '#34C759' },
      { id: 'notifications', title: 'Notifications', icon: Bell, color: '#FF9500' },
    ],
  },
  {
    title: 'Social Features',
    items: [
      { id: 'activity-dashboard', title: 'Activity Dashboard', icon: Users, color: '#007AFF' },
      { id: 'nearby-friends', title: 'Nearby Friends', icon: MapPin, color: '#34C759' },
      { id: 'location-settings', title: 'Location Settings', icon: Shield, color: '#FF9500' },
    ],
  },
  {
    title: 'Achievements',
    items: [
      { id: 'achievements', title: 'Achievements', icon: Trophy, color: '#FFD700' },
    ],
  },
  {
    title: 'Admin',
    items: [
      { id: 'admin-dashboard', title: 'Admin Dashboard', icon: Shield, color: '#FF3B30' },
      { id: 'admin-hidden-gems', title: 'Manage Hidden Gems', icon: Award, color: '#AF52DE' },
      { id: 'admin-performance', title: 'Performance Monitor', icon: Trophy, color: '#34C759' },
    ],
  },
  {
    title: 'App',
    items: [
      { id: 'settings', title: 'App Settings', icon: Settings, color: '#8E8E93' },
      { id: 'help', title: 'Help & Support', icon: HelpCircle, color: '#007AFF' },
      { id: 'about', title: 'About FrontSnap', icon: Info, color: '#5856D6' },
    ],
  },
];

export default function ProfileScreen() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const { connectionsCount } = useSocialConnections();
  const [userStats, setUserStats] = useState<UserStats>({
    placesScanned: 0,
    collectionsSaved: 0,
    reviewsGenerated: 0,
  });
  const [userAchievements, setUserAchievements] = useState<UserAchievements>({
    level: 'Explorer',
    points: 0,
    nextLevel: 'Pioneer',
    pointsToNext: 250,
  });
  const [isLoading, setIsLoading] = useState(true);
  const mounted = useRef(true);
  const { toast, showSuccess, showError, showInfo, hideToast } = useToast();

  useEffect(() => {
    mounted.current = true;
    loadUserData();
    
    return () => {
      mounted.current = false;
    };
  }, []);

  const loadUserData = async () => {
    try {
      setIsLoading(true);

      // Get current user
      const user = await getCurrentUser();
      if (!user) {
        // User not authenticated, redirect to login
        router.replace('/auth/login');
        return;
      }

      // Fetch user profile
      const profile = await getProfile(user.id);
      
      // Fetch user statistics
      const [placesCount, collectionsCount, reviewsCount] = await Promise.all([
        getUserPlacesCount(user.id),
        getUserCollectionsCount(user.id),
        getUserReviewsCount(user.id),
      ]);

      if (mounted.current) {
        setUserProfile(profile);
        setUserStats({
          placesScanned: placesCount,
          collectionsSaved: collectionsCount,
          reviewsGenerated: reviewsCount,
        });

        // Calculate achievements based on profile data
        if (profile) {
          const achievements = calculateAchievements(profile.points, profile.level);
          setUserAchievements(achievements);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      showError('Profile Error', 'Failed to load profile data');
    } finally {
      if (mounted.current) {
        setIsLoading(false);
      }
    }
  };

  const calculateAchievements = (points: number, currentLevel: string): UserAchievements => {
    const levels = [
      { name: 'Explorer', minPoints: 0, maxPoints: 499 },
      { name: 'Pioneer', minPoints: 500, maxPoints: 1499 },
      { name: 'Adventurer', minPoints: 1500, maxPoints: 2999 },
      { name: 'Expert', minPoints: 3000, maxPoints: 4999 },
      { name: 'Master', minPoints: 5000, maxPoints: Infinity },
    ];

    const currentLevelIndex = levels.findIndex(level => level.name === currentLevel);
    const nextLevelIndex = Math.min(currentLevelIndex + 1, levels.length - 1);
    const nextLevel = levels[nextLevelIndex];
    
    const pointsToNext = nextLevel.minPoints - points;

    return {
      level: currentLevel,
      points,
      nextLevel: nextLevel.name,
      pointsToNext: Math.max(0, pointsToNext),
    };
  };

  const handleBack = () => {
    HapticFeedback.light();
    router.back();
  };

  const handleMenuPress = (itemId: string) => {
    HapticFeedback.light();
    
    switch (itemId) {
      case 'profile':
        router.push('/profile/edit');
        break;
      case 'privacy':
        showInfo('Coming Soon', 'Privacy settings will be available soon');
        break;
      case 'admin-dashboard':
        router.push('/admin');
        break;
      case 'admin-hidden-gems':
        router.push('/admin/hidden-gems');
        break;
      case 'admin-performance':
        router.push('/admin/performance');
        break;
      case 'activity-dashboard':
        router.push('/profile/activity-dashboard');
        break;
      case 'nearby-friends':
        router.push('/profile/nearby-friends');
        break;
      case 'location-settings':
        router.push('/profile/location-settings');
        break;
      case 'notifications':
        showInfo('Coming Soon', 'Notification settings will be available soon');
        break;
      case 'achievements':
        showInfo('Coming Soon', 'Compete with other FrontSnappers! Feature coming soon');
        break;
      case 'settings':
        router.push('/profile/app-settings');
        break;
      case 'help':
        showInfo('Coming Soon', 'Help center will be available soon');
        break;
      case 'about':
        router.push('/profile/about');
        break;
      default:
        break;
    }
  };

  const handleSignOut = async () => {
    HapticFeedback.medium();
    
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              HapticFeedback.success();
              await signOut();
              showSuccess('Signed Out', 'See you next time!');
              router.replace('/auth/login');
            } catch (error) {
              console.error('Error signing out:', error);
              showError('Sign Out Failed', 'Please try again');
            }
          },
        },
      ]
    );
  };

  const handleRefresh = async () => {
    HapticFeedback.light();
    try {
      await loadUserData();
      showSuccess('Refreshed', 'Profile updated successfully');
    } catch (error) {
      showError('Refresh Failed', 'Unable to refresh profile');
    }
  };

  const StatCard = ({ icon: Icon, value, label, color }: {
    icon: any;
    value: number;
    label: string;
    color: string;
  }) => (
    <View 
      style={styles.statCard}
      accessibilityLabel={`${label}: ${value}`}
      accessibilityRole="summary"
    >
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Icon size={20} color={color} strokeWidth={2} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const MenuItem = ({ item }: { item: typeof menuSections[0]['items'][0] }) => (
    <TouchableOpacity 
      style={styles.menuItem} 
      onPress={() => handleMenuPress(item.id)}
      accessibilityLabel={item.title}
      accessibilityRole="button"
      accessibilityHint={`Open ${item.title.toLowerCase()} settings`}
    >
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuItemIcon, { backgroundColor: item.color + '20' }]}>
          <item.icon size={20} color={item.color} strokeWidth={2} />
        </View>
        <Text style={styles.menuItemTitle}>{item.title}</Text>
      </View>
      <ChevronRight size={20} color="#C7C7CC" strokeWidth={2} />
    </TouchableOpacity>
  );

  if (isLoading || !userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <Loading 
          fullScreen 
          message="Loading profile..." 
          accessibilityLabel="Loading profile data"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleBack}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          accessibilityHint="Return to previous screen"
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={handleRefresh}
          accessibilityLabel="Refresh profile"
          accessibilityRole="button"
          accessibilityHint="Reload profile data"
        >
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* User Info */}
        <View style={styles.userSection}>
          <View style={styles.userInfo}>
            <SimpleAvatar
              name={userProfile.full_name}
              avatarUrl={userProfile.avatar_url}
              size={80}
              style={styles.avatar}
            />
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{userProfile.full_name}</Text>
              <Text style={styles.userEmail}>{userProfile.email}</Text>
              {userProfile.username && (
                <Text style={styles.userUsername}>@{userProfile.username}</Text>
              )}
            </View>
          </View>

          {/* Social Features Opt-in */}
          {!userProfile.allow_social_features && (
            <TouchableOpacity 
              style={styles.socialOptInCard}
              onPress={() => router.push('/profile/social-setup')}
              accessibilityLabel="Enable social features"
              accessibilityRole="button"
              accessibilityHint="Set up social features to connect with friends"
            >
              <View style={styles.socialOptInContent}>
                <Text style={styles.socialOptInTitle}>🌟 Enable Social Features</Text>
                <Text style={styles.socialOptInDescription}>
                  Connect with friends, share discoveries, and get trusted recommendations
                </Text>
                <Text style={styles.socialOptInAction}>Tap to set up →</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Social Stats (if enabled) */}
          {userProfile.allow_social_features && (
            <View style={styles.socialStatsCard}>
              <Text style={styles.socialStatsTitle}>Social</Text>
              <View style={styles.socialStatsRow}>
                <TouchableOpacity 
                  style={styles.socialStat}
                  onPress={() => router.push('/profile/connections')}
                  accessibilityLabel="View connections"
                  accessibilityRole="button"
                >
                  <Text style={styles.socialStatNumber}>{connectionsCount.following_count}</Text>
                  <Text style={styles.socialStatLabel}>Following</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.socialStat}
                  onPress={() => router.push('/profile/connections')}
                  accessibilityLabel="View connections"
                  accessibilityRole="button"
                >
                  <Text style={styles.socialStatNumber}>{connectionsCount.followers_count}</Text>
                  <Text style={styles.socialStatLabel}>Followers</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.socialStat}
                  onPress={() => router.push('/profile/find-friends')}
                  accessibilityLabel="Find friends"
                  accessibilityRole="button"
                >
                  <Text style={styles.socialStatLabel}>Find Friends</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Achievement Level */}
          <View 
            style={styles.achievementCard}
            accessibilityLabel={`Achievement level: ${userAchievements.level}, ${userAchievements.points} points`}
            accessibilityRole="summary"
          >
            <View style={styles.achievementHeader}>
              <Award size={20} color="#FFD700" strokeWidth={2} />
              <Text style={styles.achievementLevel}>{userAchievements.level}</Text>
              <Text style={styles.achievementPoints}>{userAchievements.points} pts</Text>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: userAchievements.pointsToNext > 0 
                      ? `${(userAchievements.points / (userAchievements.points + userAchievements.pointsToNext)) * 100}%` 
                      : '100%'
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {userAchievements.pointsToNext > 0 
                ? `${userAchievements.pointsToNext} points to ${userAchievements.nextLevel}`
                : `Maximum level reached!`
              }
            </Text>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <StatCard
              icon={Camera}
              value={userStats.placesScanned}
              label="Places Scanned"
              color="#007AFF"
            />
            <StatCard
              icon={Heart}
              value={userStats.collectionsSaved}
              label="Collections"
              color="#FF3B30"
            />
            <StatCard
              icon={Star}
              value={userStats.reviewsGenerated}
              label="AI Reviews"
              color="#FFD700"
            />
          </View>
        </View>

        {/* Menu Sections */}
        <View style={styles.menuContainer}>
          {menuSections.filter(section => {
            // Hide Admin section for non-admin users
            if (section.title === 'Admin' && userProfile?.role !== 'admin') {
              return false;
            }
            return true;
          }).map((section, sectionIndex) => (
            <View key={section.title} style={styles.menuSection}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.menuItems}>
                {section.items.map((item, itemIndex) => (
                  <View key={item.id}>
                    <MenuItem item={item} />
                    {itemIndex < section.items.length - 1 && <View style={styles.separator} />}
                  </View>
                ))}
              </View>
            </View>
          ))}

          {/* Sign Out */}
          <TouchableOpacity 
            style={styles.signOutButton} 
            onPress={handleSignOut}
            accessibilityLabel="Sign out of account"
            accessibilityRole="button"
            accessibilityHint="Sign out and return to login screen"
          >
            <View style={styles.signOutIcon}>
              <LogOut size={20} color="#FF3B30" strokeWidth={2} />
            </View>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>FrontSnap</Text>
          <Text style={styles.footerSubtext}>by SUPERING TECHNOLOGY</Text>
          <Text style={styles.version}>Version 1.0.0</Text>
        </View>
      </ScrollView>
      
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    paddingVertical: Spacing.sm,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C2C2E',
  },
  refreshButton: {
    paddingVertical: Spacing.sm,
  },
  refreshButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  userSection: {
    padding: Spacing.lg,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: Spacing.base,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    ...Typography.styles.h4,
    marginBottom: Spacing.xs,
  },
  userEmail: {
    ...Typography.styles.body1,
    color: Colors.textSecondary,
  },
  achievementCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  achievementLevel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C2C2E',
    flex: 1,
  },
  achievementPoints: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: Spacing.base,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C2C2E',
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  menuContainer: {
    paddingHorizontal: Spacing.lg,
  },
  menuSection: {
    marginBottom: Spacing['2xl'],
  },
  sectionTitle: {
    ...Typography.styles.h5,
    marginBottom: Spacing.base,
  },
  menuItems: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  menuItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C2C2E',
  },
  separator: {
    height: 0.5,
    backgroundColor: '#E5E5EA',
    marginLeft: 60,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    gap: Spacing.md,
    marginBottom: Spacing['2xl'],
  },
  signOutIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FF3B3020',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FF3B30',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C2C2E',
    marginBottom: Spacing.xs,
  },
  footerSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: Spacing.sm,
  },
  version: {
    fontSize: 12,
    color: '#C7C7CC',
  },
  // Social styles (added in Phase 1)
  userUsername: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  socialOptInCard: {
    backgroundColor: '#007AFF10',
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#007AFF30',
  },
  socialOptInContent: {
    padding: Spacing.base,
  },
  socialOptInTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 6,
  },
  socialOptInDescription: {
    fontSize: 14,
    color: '#2C2C2E',
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  socialOptInAction: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  socialStatsCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: Spacing.base,
    marginTop: Spacing.base,
    marginBottom: Spacing.xl,
  },
  socialStatsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2E',
    marginBottom: Spacing.md,
  },
  socialStatsRow: {
    flexDirection: 'row',
    gap: Spacing.xl,
  },
  socialStat: {
    alignItems: 'center',
  },
  socialStatNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C2C2E',
  },
  socialStatLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
});