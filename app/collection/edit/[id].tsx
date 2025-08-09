import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Check, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { 
  getCurrentUser, 
  updateCollection 
} from '@/lib/supabase';

// Responsive design constants
const { width: screenWidth } = Dimensions.get('window');
const isSmallDevice = screenWidth < 375;

interface Collection {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  color: string;
  is_public: boolean;
  cover_image?: string;
  created_at: string;
  updated_at: string;
}

export default function EditCollectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#007AFF');

  const colorOptions = [
    '#007AFF', '#34C759', '#FF9500', '#FF3B30',
    '#AF52DE', '#00C7BE', '#FF2D92', '#A2845E'
  ];

  useEffect(() => {
    loadCollection();
  }, [id]);

  const loadCollection = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      
      // Get current user
      const user = await getCurrentUser();
      if (!user) {
        router.replace('/auth/login');
        return;
      }
      setCurrentUser(user);

      // Load collection details - you'll need to implement this function
      console.log('Loading collection for edit:', id);
      
      // For now, mock the collection data
      // In a real implementation: const collection = await getUserCollectionById(id);
      
      // Mock data for demonstration
      setName('Sample Collection');
      setDescription('This is a sample collection description');
      setIsPublic(false);
      setSelectedColor('#007AFF');
      
    } catch (error) {
      console.error('Error loading collection:', error);
      Alert.alert('Error', 'Failed to load collection details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Collection name is required.');
      return;
    }

    if (!id || !currentUser) return;

    setSaving(true);
    try {
      const updates = {
        name: name.trim(),
        description: description.trim(),
        is_public: isPublic,
        color: selectedColor,
        updated_at: new Date().toISOString(),
      };

      console.log('Updating collection:', id, updates);
      
      // In a real implementation:
      // const { error } = await updateCollection(id, updates);
      // if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Collection updated successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
      
    } catch (error) {
      console.error('Error updating collection:', error);
      Alert.alert('Error', 'Failed to update collection. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={handleCancel}>
            <ArrowLeft size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading collection...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleCancel}>
          <X size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Collection</Text>
        <TouchableOpacity 
          style={[styles.headerButton, styles.saveButton, !name.trim() && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!name.trim() || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Check size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>Collection Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter collection name"
            placeholderTextColor="#8E8E93"
            maxLength={50}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Add a description..."
            placeholderTextColor="#8E8E93"
            multiline
            numberOfLines={3}
            maxLength={200}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.label}>Make Public</Text>
              <Text style={styles.helpText}>Others can discover and save this collection</Text>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ false: '#E5E5E7', true: '#34C759' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Collection Color</Text>
          <View style={styles.colorGrid}>
            {colorOptions.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  selectedColor === color && styles.colorOptionSelected
                ]}
                onPress={() => {
                  setSelectedColor(color);
                  Haptics.selectionAsync();
                }}
              />
            ))}
          </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E7',
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
    }),
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonDisabled: {
    backgroundColor: '#8E8E93',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    letterSpacing: Platform.OS === 'ios' ? -0.3 : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  content: {
    flex: 1,
    padding: isSmallDevice ? 12 : 16,
  },
  section: {
    marginBottom: isSmallDevice ? 20 : 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 8,
  },
  input: {
    borderWidth: Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 1,
    borderColor: '#E5E5E7',
    borderRadius: Platform.OS === 'ios' ? 10 : 12,
    padding: isSmallDevice ? 14 : 16,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
    color: '#1D1D1F',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
      },
    }),
  },
  textArea: {
    height: isSmallDevice ? 70 : 80,
    textAlignVertical: 'top',
    paddingTop: isSmallDevice ? 12 : 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  helpText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isSmallDevice ? 10 : 12,
    justifyContent: 'flex-start',
  },
  colorOption: {
    width: isSmallDevice ? 36 : 40,
    height: isSmallDevice ? 36 : 40,
    borderRadius: isSmallDevice ? 18 : 20,
    borderWidth: 3,
    borderColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  colorOptionSelected: {
    borderColor: '#007AFF',
  },
});