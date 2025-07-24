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
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Gem, Camera, MapPin, Trophy, Clock, Users, Star } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getCurrentUser, getHiddenGemByCity, HiddenGem } from '@/lib/supabase';

export default function HiddenGemScreen() {
  const [hiddenGem, setHiddenGem] = useState<HiddenGem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentCity] = useState('San Francisco'); // You could get this from location services
  const router = useRouter();
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    checkAuthAndLoadHiddenGem();
    
    return () => {
      mounted.current = false;
    };
  }, []);

  const checkAuthAndLoadHiddenGem = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        console.log('🚫 User not authenticated in hidden gem page, redirecting to auth');
        router.replace('/auth/login');
        return;
      }
      
      if (mounted.current) {
        setIsAuthenticated(true);
        await loadHiddenGem();
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      router.replace('/auth/login');
    }
  };

  const loadHiddenGem = async () => {
    try {
      setIsLoading(true);
      const gem = await getHiddenGemByCity(currentCity);
      
      if (mounted.current) {
        setHiddenGem(gem);
      }
    } catch (error) {
      console.error('Error loading hidden gem:', error);
    } finally {
      if (mounted.current) {
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleCapturePhoto = () => {
    // Navigate to capture screen or open camera
    router.push('/(tabs)/capture');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading hidden gem...</Text>
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
          <TouchableOpacity style={styles.captureButton} onPress={handleCapturePhoto}>
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              style={styles.captureButtonGradient}
            >
            <Camera size={24} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.captureButtonText}>Start Your Hunt</Text>
            </LinearGradient>
          </TouchableOpacity>
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
  },
  loadingText: {
    fontSize: 16,
    color: '#2C2C2E',
    fontWeight: '600',
    marginTop: 16,
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
});