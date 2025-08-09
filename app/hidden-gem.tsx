import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Gem, Camera, MapPin, Trophy, Clock, Users, Star } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getCurrentUser, getHiddenGemByCity, getActiveHiddenGemsByCity, getDiscoveredHiddenGemsByCity, HiddenGem } from '@/lib/supabase';
import { useLocation } from '@/contexts/LocationContext';
import { useRealtimeHiddenGems } from '@/hooks/useRealtimeHiddenGems';
import { useToast } from '@/hooks/useToast';
import { Toast } from '@/components/Toast';
import { useSmartRefresh } from '@/hooks/useSmartRefresh';

export default function HiddenGemScreen() {
  const [hiddenGem, setHiddenGem] = useState<HiddenGem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const { toast, showSuccess, showError, hideToast } = useToast();
  
  // Get location from context
  const { locationData, currentLocation, locationKey, isLoading: isLocationLoading } = useLocation();
  const currentCity = locationData?.city || 'San Francisco';

  // Real-time handlers for live hidden gem updates
  const handleNewHiddenGem = useCallback((newGem: HiddenGem) => {
    console.log('🔄 Real-time: New hidden gem added:', newGem.title);
    if (newGem.is_active) {
      setHiddenGem(newGem);
      showSuccess('New Hidden Gem!', `${newGem.title} just appeared in ${currentCity}!`);
    }
  }, [currentCity, showSuccess]);

  const handleUpdatedHiddenGem = useCallback((updatedGem: HiddenGem) => {
    console.log('🔄 Real-time: Hidden gem updated:', updatedGem.title);
    setHiddenGem(prev => prev?.id === updatedGem.id ? updatedGem : prev);
  }, []);

  const handleDiscoveredHiddenGem = useCallback((discoveredGem: HiddenGem) => {
    console.log('🔄 Real-time: Hidden gem discovered:', discoveredGem.title);
    if (hiddenGem?.id === discoveredGem.id) {
      showSuccess('Gem Discovered!', `${discoveredGem.title} was just discovered by someone!`);
      // Reload to show the next active gem or discovered status
      loadHiddenGem();
    }
  }, [hiddenGem, loadHiddenGem, showSuccess]);

  // Enable real-time subscriptions
  useRealtimeHiddenGems({
    currentCity,
    onHiddenGemAdded: handleNewHiddenGem,
    onHiddenGemUpdated: handleUpdatedHiddenGem,
    onHiddenGemDiscovered: handleDiscoveredHiddenGem
  });

  // Smart refresh for background updates and app state changes
  const refreshHiddenGemData = useCallback(async () => {
    if (currentCity && isAuthenticated) {
      console.log('🔄 Smart refresh: Refreshing hidden gem data');
      await loadHiddenGem();
    }
  }, [currentCity, isAuthenticated, loadHiddenGem]);

  useSmartRefresh({
    refreshFunction: refreshHiddenGemData,
    intervalMs: 45000, // Refresh every 45 seconds (less frequent than places)
    onlyWhenActive: true,
    enabled: isAuthenticated && !!currentCity
  });

  // Load hidden gem when location changes or component mounts
  useEffect(() => {
    if (isAuthenticated && currentCity && !isLocationLoading) {
      console.log(`🎯 Location changed or component mounted - loading gems for: ${currentCity}`);
      loadHiddenGem();
    }
  }, [currentCity, isAuthenticated, locationKey, isLocationLoading, loadHiddenGem]);

  // Check authentication on mount
  useEffect(() => {
    checkAuthAndLoadHiddenGem();
  }, []);

  const checkAuthAndLoadHiddenGem = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        console.log('🚫 User not authenticated, redirecting to login');
        router.replace('/auth/login');
        return;
      }
      
      setIsAuthenticated(true);
      // Hidden gem will be loaded by the other useEffect
    } catch (error) {
      console.error('Error checking authentication:', error);
      router.replace('/auth/login');
    }
  };

  const loadHiddenGem = useCallback(async () => {
    if (!currentCity) {
      console.log('🚫 No city available to load hidden gems');
      setHiddenGem(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log(`🎯 Loading hidden gems for city: ${currentCity} (locationKey: ${locationKey})`);
      
      // Add small delay to ensure context has updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // First try to get active hidden gems
      const activeGems = await getActiveHiddenGemsByCity(currentCity);
      console.log(`✨ Found ${activeGems.length} active gems in ${currentCity}`);
      
      if (activeGems.length > 0) {
        // Show the first active gem
        console.log(`🎮 Showing active gem: ${activeGems[0].title}`);
        setHiddenGem(activeGems[0]);
      } else {
        // If no active gems, show the most recently discovered gem
        console.log(`🔍 No active gems, checking discovered gems in ${currentCity}`);
        const discoveredGems = await getDiscoveredHiddenGemsByCity(currentCity);
        console.log(`🏆 Found ${discoveredGems.length} discovered gems in ${currentCity}`);
        
        if (discoveredGems.length > 0) {
          console.log(`🎯 Showing discovered gem: ${discoveredGems[0].title}`);
          setHiddenGem(discoveredGems[0]);
        } else {
          console.log(`❌ No gems found in ${currentCity}`);
          setHiddenGem(null);
        }
      }
    } catch (error) {
      console.error('❌ Error loading hidden gem:', error);
      setHiddenGem(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentCity, locationKey]);

  const handleBack = () => {
    router.back();
  };

  const handleCapturePhoto = () => {
    // Navigate to capture screen or open camera
    router.push('/(tabs)/capture');
  };

  if (isLocationLoading || isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Loading hidden gems for {currentCity}...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!hiddenGem) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color="#2C2C2E" strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Hidden Gem</Text>
        </View>

        <View style={styles.emptyState}>
          <Gem size={64} color="#C7C7CC" strokeWidth={1.5} />
          <Text style={styles.emptyStateTitle}>No Hidden Gem Available</Text>
          <Text style={styles.emptyStateMessage}>
            Check back later for new hidden gems in {currentCity}!
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Image source={{ uri: hiddenGem.hint_image_url }} style={styles.heroImage} />
          
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.heroOverlay}
          >
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
            </TouchableOpacity>
            
            <View style={styles.heroContent}>
              <View style={styles.locationBadge}>
                <MapPin size={16} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.locationText}>{hiddenGem.city}, {hiddenGem.country}</Text>
              </View>
              
              {/* Winner Banner */}
              {!hiddenGem.is_active && hiddenGem.winner_id && (
                <View style={styles.winnerBanner}>
                  <Trophy size={16} color="#FFD700" strokeWidth={2} />
                  <Text style={styles.winnerText}>
                    Hidden gem found by @{(hiddenGem as any).winner_profile?.full_name || 'Winner'} - Prize: {hiddenGem.reward}
                  </Text>
                </View>
              )}
              
              <Text style={styles.heroTitle}>{hiddenGem.title}</Text>
              <Text style={styles.heroDescription}>{hiddenGem.description}</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <Users size={20} color="#007AFF" strokeWidth={2} />
            <Text style={styles.statNumber}>{hiddenGem.participants}</Text>
            <Text style={styles.statLabel}>Participants</Text>
          </View>
          
          <View style={styles.statItem}>
            <Trophy size={20} color="#FFD700" strokeWidth={2} />
            <Text style={styles.statNumber}>{hiddenGem.attempts}</Text>
            <Text style={styles.statLabel}>Attempts</Text>
          </View>
          
          <View style={styles.statItem}>
            <Clock size={20} color="#FF6B35" strokeWidth={2} />
            <Text style={styles.statNumber}>{hiddenGem.time_left}</Text>
            <Text style={styles.statLabel}>Time Left</Text>
          </View>
        </View>

        {/* Reward Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Gem size={24} color="#FFD700" strokeWidth={2} />
            <Text style={styles.sectionTitle}>Reward</Text>
          </View>
          <View style={styles.rewardCard}>
            <Text style={styles.rewardText}>{hiddenGem.reward}</Text>
            <View style={styles.difficultyBadge}>
              <Text style={styles.difficultyText}>{hiddenGem.difficulty}</Text>
            </View>
          </View>
        </View>

        {/* Clues Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Star size={24} color="#007AFF" strokeWidth={2} />
            <Text style={styles.sectionTitle}>Clues</Text>
          </View>
          <View style={styles.cluesContainer}>
            {hiddenGem.clues.map((clue, index) => (
              <View key={index} style={styles.clueItem}>
                <View style={styles.clueNumber}>
                  <Text style={styles.clueNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.clueText}>{clue}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Rules Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rules</Text>
          <View style={styles.rulesContainer}>
            {hiddenGem.rules.map((rule, index) => (
              <Text key={index} style={styles.ruleText}>• {rule}</Text>
            ))}
          </View>
        </View>

        {/* Action Button */}
        <View style={styles.actionSection}>
          {hiddenGem.is_active ? (
            <TouchableOpacity style={styles.captureButton} onPress={handleCapturePhoto}>
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                style={styles.captureButtonGradient}
              >
                <Camera size={24} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.captureButtonText}>Start Your Hunt</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.discoveredButton} disabled>
              <LinearGradient
                colors={['#8E8E93', '#6D6D70']}
                style={styles.captureButtonGradient}
              >
                <Trophy size={24} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.captureButtonText}>Already Discovered</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      {toast && <Toast {...toast} onHide={hideToast} />}
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
    backgroundColor: '#2C2C2E',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    position: 'relative',
    height: 200,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    padding: 16,
  },
  heroContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  locationText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  heroDescription: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
  },
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C2C2E',
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C2C2E',
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rewardText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
  },
  difficultyBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    color: '#FF9500',
    fontSize: 14,
    fontWeight: '600',
  },
  cluesContainer: {
    padding: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
  },
  clueItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  clueNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clueNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  clueText: {
    flex: 1,
    fontSize: 16,
    color: '#3C3C43',
    lineHeight: 22,
  },
  rulesContainer: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
  },
  ruleText: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
    marginBottom: 8,
  },
  actionSection: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  captureButton: {
    backgroundColor: '#2C2C2E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 16,
  },
  discoveredButton: {
    backgroundColor: '#8E8E93',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 16,
    opacity: 0.7,
  },
  captureButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  captureButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C2C2E',
    marginBottom: 16,
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
  },
  winnerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  winnerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginLeft: 8,
  },
});