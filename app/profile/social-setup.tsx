import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { 
  ArrowLeft, 
  Users, 
  Eye, 
  EyeOff, 
  Check,
  UserPlus,
  Search,
  MapPin
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { getCurrentUser, updateSocialProfile, checkUsernameAvailability } from '@/lib/supabase';
import { HapticFeedback } from '@/utils/haptics';
import { useToast } from '@/hooks/useToast';
import { Toast } from '@/components/Toast';

export default function SocialSetupScreen() {
  const router = useRouter();
  const { toast, showSuccess, showError, showInfo, hideToast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  const totalSteps = 3;

  useEffect(() => {
    if (username.length >= 3) {
      checkUsername();
    } else {
      setIsUsernameAvailable(null);
      setUsernameError('');
    }
  }, [username]);

  const checkUsername = async () => {
    if (username.length < 3) return;
    
    setIsCheckingUsername(true);
    setUsernameError('');
    
    try {
      // Validate username format
      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!usernameRegex.test(username)) {
        setUsernameError('Username can only contain letters, numbers, and underscores');
        setIsUsernameAvailable(false);
        return;
      }

      const available = await checkUsernameAvailability(username);
      setIsUsernameAvailable(available);
      
      if (!available) {
        setUsernameError('This username is already taken');
      }
    } catch (error) {
      setUsernameError('Could not check username availability');
      setIsUsernameAvailable(false);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleBack = () => {
    HapticFeedback.light();
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const handleNext = () => {
    HapticFeedback.light();
    
    if (currentStep === 1) {
      // Validate username step
      if (!username.trim()) {
        showError('Username Required', 'Please enter a username to continue');
        return;
      }
      if (username.length < 3) {
        showError('Username Too Short', 'Username must be at least 3 characters');
        return;
      }
      if (!isUsernameAvailable) {
        showError('Username Invalid', usernameError || 'Please choose a different username');
        return;
      }
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinishSetup();
    }
  };

  const handleFinishSetup = async () => {
    setIsLoading(true);
    HapticFeedback.medium();
    
    try {
      const result = await updateSocialProfile({
        username: username.toLowerCase().trim(),
        bio: bio.trim() || undefined,
        allow_social_features: true
      });

      if (result.success) {
        showSuccess('Welcome to Social!', 'You can now connect with friends and discover their favorite places');
        // Delay navigation to show success message
        setTimeout(() => {
          router.replace('/profile');
        }, 1500);
      } else {
        showError('Setup Failed', result.error || 'Could not enable social features');
      }
    } catch (error) {
      console.error('Error finishing social setup:', error);
      showError('Setup Failed', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepIcon}>
              <UserPlus size={32} color="#007AFF" strokeWidth={2} />
            </View>
            <Text style={styles.stepTitle}>Choose Your Username</Text>
            <Text style={styles.stepDescription}>
              Your username helps friends find you on FrontSnap. Choose something memorable!
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Username</Text>
              <View style={styles.usernameInputContainer}>
                <Text style={styles.usernamePrefix}>@</Text>
                <TextInput
                  style={styles.usernameInput}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="your_username"
                  placeholderTextColor="#8E8E93"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={20}
                />
                {isCheckingUsername && (
                  <ActivityIndicator size="small" color="#007AFF" />
                )}
                {!isCheckingUsername && isUsernameAvailable === true && (
                  <Check size={20} color="#34C759" strokeWidth={2} />
                )}
                {!isCheckingUsername && isUsernameAvailable === false && (
                  <View style={styles.errorIcon}>
                    <Text style={styles.errorIconText}>✕</Text>
                  </View>
                )}
              </View>
              {usernameError && (
                <Text style={styles.errorText}>{usernameError}</Text>
              )}
              {isUsernameAvailable === true && (
                <Text style={styles.successText}>Great! This username is available</Text>
              )}
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepIcon}>
              <Users size={32} color="#007AFF" strokeWidth={2} />
            </View>
            <Text style={styles.stepTitle}>Tell Us About Yourself</Text>
            <Text style={styles.stepDescription}>
              Add a short bio to help friends recognize you (optional)
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Bio</Text>
              <TextInput
                style={styles.bioInput}
                value={bio}
                onChangeText={setBio}
                placeholder="Coffee lover, foodie, always exploring new places..."
                placeholderTextColor="#8E8E93"
                multiline
                maxLength={150}
                textAlignVertical="top"
              />
              <Text style={styles.characterCount}>{bio.length}/150</Text>
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepIcon}>
              <MapPin size={32} color="#007AFF" strokeWidth={2} />
            </View>
            <Text style={styles.stepTitle}>Ready to Explore Together!</Text>
            <Text style={styles.stepDescription}>
              You're all set! Here's what you can do with social features:
            </Text>
            
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <Search size={20} color="#34C759" strokeWidth={2} />
                <Text style={styles.featureText}>Find and follow friends</Text>
              </View>
              <View style={styles.featureItem}>
                <MapPin size={20} color="#34C759" strokeWidth={2} />
                <Text style={styles.featureText}>See places your friends love</Text>
              </View>
              <View style={styles.featureItem}>
                <Users size={20} color="#34C759" strokeWidth={2} />
                <Text style={styles.featureText}>Get trusted recommendations</Text>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <ArrowLeft size={24} color="#007AFF" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Social Setup</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${(currentStep / totalSteps) * 100}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>Step {currentStep} of {totalSteps}</Text>
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {renderStepContent()}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            (!isUsernameAvailable && currentStep === 1) && styles.nextButtonDisabled
          ]}
          onPress={handleNext}
          disabled={isLoading || (!isUsernameAvailable && currentStep === 1)}
          accessibilityLabel={currentStep === totalSteps ? "Finish setup" : "Next step"}
          accessibilityRole="button"
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.nextButtonText}>
              {currentStep === totalSteps ? 'Enable Social Features' : 'Next'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C2C2E',
  },
  placeholder: {
    width: 32,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#F2F2F7',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  stepContent: {
    padding: 20,
    alignItems: 'center',
  },
  stepIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C2C2E',
    textAlign: 'center',
    marginBottom: 12,
  },
  stepDescription: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2E',
    marginBottom: 8,
  },
  usernameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  usernamePrefix: {
    fontSize: 16,
    color: '#8E8E93',
    marginRight: 4,
  },
  usernameInput: {
    flex: 1,
    fontSize: 16,
    color: '#2C2C2E',
  },
  bioInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2C2C2E',
    height: 80,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  characterCount: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'right',
    marginTop: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 4,
  },
  successText: {
    fontSize: 14,
    color: '#34C759',
    marginTop: 4,
  },
  errorIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIconText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  featuresList: {
    width: '100%',
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
  },
  featureText: {
    fontSize: 16,
    color: '#2C2C2E',
    marginLeft: 12,
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5EA',
  },
  nextButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});