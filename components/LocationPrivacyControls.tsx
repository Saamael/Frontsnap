import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { 
  MapPin, 
  Shield, 
  Users, 
  Globe,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react-native';
import { 
  LocationPrivacySettings, 
  getLocationPrivacySettings, 
  updateLocationPrivacySettings,
  updateUserLocation
} from '@/lib/supabase';
import { HapticFeedback } from '@/utils/haptics';
import { useToast } from '@/hooks/useToast';
import * as Location from 'expo-location';

interface LocationPrivacyControlsProps {
  onSettingsChange?: (settings: LocationPrivacySettings) => void;
}

export const LocationPrivacyControls: React.FC<LocationPrivacyControlsProps> = ({
  onSettingsChange
}) => {
  const { showSuccess, showError } = useToast();
  const [settings, setSettings] = useState<LocationPrivacySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string>('');

  useEffect(() => {
    loadSettings();
    getCurrentLocation();
  }, []);

  const loadSettings = async () => {
    try {
      const privacySettings = await getLocationPrivacySettings();
      setSettings(privacySettings);
      onSettingsChange?.(privacySettings);
    } catch (error) {
      console.error('Error loading location settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        
        if (reverseGeocode.length > 0) {
          const { city, region, country } = reverseGeocode[0];
          const locationString = [city, region, country].filter(Boolean).join(', ');
          setCurrentLocation(locationString);
        }
      }
    } catch (error) {
      console.log('Error getting location:', error);
    }
  };

  const updateSetting = async <K extends keyof LocationPrivacySettings>(
    key: K,
    value: LocationPrivacySettings[K]
  ) => {
    if (!settings) return;

    HapticFeedback.light();
    setIsUpdating(true);

    try {
      const result = await updateLocationPrivacySettings({ [key]: value });
      
      if (result.success) {
        const updatedSettings = { ...settings, [key]: value };
        setSettings(updatedSettings);
        onSettingsChange?.(updatedSettings);
        showSuccess('Updated', 'Location privacy settings updated');
      } else {
        showError('Update Failed', result.error || 'Failed to update settings');
      }
    } catch (error) {
      showError('Error', 'Failed to update location settings');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateLocation = async () => {
    HapticFeedback.medium();
    setIsUpdating(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission',
          'Please enable location permissions to update your location.',
          [{ text: 'OK' }]
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverseGeocode.length > 0) {
        const { city, region, country } = reverseGeocode[0];
        const cityName = city || region || 'Unknown';
        const countryName = country || 'Unknown';

        const result = await updateUserLocation(
          cityName,
          countryName,
          location.coords.latitude,
          location.coords.longitude,
          location.coords.accuracy || undefined
        );

        if (result.success) {
          const locationString = [cityName, region, countryName].filter(Boolean).join(', ');
          setCurrentLocation(locationString);
          showSuccess('Location Updated', `Current location: ${cityName}, ${countryName}`);
        } else {
          showError('Update Failed', result.error || 'Failed to update location');
        }
      }
    } catch (error) {
      showError('Error', 'Failed to get current location');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading privacy settings...</Text>
      </View>
    );
  }

  if (!settings) {
    return (
      <View style={styles.errorContainer}>
        <Shield size={48} color="#C7C7CC" strokeWidth={1} />
        <Text style={styles.errorTitle}>Privacy Settings Unavailable</Text>
        <Text style={styles.errorText}>
          Unable to load location privacy settings
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <MapPin size={24} color="#007AFF" strokeWidth={2} />
        <Text style={styles.headerTitle}>Location Privacy</Text>
      </View>

      {/* Current Location */}
      {currentLocation && (
        <View style={styles.currentLocationCard}>
          <View style={styles.locationInfo}>
            <Text style={styles.locationLabel}>Current Location</Text>
            <Text style={styles.locationText}>{currentLocation}</Text>
          </View>
          <TouchableOpacity 
            style={styles.updateButton}
            onPress={handleUpdateLocation}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Settings size={16} color="#007AFF" strokeWidth={2} />
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Privacy Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sharing Preferences</Text>

        {/* Share with Friends */}
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Users size={20} color="#34C759" strokeWidth={2} />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Share City with Friends</Text>
              <Text style={styles.settingDescription}>
                Let your friends see what city you're in
              </Text>
            </View>
          </View>
          <Switch
            value={settings.share_city_with_friends}
            onValueChange={(value) => updateSetting('share_city_with_friends', value)}
            disabled={isUpdating}
            trackColor={{ false: '#E5E5EA', true: '#34C75930' }}
            thumbColor={settings.share_city_with_friends ? '#34C759' : '#FFFFFF'}
          />
        </View>

        {/* Share Publicly */}
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Globe size={20} color="#FF9500" strokeWidth={2} />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Share City Publicly</Text>
              <Text style={styles.settingDescription}>
                Show your city to all FrontSnap users
              </Text>
            </View>
          </View>
          <Switch
            value={settings.share_city_publicly}
            onValueChange={(value) => updateSetting('share_city_publicly', value)}
            disabled={isUpdating}
            trackColor={{ false: '#E5E5EA', true: '#FF950030' }}
            thumbColor={settings.share_city_publicly ? '#FF9500' : '#FFFFFF'}
          />
        </View>

        {/* Nearby Suggestions */}
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <MapPin size={20} color="#007AFF" strokeWidth={2} />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Nearby Friend Suggestions</Text>
              <Text style={styles.settingDescription}>
                Get suggestions for friends near your location
              </Text>
            </View>
          </View>
          <Switch
            value={settings.allow_nearby_suggestions}
            onValueChange={(value) => updateSetting('allow_nearby_suggestions', value)}
            disabled={isUpdating}
            trackColor={{ false: '#E5E5EA', true: '#007AFF30' }}
            thumbColor={settings.allow_nearby_suggestions ? '#007AFF' : '#FFFFFF'}
          />
        </View>

        {/* Auto Update */}
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Settings size={20} color="#8E8E93" strokeWidth={2} />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Auto-Update Location</Text>
              <Text style={styles.settingDescription}>
                Automatically update your city when you travel
              </Text>
            </View>
          </View>
          <Switch
            value={settings.auto_update_location}
            onValueChange={(value) => updateSetting('auto_update_location', value)}
            disabled={isUpdating}
            trackColor={{ false: '#E5E5EA', true: '#8E8E9330' }}
            thumbColor={settings.auto_update_location ? '#8E8E93' : '#FFFFFF'}
          />
        </View>
      </View>

      {/* Privacy Notice */}
      <View style={styles.privacyNotice}>
        <Shield size={16} color="#8E8E93" strokeWidth={2} />
        <Text style={styles.privacyText}>
          Your location data is encrypted and only shared according to your preferences. 
          You can change these settings anytime.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C2C2E',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C2C2E',
    marginLeft: 12,
  },
  currentLocationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C2C2E',
  },
  updateButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF10',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF30',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2E',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  settingInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    flex: 1,
    marginLeft: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C2C2E',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#8E8E93',
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 8,
    lineHeight: 18,
  },
});