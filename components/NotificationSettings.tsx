import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import PushNotificationManager, { 
  NotificationCategory, 
  NotificationSettings as NotificationSettingsType 
} from '../lib/push-notifications';

interface NotificationSettingsProps {
  onClose?: () => void;
}

export default function NotificationSettings({ onClose }: NotificationSettingsProps) {
  const [settings, setSettings] = useState<NotificationSettingsType | null>(null);
  const [systemPermission, setSystemPermission] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
    checkSystemPermission();
  }, []);

  const loadSettings = async () => {
    try {
      const currentSettings = await PushNotificationManager.getSettings();
      setSettings(currentSettings);
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkSystemPermission = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setSystemPermission(status === 'granted');
    } catch (error) {
      console.error('Error checking notification permission:', error);
    }
  };

  const updateSetting = async (
    key: keyof NotificationSettingsType,
    value: boolean | NotificationSettingsType['categories']
  ) => {
    if (!settings) return;

    try {
      const newSettings = {
        ...settings,
        [key]: value,
      };

      await PushNotificationManager.updateSettings(newSettings);
      setSettings(newSettings);
    } catch (error) {
      console.error('Error updating notification setting:', error);
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };

  const updateCategorySetting = async (category: NotificationCategory, enabled: boolean) => {
    if (!settings) return;

    const newCategories = {
      ...settings.categories,
      [category]: enabled,
    };

    await updateSetting('categories', newCategories);
  };

  const requestSystemPermission = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
        },
      });

      if (status === 'granted') {
        setSystemPermission(true);
        await PushNotificationManager.initialize();
        Alert.alert('Success', 'Notification permissions granted');
      } else {
        Alert.alert(
          'Permission Denied',
          'You can enable notifications in your device settings',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      Alert.alert('Error', 'Failed to request notification permission');
    }
  };

  const SettingRow = ({ 
    title, 
    description, 
    value, 
    onValueChange, 
    disabled = false,
    icon 
  }: {
    title: string;
    description?: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    disabled?: boolean;
    icon?: string;
  }) => (
    <View style={[styles.settingRow, disabled && styles.settingRowDisabled]}>
      <View style={styles.settingContent}>
        {icon && (
          <Ionicons 
            name={icon as any} 
            size={24} 
            color={disabled ? '#CCC' : '#007AFF'} 
            style={styles.settingIcon}
          />
        )}
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, disabled && styles.disabledText]}>
            {title}
          </Text>
          {description && (
            <Text style={[styles.settingDescription, disabled && styles.disabledText]}>
              {description}
            </Text>
          )}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
        thumbColor="#FFFFFF"
      />
    </View>
  );

  if (loading || !settings) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading notification settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notification Settings</Text>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        {/* System Permission Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Permissions</Text>
          <View style={styles.permissionCard}>
            <View style={styles.permissionContent}>
              <Ionicons 
                name={systemPermission ? "checkmark-circle" : "alert-circle"} 
                size={24} 
                color={systemPermission ? "#34C759" : "#FF9500"} 
              />
              <View style={styles.permissionText}>
                <Text style={styles.permissionTitle}>
                  {systemPermission ? 'Notifications Enabled' : 'Notifications Disabled'}
                </Text>
                <Text style={styles.permissionDescription}>
                  {systemPermission 
                    ? 'You will receive push notifications from FrontSnap'
                    : 'Enable system notifications to receive updates'
                  }
                </Text>
              </View>
            </View>
            {!systemPermission && (
              <TouchableOpacity 
                style={styles.enableButton} 
                onPress={requestSystemPermission}
              >
                <Text style={styles.enableButtonText}>Enable</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Main Toggle */}
        <View style={styles.section}>
          <SettingRow
            title="Enable Notifications"
            description="Receive notifications from FrontSnap"
            value={settings.enabled && systemPermission}
            onValueChange={(value) => updateSetting('enabled', value)}
            disabled={!systemPermission}
            icon="notifications"
          />
        </View>

        {/* Notification Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Types</Text>
          
          <SettingRow
            title="New Places"
            description="When friends discover new places near you"
            value={settings.categories[NotificationCategory.NEW_PLACE]}
            onValueChange={(value) => updateCategorySetting(NotificationCategory.NEW_PLACE, value)}
            disabled={!settings.enabled || !systemPermission}
            icon="location"
          />

          <SettingRow
            title="Friend Activity"
            description="When friends save places or create collections"
            value={settings.categories[NotificationCategory.FRIEND_ACTIVITY]}
            onValueChange={(value) => updateCategorySetting(NotificationCategory.FRIEND_ACTIVITY, value)}
            disabled={!settings.enabled || !systemPermission}
            icon="people"
          />

          <SettingRow
            title="Collection Updates"
            description="Updates about your collections and saved places"
            value={settings.categories[NotificationCategory.COLLECTION_UPDATE]}
            onValueChange={(value) => updateCategorySetting(NotificationCategory.COLLECTION_UPDATE, value)}
            disabled={!settings.enabled || !systemPermission}
            icon="bookmark"
          />

          <SettingRow
            title="Nearby Places"
            description="Discover interesting places around you"
            value={settings.categories[NotificationCategory.NEARBY_PLACES]}
            onValueChange={(value) => updateCategorySetting(NotificationCategory.NEARBY_PLACES, value)}
            disabled={!settings.enabled || !systemPermission}
            icon="compass"
          />

          <SettingRow
            title="System Updates"
            description="Important app updates and announcements"
            value={settings.categories[NotificationCategory.SYSTEM]}
            onValueChange={(value) => updateCategorySetting(NotificationCategory.SYSTEM, value)}
            disabled={!settings.enabled || !systemPermission}
            icon="information-circle"
          />
        </View>

        {/* Notification Behavior */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Behavior</Text>
          
          <SettingRow
            title="Sound"
            description="Play sound for notifications"
            value={settings.soundEnabled}
            onValueChange={(value) => updateSetting('soundEnabled', value)}
            disabled={!settings.enabled || !systemPermission}
            icon="volume-high"
          />

          <SettingRow
            title="Badge"
            description="Show badge count on app icon"
            value={settings.badgeEnabled}
            onValueChange={(value) => updateSetting('badgeEnabled', value)}
            disabled={!settings.enabled || !systemPermission}
            icon="radio-button-on"
          />

          <SettingRow
            title="Show Previews"
            description="Show notification content in preview"
            value={settings.previewEnabled}
            onValueChange={(value) => updateSetting('previewEnabled', value)}
            disabled={!settings.enabled || !systemPermission}
            icon="eye"
          />
        </View>

        {/* Help Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Help</Text>
          <TouchableOpacity 
            style={styles.helpRow}
            onPress={() => Linking.openSettings()}
          >
            <Ionicons name="settings" size={20} color="#666" />
            <Text style={styles.helpText}>Open System Settings</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          
          <View style={styles.helpRow}>
            <Ionicons name="information-circle" size={20} color="#666" />
            <Text style={styles.helpText}>
              You can always change these settings later in your profile
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    marginTop: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  permissionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  permissionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  permissionText: {
    marginLeft: 12,
    flex: 1,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  permissionDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  enableButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  enableButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingRowDisabled: {
    opacity: 0.5,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  disabledText: {
    color: '#CCC',
  },
  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
});