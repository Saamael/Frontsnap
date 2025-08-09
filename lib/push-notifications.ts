import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  PUSH_TOKEN: 'push_token',
  NOTIFICATION_SETTINGS: 'notification_settings',
  LAST_TOKEN_UPDATE: 'last_token_update',
} as const;

// Notification categories
export enum NotificationCategory {
  NEW_PLACE = 'new_place',
  FRIEND_ACTIVITY = 'friend_activity',
  COLLECTION_UPDATE = 'collection_update',
  NEARBY_PLACES = 'nearby_places',
  SYSTEM = 'system',
}

// Notification settings interface
export interface NotificationSettings {
  enabled: boolean;
  categories: {
    [NotificationCategory.NEW_PLACE]: boolean;
    [NotificationCategory.FRIEND_ACTIVITY]: boolean;
    [NotificationCategory.COLLECTION_UPDATE]: boolean;
    [NotificationCategory.NEARBY_PLACES]: boolean;
    [NotificationCategory.SYSTEM]: boolean;
  };
  soundEnabled: boolean;
  badgeEnabled: boolean;
  previewEnabled: boolean;
}

// Default notification settings
const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  categories: {
    [NotificationCategory.NEW_PLACE]: true,
    [NotificationCategory.FRIEND_ACTIVITY]: true,
    [NotificationCategory.COLLECTION_UPDATE]: true,
    [NotificationCategory.NEARBY_PLACES]: false, // Disabled by default to avoid spam
    [NotificationCategory.SYSTEM]: true,
  },
  soundEnabled: true,
  badgeEnabled: true,
  previewEnabled: true,
};

export class PushNotificationManager {
  private static token: string | null = null;
  private static settings: NotificationSettings = DEFAULT_SETTINGS;

  /**
   * Initialize push notifications
   */
  static async initialize(): Promise<void> {
    try {
      // Configure notification handler
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          const settings = await this.getSettings();
          
          return {
            shouldShowAlert: settings.enabled,
            shouldPlaySound: settings.enabled && settings.soundEnabled,
            shouldSetBadge: settings.enabled && settings.badgeEnabled,
          };
        },
      });

      // Register for push notifications
      await this.registerForPushNotifications();

      // Load saved settings
      await this.loadSettings();

      console.log('📱 Push notifications initialized');
    } catch (error) {
      console.error('❌ Error initializing push notifications:', error);
    }
  }

  /**
   * Register for push notifications and get token
   */
  static async registerForPushNotifications(): Promise<string | null> {
    try {
      // Check if device supports push notifications
      if (!Device.isDevice) {
        console.warn('Push notifications require a physical device');
        return null;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: true,
          },
        });
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Push notification permission denied');
        return null;
      }

      // Get push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID || 'your-project-id',
      });

      const token = tokenData.data;
      this.token = token;

      // Cache token locally
      await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_TOKEN_UPDATE, Date.now().toString());

      // Configure notification channels for Android
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      console.log('📱 Push notification token:', token);
      return token;
    } catch (error) {
      console.error('❌ Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Setup Android notification channels
   */
  private static async setupAndroidChannels(): Promise<void> {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#007AFF',
    });

    await Notifications.setNotificationChannelAsync('new_places', {
      name: 'New Places',
      importance: Notifications.AndroidImportance.HIGH,
      description: 'Notifications about new places discovered near you',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#34C759',
    });

    await Notifications.setNotificationChannelAsync('social', {
      name: 'Social Activity',
      importance: Notifications.AndroidImportance.DEFAULT,
      description: 'Notifications about friend activity and interactions',
      vibrationPattern: [0, 150, 150, 150],
      lightColor: '#FF9500',
    });

    await Notifications.setNotificationChannelAsync('collections', {
      name: 'Collections',
      importance: Notifications.AndroidImportance.DEFAULT,
      description: 'Updates about your collections and saved places',
      vibrationPattern: [0, 200],
      lightColor: '#5856D6',
    });
  }

  /**
   * Get current push token
   */
  static async getToken(): Promise<string | null> {
    if (this.token) {
      return this.token;
    }

    // Try to load from storage
    try {
      const cachedToken = await AsyncStorage.getItem(STORAGE_KEYS.PUSH_TOKEN);
      if (cachedToken) {
        this.token = cachedToken;
        return cachedToken;
      }
    } catch (error) {
      console.error('Error loading cached push token:', error);
    }

    // Generate new token if none cached
    return await this.registerForPushNotifications();
  }

  /**
   * Send token to backend for user association
   */
  static async syncTokenWithBackend(userId: string): Promise<void> {
    try {
      const token = await this.getToken();
      if (!token) {
        console.warn('No push token available to sync');
        return;
      }

      // Here you would send the token to your backend
      console.log('📤 Syncing push token with backend for user:', userId);
      
      // Example API call:
      // await apiCall('/api/users/push-token', {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     userId,
      //     pushToken: token,
      //     platform: Platform.OS,
      //     deviceInfo: {
      //       brand: Device.brand,
      //       modelName: Device.modelName,
      //       osVersion: Device.osVersion,
      //     },
      //   }),
      // });

    } catch (error) {
      console.error('❌ Error syncing push token with backend:', error);
    }
  }

  /**
   * Schedule local notification
   */
  static async scheduleLocalNotification(
    title: string,
    body: string,
    data: any = {},
    category: NotificationCategory = NotificationCategory.SYSTEM,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string | null> {
    try {
      const settings = await this.getSettings();
      
      // Check if notifications are enabled for this category
      if (!settings.enabled || !settings.categories[category]) {
        console.log(`Notifications disabled for category: ${category}`);
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            ...data,
            category,
          },
          sound: settings.soundEnabled ? 'default' : false,
          badge: settings.badgeEnabled ? 1 : undefined,
        },
        trigger: trigger || null, // null = immediate
      });

      console.log('📱 Scheduled local notification:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('❌ Error scheduling local notification:', error);
      return null;
    }
  }

  /**
   * Cancel notification
   */
  static async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('❌ Cancelled notification:', notificationId);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  /**
   * Cancel all notifications
   */
  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('❌ Cancelled all notifications');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }

  /**
   * Get notification settings
   */
  static async getSettings(): Promise<NotificationSettings> {
    if (this.settings !== DEFAULT_SETTINGS) {
      return this.settings;
    }

    try {
      const settingsString = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
      if (settingsString) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(settingsString) };
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }

    return this.settings;
  }

  /**
   * Update notification settings
   */
  static async updateSettings(newSettings: Partial<NotificationSettings>): Promise<void> {
    try {
      this.settings = { ...this.settings, ...newSettings };
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(this.settings));
      console.log('💾 Updated notification settings');
    } catch (error) {
      console.error('Error updating notification settings:', error);
    }
  }

  /**
   * Load settings from storage
   */
  private static async loadSettings(): Promise<void> {
    try {
      const settingsString = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
      if (settingsString) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(settingsString) };
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
      this.settings = DEFAULT_SETTINGS;
    }
  }

  /**
   * Add notification response listener
   */
  static addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  /**
   * Add notification received listener
   */
  static addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
  }

  /**
   * Handle notification tap
   */
  static handleNotificationTap(response: Notifications.NotificationResponse): void {
    const { notification } = response;
    const { data } = notification.request.content;

    console.log('📱 Notification tapped:', data);

    // Handle different notification types
    switch (data.category) {
      case NotificationCategory.NEW_PLACE:
        // Navigate to place details
        console.log('Navigating to new place:', data.placeId);
        break;
      
      case NotificationCategory.FRIEND_ACTIVITY:
        // Navigate to social feed
        console.log('Navigating to social activity');
        break;
      
      case NotificationCategory.COLLECTION_UPDATE:
        // Navigate to collections
        console.log('Navigating to collections');
        break;
      
      case NotificationCategory.NEARBY_PLACES:
        // Navigate to map
        console.log('Navigating to nearby places');
        break;
      
      default:
        console.log('Unknown notification category:', data.category);
    }
  }

  /**
   * Clear badge count
   */
  static async clearBadge(): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Error clearing badge:', error);
    }
  }

  /**
   * Set badge count
   */
  static async setBadge(count: number): Promise<void> {
    try {
      const settings = await this.getSettings();
      if (settings.enabled && settings.badgeEnabled) {
        await Notifications.setBadgeCountAsync(count);
      }
    } catch (error) {
      console.error('Error setting badge:', error);
    }
  }
}

// ================================
// FRIEND ACTIVITY NOTIFICATIONS (Phase 4)
// ================================

export interface FriendActivityNotificationData {
  activityType: 'place_added' | 'place_saved' | 'collection_created' | 'review_added' | 'hidden_gem_found';
  friendName: string;
  friendId: string;
  placeName?: string;
  placeId?: string;
  collectionName?: string;
  collectionId?: string;
}

/**
 * Send notification for friend activity
 */
export async function sendFriendActivityNotification(
  userIds: string[],
  data: FriendActivityNotificationData
): Promise<void> {
  try {
    const settings = await PushNotificationManager.getSettings();
    
    // Don't send if friend activity notifications are disabled
    if (!settings.enabled || !settings.categories[NotificationCategory.FRIEND_ACTIVITY]) {
      return;
    }

    const { title, body } = getFriendActivityNotificationContent(data);

    for (const userId of userIds) {
      // Here you would typically call your backend API to send the push notification
      // For now, we'll use local notifications as a placeholder
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          categoryIdentifier: NotificationCategory.FRIEND_ACTIVITY,
          data: {
            type: 'friend_activity',
            activityType: data.activityType,
            friendId: data.friendId,
            placeId: data.placeId,
            collectionId: data.collectionId,
          },
          sound: settings.soundEnabled ? 'default' : undefined,
        },
        trigger: null, // Send immediately
      });
    }
  } catch (error) {
    console.error('Error sending friend activity notification:', error);
  }
}

/**
 * Generate notification content for friend activities
 */
function getFriendActivityNotificationContent(data: FriendActivityNotificationData): { title: string; body: string } {
  const { activityType, friendName, placeName, collectionName } = data;

  switch (activityType) {
    case 'place_added':
      return {
        title: '🆕 New Place Discovered',
        body: `${friendName} discovered ${placeName || 'a new place'}`,
      };
    case 'place_saved':
      return {
        title: '❤️ Friend Saved Place',
        body: `${friendName} saved ${placeName || 'a place'} to their collection`,
      };
    case 'collection_created':
      return {
        title: '📚 New Collection',
        body: `${friendName} created "${collectionName || 'a new collection'}"`,
      };
    case 'review_added':
      return {
        title: '⭐ New Review',
        body: `${friendName} reviewed ${placeName || 'a place'}`,
      };
    case 'hidden_gem_found':
      return {
        title: '💎 Hidden Gem Found!',
        body: `${friendName} discovered a hidden gem`,
      };
    default:
      return {
        title: '👥 Friend Activity',
        body: `${friendName} had some activity`,
      };
  }
}

/**
 * Send notification when someone follows you
 */
export async function sendNewFollowerNotification(
  userId: string,
  followerName: string,
  followerId: string
): Promise<void> {
  try {
    const settings = await PushNotificationManager.getSettings();
    
    if (!settings.enabled || !settings.categories[NotificationCategory.FRIEND_ACTIVITY]) {
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '👥 New Follower',
        body: `${followerName} started following you`,
        categoryIdentifier: NotificationCategory.FRIEND_ACTIVITY,
        data: {
          type: 'new_follower',
          followerId,
        },
        sound: settings.soundEnabled ? 'default' : undefined,
      },
      trigger: null,
    });
  } catch (error) {
    console.error('Error sending new follower notification:', error);
  }
}

export default PushNotificationManager;