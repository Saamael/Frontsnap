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
    title: 'App',
    items: [
      { id: 'achievements', title: 'Achievements', icon: Trophy, color: '#FFD700' },
      { id: 'settings', title: 'App Settings', icon: Settings, color: '#8E8E93' },
      { id: 'help', title: 'Help & Support', icon: HelpCircle, color: '#007AFF' },
      { id: 'about', title: 'About FrontSnap', icon: Info, color: '#5856D6' },
    ],
  },
];

export default function ProfileScreen() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
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
    router.back();
  };

  const handleMenuPress = (itemId: string) => {
    switch (itemId) {
      case 'profile':
        Alert.alert('Edit Profile', 'Profile editing would open here');
        break;
      case 'privacy':
        Alert.alert('Privacy & Security', 'Privacy settings would open here');
        break;
      case 'notifications':
        Alert.alert('Notifications', 'Notification settings would open here');
        break;
      case 'achievements':
        Alert.alert('Achievements', 'Coming soon: Compete with other FrontSnappers!');
        break;
      case 'settings':
        Alert.alert('App Settings', 'App settings would open here');
        break;
      case 'help':
        Alert.alert('Help & Support', 'Help center would open here');
        break;
      case 'about':
        Alert.alert('About FrontSnap', 'About page would open here');
        break;
      default:
        break;
    }
  };

  const handleSignOut = async () => {
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
              await signOut();
              router.replace('/auth/login');
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleRefresh = async () => {
    await loadUserData();
  };

  const StatCard = ({ icon: Icon, value, label, color }: {
    icon: any;
    value: number;
    label: string;
    color: string;
  }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Icon size={20} color={color} strokeWidth={2} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const MenuItem = ({ item }: { item: typeof menuSections[0]['items'][0] }) => (
    <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuPress(item.id)}>
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
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* User Info */}
        <View style={styles.userSection}>
          <View style={styles.userInfo}>
            <Image 
              source={{ 
                uri: userProfile.avatar_url || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=200' 
              }} 
              style={styles.avatar} 
            />
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{userProfile.full_name}</Text>
              <Text style={styles.userEmail}>{userProfile.email}</Text>
            </View>
          </View>

          {/* Achievement Level */}
          <View style={styles.achievementCard}>
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
          {menuSections.map((section, sectionIndex) => (
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
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
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
    paddingVertical: 8,
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
    paddingVertical: 8,
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
    padding: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C2C2E',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#8E8E93',
  },
  achievementCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
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
    marginBottom: 8,
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
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C2C2E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  menuContainer: {
    paddingHorizontal: 20,
  },
  menuSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C2C2E',
    marginBottom: 16,
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
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    marginBottom: 32,
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
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  version: {
    fontSize: 12,
    color: '#C7C7CC',
  },
});