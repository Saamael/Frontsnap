import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  PanGestureHandler,
  State,
  Animated,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { X, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface CollectionFormData {
  name: string;
  description: string;
  isPublic: boolean;
  color: string;
}

interface CollectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: CollectionFormData) => Promise<void>;
  initialData?: Partial<CollectionFormData>;
  title?: string;
  mode: 'create' | 'edit';
}

export const CollectionModal: React.FC<CollectionModalProps> = ({
  visible,
  onClose,
  onSave,
  initialData,
  title,
  mode = 'create',
}) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  // Form state
  const [formData, setFormData] = useState<CollectionFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    isPublic: initialData?.isPublic || false,
    color: initialData?.color || '#007AFF',
  });
  const [isLoading, setIsLoading] = useState(false);
  
  // Animation values
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const panGestureRef = useRef(null);

  // Color options with better accessibility
  const colorOptions = [
    { color: '#007AFF', name: 'Blue' },
    { color: '#34C759', name: 'Green' },
    { color: '#FF9500', name: 'Orange' },
    { color: '#FF3B30', name: 'Red' },
    { color: '#AF52DE', name: 'Purple' },
    { color: '#00C7BE', name: 'Teal' },
    { color: '#FF2D92', name: 'Pink' },
    { color: '#A2845E', name: 'Brown' },
  ];

  // Animation handlers
  const showModal = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateY, opacity]);

  const hideModal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: screenHeight,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      // Reset form
      setFormData({
        name: '',
        description: '',
        isPublic: false,
        color: '#007AFF',
      });
    });
  }, [translateY, opacity, screenHeight, onClose]);

  // Pan gesture handler for dismiss
  const onGestureEvent = useCallback(
    Animated.event(
      [{ nativeEvent: { translationY: translateY } }],
      { 
        useNativeDriver: true,
        listener: (event) => {
          if (event.nativeEvent.translationY > 0) {
            opacity.setValue(Math.max(0, 1 - event.nativeEvent.translationY / 200));
          }
        }
      }
    ),
    [translateY, opacity]
  );

  const onHandlerStateChange = useCallback(
    (event) => {
      if (event.nativeEvent.oldState === State.ACTIVE) {
        const { translationY, velocityY } = event.nativeEvent;
        
        if (translationY > 100 || velocityY > 500) {
          hideModal();
        } else {
          showModal();
        }
      }
    },
    [hideModal, showModal]
  );

  // Form handlers
  const updateFormData = useCallback((key: keyof CollectionFormData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);
    try {
      await onSave(formData);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      hideModal();
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  // Effect to trigger animation when modal becomes visible
  React.useEffect(() => {
    if (visible) {
      showModal();
    } else {
      translateY.setValue(screenHeight);
      opacity.setValue(0);
    }
  }, [visible, showModal, translateY, opacity, screenHeight]);

  const isFormValid = formData.name.trim().length > 0;
  const modalTitle = title || (mode === 'create' ? 'New Collection' : 'Edit Collection');

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      onRequestClose={hideModal}
    >
      {/* Background blur/overlay */}
      <Animated.View style={[styles.overlay, { opacity }]}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={20} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.androidOverlay]} />
        )}
      </Animated.View>

      {/* Modal content */}
      <PanGestureHandler
        ref={panGestureRef}
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetY={10}
        failOffsetX={[-20, 20]}
      >
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY }],
              paddingTop: insets.top,
            },
          ]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoid}
          >
            <SafeAreaView style={styles.safeArea}>
              {/* Handle bar */}
              <View style={styles.handleBar} />
              
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={hideModal}
                  accessibilityRole="button"
                  accessibilityLabel="Close modal"
                >
                  <X size={24} color="#8E8E93" strokeWidth={2} />
                </TouchableOpacity>
                
                <Text style={styles.headerTitle}>{modalTitle}</Text>
                
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    !isFormValid && styles.saveButtonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={!isFormValid || isLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Save collection"
                  accessibilityState={{ disabled: !isFormValid || isLoading }}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Check size={20} color="#FFFFFF" strokeWidth={2} />
                  )}
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {/* Collection Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Collection Name</Text>
                  <TextInput
                    style={[styles.textInput, !formData.name.trim() && styles.textInputError]}
                    value={formData.name}
                    onChangeText={(text) => updateFormData('name', text)}
                    placeholder="Enter collection name"
                    placeholderTextColor="#8E8E93"
                    maxLength={50}
                    returnKeyType="next"
                    accessibilityLabel="Collection name"
                    accessibilityHint="Required field"
                  />
                </View>

                {/* Description */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Description (Optional)</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={formData.description}
                    onChangeText={(text) => updateFormData('description', text)}
                    placeholder="Add a description..."
                    placeholderTextColor="#8E8E93"
                    multiline
                    numberOfLines={3}
                    maxLength={200}
                    textAlignVertical="top"
                    returnKeyType="done"
                    accessibilityLabel="Collection description"
                  />
                </View>

                {/* Privacy Toggle */}
                <View style={styles.inputGroup}>
                  <View style={styles.switchContainer}>
                    <View style={styles.switchLeft}>
                      <Text style={styles.label}>Make Public</Text>
                      <Text style={styles.helpText}>
                        Others can discover and save this collection
                      </Text>
                    </View>
                    <Switch
                      value={formData.isPublic}
                      onValueChange={(value) => {
                        updateFormData('isPublic', value);
                        Haptics.selectionAsync();
                      }}
                      trackColor={{ 
                        false: '#E5E5E7', 
                        true: '#34C759' 
                      }}
                      thumbColor="#FFFFFF"
                      accessibilityLabel="Make collection public"
                    />
                  </View>
                </View>

                {/* Color Selection */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Collection Color</Text>
                  <View style={styles.colorGrid}>
                    {colorOptions.map(({ color, name }) => (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorOption,
                          { backgroundColor: color },
                          formData.color === color && styles.colorOptionSelected,
                        ]}
                        onPress={() => {
                          updateFormData('color', color);
                          Haptics.selectionAsync();
                        }}
                        accessibilityRole="radio"
                        accessibilityLabel={`${name} color`}
                        accessibilityState={{ selected: formData.color === color }}
                      />
                    ))}
                  </View>
                </View>
              </ScrollView>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </Animated.View>
      </PanGestureHandler>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  androidOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginTop: 60,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  keyboardAvoid: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  handleBar: {
    width: 36,
    height: 4,
    backgroundColor: '#C7C7CC',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E7',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    ...Platform.select({
      ios: {
        letterSpacing: -0.2,
      },
    }),
  },
  saveButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
    }),
  },
  saveButtonDisabled: {
    backgroundColor: '#C7C7CC',
    ...Platform.select({
      ios: {
        shadowOpacity: 0,
      },
    }),
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 8,
    ...Platform.select({
      ios: {
        letterSpacing: -0.2,
      },
    }),
  },
  textInput: {
    borderWidth: Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 1,
    borderColor: '#E5E5E7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
    color: '#1D1D1F',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
      },
    }),
  },
  textInputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLeft: {
    flex: 1,
    marginRight: 16,
  },
  helpText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
    lineHeight: 18,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'flex-start',
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  colorOptionSelected: {
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowOpacity: 0.25,
        shadowRadius: 5,
      },
    }),
  },
});