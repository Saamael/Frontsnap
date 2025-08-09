import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { 
  ArrowLeft, 
  Camera, 
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit3,
  Save,
  Trash2,
  Upload
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { getCurrentUser, getProfile, updateProfile, Profile } from '@/lib/supabase';
import { uploadAvatarHybrid } from '@/lib/avatar-hybrid';
import { SimpleAvatar } from '@/components/SimpleAvatar';
import { HapticFeedback } from '@/utils/haptics';
import { useToast } from '@/hooks/useToast';
import { Toast } from '@/components/Toast';

interface ProfileForm {
  full_name: string;
  email: string;
  phone: string;
  bio: string;
  location: string;
  date_of_birth: string;
  avatar_url: string;
}

// Remove default avatar URL - we'll use initials instead

export default function EditProfileScreen() {
  const router = useRouter();
  const { toast, showSuccess, showError, showInfo, hideToast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [originalProfile, setOriginalProfile] = useState<Profile | null>(null);
  const [avatarKey, setAvatarKey] = useState(0); // Force avatar refresh
  const [formData, setFormData] = useState<ProfileForm>({
    full_name: '',
    email: '',
    phone: '',
    bio: '',
    location: '',
    date_of_birth: '',
    avatar_url: '',
  });
  const [formErrors, setFormErrors] = useState<Partial<ProfileForm>>({});

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      const user = await getCurrentUser();
      if (!user) {
        router.replace('/auth/login');
        return;
      }

      const profile = await getProfile(user.id);
      if (profile) {
        console.log('📥 Loaded profile from database:', profile);
        console.log('📸 Profile avatar_url:', profile.avatar_url);
        
        setOriginalProfile(profile);
        const avatarUrl = profile.avatar_url || '';
        console.log('📸 Setting avatar_url to:', avatarUrl);
        
        setFormData({
          full_name: profile.full_name || '',
          email: profile.email || '',
          phone: '', // Field doesn't exist in database
          bio: profile.bio || '',
          location: '', // Field doesn't exist in database  
          date_of_birth: '', // Field doesn't exist in database
          avatar_url: avatarUrl,
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      showError('Profile Error', 'Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<ProfileForm> = {};

    if (!formData.full_name.trim()) {
      errors.full_name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (formData.phone && !/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }

    if (formData.bio && formData.bio.length > 160) {
      errors.bio = 'Bio must be 160 characters or less';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleBack = () => {
    HapticFeedback.light();
    if (hasChanges()) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { 
            text: 'Discard Changes', 
            style: 'destructive', 
            onPress: () => router.back() 
          },
        ]
      );
    } else {
      router.back();
    }
  };

  const hasChanges = (): boolean => {
    if (!originalProfile) return false;
    
    return (
      formData.full_name !== (originalProfile.full_name || '') ||
      formData.email !== (originalProfile.email || '') ||
      formData.phone !== (originalProfile.phone || '') ||
      formData.bio !== (originalProfile.bio || '') ||
      formData.location !== (originalProfile.location || '') ||
      formData.date_of_birth !== (originalProfile.date_of_birth || '') ||
      formData.avatar_url !== (originalProfile.avatar_url || '')
    );
  };

  const handleSave = async () => {
    if (!validateForm()) {
      HapticFeedback.error();
      showError('Validation Error', 'Please fix the errors and try again');
      return;
    }

    try {
      setIsSaving(true);
      HapticFeedback.medium();

      const user = await getCurrentUser();
      if (!user) {
        showError('Authentication Error', 'Please sign in again');
        return;
      }

      let finalAvatarUrl = formData.avatar_url;

      // Check if we have a local file that needs to be uploaded
      if (formData.avatar_url.startsWith('file://')) {
        console.log('📤 Local file detected, uploading...');
        showInfo('Uploading Image', 'Please wait while we upload your photo...');
        
        const uploadedUrl = await uploadAvatarHybrid(formData.avatar_url, user.id);
        
        if (!uploadedUrl) {
          showError('Upload Failed', 'Failed to upload avatar image. Please try again.');
          return;
        }
        
        finalAvatarUrl = uploadedUrl;
        console.log('✅ Avatar uploaded successfully');
        
        // Update the form data to show the uploaded URL immediately
        setFormData(prev => ({ ...prev, avatar_url: finalAvatarUrl }));
        
        // If it's a base64 URL, profile is already updated
        if (finalAvatarUrl.startsWith('data:image')) {
          showSuccess('Profile Updated', 'Your profile photo has been updated successfully');
          setIsSaving(false);
          
          // Force refresh
          setAvatarKey(prev => prev + 1);
          await loadUserProfile();
          return;
        }
      }

      // Prepare update data (only fields that exist in profiles table)
      const updateData = {
        full_name: formData.full_name,
        bio: formData.bio || null,
        location: formData.location || null,
        avatar_url: finalAvatarUrl || null,
      };
      
      console.log('🔄 Updating profile with data:', updateData);
      console.log('📸 Final avatar URL being saved:', updateData.avatar_url);
      
      // Update profile in database
      await updateProfile(user.id, updateData);

      showSuccess('Profile Updated', 'Your profile has been saved successfully');
      
      // Force avatar refresh if avatar was updated
      if (formData.avatar_url !== originalProfile?.avatar_url) {
        setAvatarKey(prev => prev + 1); // Force avatar component re-render
      }
      
      // Reload the profile to get the latest data
      await loadUserProfile();
      
    } catch (error) {
      console.error('Error saving profile:', error);
      showError('Save Failed', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarPress = () => {
    console.log('🔵 Avatar pressed - showing options');
    HapticFeedback.light();
    Alert.alert(
      'Change Profile Photo',
      'Choose how you want to update your profile photo',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => {
          console.log('📷 Take Photo selected');
          openCamera();
        }},
        { text: 'Choose from Library', onPress: () => {
          console.log('📸 Choose from Library selected');
          openImagePicker();
        }},
        ...(formData.avatar_url ? [
          { text: 'Remove Photo', style: 'destructive', onPress: () => {
            console.log('🗑️ Remove Photo selected');
            removeAvatar();
          }}
        ] : [])
      ]
    );
  };

  const openCamera = async () => {
    try {
      console.log('📷 Opening camera...');
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        showError('Permission Required', 'Camera permission is needed to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const newImageUri = result.assets[0].uri;
        console.log('📷 New image selected from camera:', newImageUri);
        setFormData(prev => ({ ...prev, avatar_url: newImageUri }));
        setAvatarKey(prev => prev + 1); // Force immediate refresh
        showInfo('Photo Selected', 'Don\'t forget to save your changes');
      }
    } catch (error) {
      console.error('Error opening camera:', error);
      showError('Camera Error', 'Failed to open camera');
    }
  };

  const openImagePicker = async () => {
    try {
      console.log('📸 Opening image picker...');
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showError('Permission Required', 'Photo library permission is needed');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const newImageUri = result.assets[0].uri;
        console.log('📸 New image selected from gallery:', newImageUri);
        setFormData(prev => ({ ...prev, avatar_url: newImageUri }));
        setAvatarKey(prev => prev + 1); // Force immediate refresh
        showInfo('Photo Selected', 'Don\'t forget to save your changes');
      }
    } catch (error) {
      console.error('Error opening image picker:', error);
      showError('Image Picker Error', 'Failed to open photo library');
    }
  };

  const removeAvatar = () => {
    setFormData(prev => ({ ...prev, avatar_url: '' }));
    setAvatarKey(prev => prev + 1); // Force immediate refresh
    showInfo('Photo Removed', 'Profile photo has been removed');
  };

  const handleDeleteAccount = () => {
    HapticFeedback.error();
    setShowDeleteModal(true);
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you absolutely sure? This action cannot be undone and all your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: Implement account deletion
              showInfo('Coming Soon', 'Account deletion will be available soon');
              setShowDeleteModal(false);
            } catch (error) {
              showError('Delete Failed', 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  const FormField = ({ 
    icon: Icon, 
    label, 
    value, 
    onChangeText, 
    placeholder, 
    error,
    multiline = false,
    keyboardType = 'default',
    autoCapitalize = 'sentences',
    maxLength
  }: {
    icon: any;
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    error?: string;
    multiline?: boolean;
    keyboardType?: 'default' | 'email-address' | 'phone-pad';
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    maxLength?: number;
  }) => (
    <View style={styles.fieldContainer}>
      <View style={styles.fieldHeader}>
        <View style={styles.fieldLabelContainer}>
          <Icon size={16} color="#007AFF" strokeWidth={2} />
          <Text style={styles.fieldLabel}>{label}</Text>
        </View>
        {maxLength && (
          <Text style={styles.characterCount}>
            {value.length}/{maxLength}
          </Text>
        )}
      </View>
      <TextInput
        style={[
          styles.textInput,
          multiline && styles.textInputMultiline,
          error && styles.textInputError,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8E8E93"
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
        accessibilityLabel={label}
        accessibilityHint={placeholder}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
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
        >
          <ArrowLeft size={24} color="#007AFF" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isSaving || !hasChanges()}
          accessibilityLabel="Save changes"
          accessibilityRole="button"
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Save size={24} color={hasChanges() ? "#007AFF" : "#C7C7CC"} strokeWidth={2} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handleAvatarPress}
            accessibilityLabel="Change profile photo"
            accessibilityRole="button"
          >
            <SimpleAvatar
              key={avatarKey}
              name={formData.full_name}
              avatarUrl={formData.avatar_url}
              size={120}
              style={styles.avatar}
            />
            <View style={styles.avatarOverlay}>
              <Camera size={20} color="#FFFFFF" strokeWidth={2} />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to change photo</Text>
          {/* Debug info - remove this later */}
          <Text style={styles.debugText}>Avatar Key: {avatarKey}</Text>
          <Text style={styles.debugText} numberOfLines={2}>
            Current URL: {formData.avatar_url.substring(0, 50)}...
          </Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          <FormField
            icon={User}
            label="Full Name"
            value={formData.full_name}
            onChangeText={(text) => setFormData(prev => ({ ...prev, full_name: text }))}
            placeholder="Enter your full name"
            error={formErrors.full_name}
            autoCapitalize="words"
          />

          <FormField
            icon={Mail}
            label="Email"
            value={formData.email}
            onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
            placeholder="Enter your email address"
            error={formErrors.email}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <FormField
            icon={Phone}
            label="Phone (Optional)"
            value={formData.phone}
            onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
            placeholder="Enter your phone number"
            error={formErrors.phone}
            keyboardType="phone-pad"
          />

          <FormField
            icon={Edit3}
            label="Bio (Optional)"
            value={formData.bio}
            onChangeText={(text) => setFormData(prev => ({ ...prev, bio: text }))}
            placeholder="Tell us about yourself..."
            error={formErrors.bio}
            multiline
            maxLength={160}
          />

          <FormField
            icon={MapPin}
            label="Location (Optional)"
            value={formData.location}
            onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
            placeholder="City, Country"
            autoCapitalize="words"
          />

          <FormField
            icon={Calendar}
            label="Date of Birth (Optional)"
            value={formData.date_of_birth}
            onChangeText={(text) => setFormData(prev => ({ ...prev, date_of_birth: text }))}
            placeholder="YYYY-MM-DD"
          />
        </View>

        {/* Danger Zone */}
        <View style={styles.dangerSection}>
          <Text style={styles.dangerTitle}>Danger Zone</Text>
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleDeleteAccount}
            accessibilityLabel="Delete account"
            accessibilityRole="button"
          >
            <Trash2 size={20} color="#FF3B30" strokeWidth={2} />
            <Text style={styles.dangerButtonText}>Delete Account</Text>
          </TouchableOpacity>
          <Text style={styles.dangerHint}>
            This will permanently delete your account and all associated data.
          </Text>
        </View>
      </ScrollView>

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowDeleteModal(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <TouchableOpacity
              onPress={confirmDeleteAccount}
              style={styles.modalDeleteButton}
            >
              <Text style={styles.modalDeleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <Text style={styles.modalWarning}>
              ⚠️ This action cannot be undone
            </Text>
            <Text style={styles.modalDescription}>
              Deleting your account will permanently remove:
            </Text>
            <View style={styles.modalList}>
              <Text style={styles.modalListItem}>• Your profile and personal information</Text>
              <Text style={styles.modalListItem}>• All your saved places and collections</Text>
              <Text style={styles.modalListItem}>• Your reviews and AI-generated content</Text>
              <Text style={styles.modalListItem}>• Your account history and achievements</Text>
            </View>
            <Text style={styles.modalFooter}>
              If you're sure you want to delete your account, tap "Delete" above.
            </Text>
          </View>
        </SafeAreaView>
      </Modal>

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
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
  saveButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F2F2F7',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarHint: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  debugText: {
    fontSize: 10,
    color: '#FF0000',
    textAlign: 'center',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  formSection: {
    paddingHorizontal: 20,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2E',
  },
  characterCount: {
    fontSize: 12,
    color: '#8E8E93',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
    color: '#2C2C2E',
  },
  textInputMultiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  textInputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 4,
  },
  dangerSection: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    marginTop: 32,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5EA',
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF3B30',
    marginBottom: 16,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B3020',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 8,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FF3B30',
  },
  dangerHint: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#007AFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C2C2E',
  },
  modalDeleteButton: {
    padding: 4,
  },
  modalDeleteText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FF3B30',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalWarning: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalDescription: {
    fontSize: 16,
    color: '#2C2C2E',
    marginBottom: 16,
  },
  modalList: {
    marginBottom: 24,
  },
  modalListItem: {
    fontSize: 16,
    color: '#2C2C2E',
    marginBottom: 8,
    lineHeight: 22,
  },
  modalFooter: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
});