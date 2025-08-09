import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Camera, Upload, RotateCcw } from 'lucide-react-native';
import { CameraView as ExpoCameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { CameraErrorBoundary } from '@/components/ErrorBoundary';

interface CameraViewProps {
  onPhotoTaken: (imageUri: string) => void;
  onImageSelected: (imageUri: string) => void;
  isAnalyzing?: boolean;
}

export const CameraView: React.FC<CameraViewProps> = ({
  onPhotoTaken,
  onImageSelected,
  isAnalyzing = false,
}) => {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<ExpoCameraView>(null);

  const handlePermissionRequest = async () => {
    try {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Camera Permission Required',
          'FrontSnap needs camera access to take photos of places. Please enable camera permissions in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => requestPermission() }
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      Alert.alert('Error', 'Failed to request camera permission. Please try again.');
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing || isAnalyzing) return;

    try {
      setIsCapturing(true);
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: false,
      });

      if (photo?.uri) {
        console.log('📸 Photo captured:', {
          uri: photo.uri,
          width: photo.width,
          height: photo.height,
        });
        onPhotoTaken(photo.uri);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const selectFromGallery = async () => {
    if (isAnalyzing) return;

    try {
      // Request permission first
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert(
          'Gallery Permission Required',
          'Please allow access to your photo library to select images.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Try Again', onPress: selectFromGallery }
          ]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const selectedImage = result.assets[0];
        console.log('🖼️ Image selected from gallery:', {
          uri: selectedImage.uri,
          width: selectedImage.width,
          height: selectedImage.height,
        });
        onImageSelected(selectedImage.uri);
      }
    } catch (error) {
      console.error('Error selecting from gallery:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  // Loading state
  if (permission === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading camera...</Text>
      </View>
    );
  }

  // Permission denied state
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Camera size={64} color="#8E8E93" strokeWidth={1.5} />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionMessage}>
          FrontSnap needs camera access to take photos of places and identify them for you.
        </Text>
        <TouchableOpacity 
          style={styles.permissionButton} 
          onPress={handlePermissionRequest}
          accessibilityLabel="Grant camera permission"
          accessibilityRole="button"
        >
          <Text style={styles.permissionButtonText}>Enable Camera</Text>
        </TouchableOpacity>
        
        <Text style={styles.orText}>or</Text>
        
        <TouchableOpacity 
          style={styles.galleryButton} 
          onPress={selectFromGallery}
          accessibilityLabel="Select image from gallery"
          accessibilityRole="button"
        >
          <Upload size={20} color="#007AFF" strokeWidth={2} />
          <Text style={styles.galleryButtonText}>Choose from Gallery</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <CameraErrorBoundary>
      <View style={styles.container}>
        <ExpoCameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          animateShutter={false}
        />
        
        {/* Camera Controls Overlay - Outside CameraView */}
        <View style={styles.overlay}>
          {/* Top Controls */}
          <View style={styles.topControls}>
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={toggleCameraFacing}
              accessibilityLabel="Switch camera"
              accessibilityRole="button"
            >
              <RotateCcw size={24} color="#FFFFFF" strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>
              {isAnalyzing ? 'Analyzing...' : 'Capture a Storefront'}
            </Text>
            <Text style={styles.instructionsText}>
              {isAnalyzing 
                ? 'Please wait while we identify the place'
                : 'Point your camera at a restaurant, shop, or business and tap the capture button'
              }
            </Text>
          </View>

          {/* Bottom Controls */}
          <View style={styles.bottomControls}>
            <TouchableOpacity 
              style={styles.galleryButton}
              onPress={selectFromGallery}
              disabled={isAnalyzing}
              accessibilityLabel="Select from gallery"
              accessibilityRole="button"
            >
              <Upload size={24} color={isAnalyzing ? "#8E8E93" : "#FFFFFF"} strokeWidth={2} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.captureButton,
                (isCapturing || isAnalyzing) && styles.captureButtonDisabled
              ]}
              onPress={takePicture}
              disabled={isCapturing || isAnalyzing}
              accessibilityLabel="Take photo"
              accessibilityRole="button"
            >
              {isCapturing ? (
                <ActivityIndicator size="large" color="#FFFFFF" />
              ) : (
                <View style={styles.captureButtonInner} />
              )}
            </TouchableOpacity>

            <View style={styles.placeholder} />
          </View>
        </View>

        {/* Analysis Loading Overlay */}
        {isAnalyzing && (
          <View style={styles.analysisOverlay}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.analysisText}>Analyzing photo...</Text>
          </View>
        )}
      </View>
    </CameraErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  permissionMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 16,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  orText: {
    color: '#8E8E93',
    fontSize: 16,
    marginBottom: 16,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    paddingTop: 60,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  instructionsTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  instructionsText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 32,
    paddingBottom: 48,
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  galleryButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  captureButtonDisabled: {
    backgroundColor: '#8E8E93',
    borderColor: 'rgba(142, 142, 147, 0.3)',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },
  placeholder: {
    width: 50,
  },
  analysisOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analysisText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
});