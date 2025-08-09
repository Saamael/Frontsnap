import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Camera, Search, Heart, Gem, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing } from '@/constants/theme';
import { Button } from '@/components/Button';

const { width } = Dimensions.get('window');

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: any;
  color: string;
  image: string;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 1,
    title: 'Capture Storefronts',
    description: 'Take photos of local businesses and let AI identify them instantly with detailed reviews and information.',
    icon: Camera,
    color: '#007AFF',
    image: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    id: 2,
    title: 'Discover Places',
    description: 'Explore curated local businesses with AI-powered reviews, ratings, and personalized recommendations.',
    icon: Search,
    color: '#34C759',
    image: 'https://images.pexels.com/photos/1833586/pexels-photo-1833586.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    id: 3,
    title: 'Save Collections',
    description: 'Organize your favorite places into custom collections and share them with friends and family.',
    icon: Heart,
    color: '#FF3B30',
    image: 'https://images.pexels.com/photos/3065209/pexels-photo-3065209.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  {
    id: 4,
    title: 'Find Hidden Gems',
    description: 'Participate in location-based treasure hunts to discover secret spots and earn exclusive rewards.',
    icon: Gem,
    color: '#FFD700',
    image: 'https://images.pexels.com/photos/1002703/pexels-photo-1002703.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
];

export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();
  
  // Debug: Log when onboarding screen renders
  console.log('🎭 ONBOARDING SCREEN RENDERED - Current step:', currentStep);

  const handleNext = async () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      await AsyncStorage.setItem('onboarding_completed', 'true');
      console.log('✅ Onboarding completed, navigating to main app');
      // Force a re-render by navigating to root which will check auth status
      router.replace('/');
    }
  };

  const handleSkip = async () => {
    // Skip onboarding and go to main app
    await AsyncStorage.setItem('onboarding_completed', 'true');
    console.log('⏭️ Onboarding skipped, navigating to main app');
    router.replace('/');
  };

  const step = onboardingSteps[currentStep];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" translucent={false} />
      <LinearGradient
        colors={['#F8F9FA', '#FFFFFF']}
        style={styles.gradient}
      >
        {/* Skip Button */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={handleSkip}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
            accessibilityHint="Skip the introduction and go to main app"
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Image */}
          <View style={styles.imageContainer}>
            <Image source={{ uri: step.image }} style={styles.stepImage} />
            <View style={[styles.iconOverlay, { backgroundColor: step.color }]}>
              <step.icon size={32} color="#FFFFFF" strokeWidth={2} />
            </View>
          </View>

          {/* Text Content */}
          <View style={styles.textContent}>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepDescription}>{step.description}</Text>
          </View>

          {/* Progress Indicators */}
          <View style={styles.progressContainer}>
            {onboardingSteps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  index === currentStep && styles.activeDot,
                  index === currentStep && { backgroundColor: step.color },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <Button
            title={currentStep === onboardingSteps.length - 1 ? 'Get Started' : 'Next'}
            onPress={handleNext}
            variant="primary"
            size="large"
            fullWidth
            icon={<ChevronRight size={20} color="#FFFFFF" strokeWidth={2} />}
            iconPosition="right"
            accessibilityLabel={currentStep === onboardingSteps.length - 1 ? 'Get Started' : 'Next step'}
            accessibilityHint={currentStep === onboardingSteps.length - 1 ? 'Complete onboarding and start using FrontSnap' : 'Continue to next onboarding step'}
            style={{ backgroundColor: step.color }}
          />

          {/* Step Counter */}
          <Text style={styles.stepCounter}>
            {currentStep + 1} of {onboardingSteps.length}
          </Text>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  skipText: {
    ...Typography.styles.label,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 48,
  },
  stepImage: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: 24,
  },
  iconOverlay: {
    position: 'absolute',
    bottom: -20,
    right: -20,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  textContent: {
    alignItems: 'center',
    marginBottom: 48,
  },
  stepTitle: {
    ...Typography.styles.h2,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  stepDescription: {
    ...Typography.styles.body1,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E5EA',
  },
  activeDot: {
    width: 24,
  },
  bottomActions: {
    paddingHorizontal: 32,
    paddingBottom: 40,
    alignItems: 'center',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
    width: '100%',
    borderWidth: 0,
    shadowColor: 'transparent',
    elevation: 0,
  },
  nextButtonText: {
    ...Typography.styles.button,
    fontSize: Typography.fontSize.lg,
  },
  stepCounter: {
    ...Typography.styles.label,
  },
});