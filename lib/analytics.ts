import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Storage keys for analytics
const ANALYTICS_STORAGE_KEYS = {
  SESSION_ID: 'analytics_session_id',
  USER_PROPERTIES: 'analytics_user_properties',
  PENDING_EVENTS: 'analytics_pending_events',
  LAST_SYNC: 'analytics_last_sync',
} as const;

// Event types
export enum AnalyticsEvent {
  // App lifecycle
  APP_OPEN = 'app_open',
  APP_BACKGROUND = 'app_background',
  APP_FOREGROUND = 'app_foreground',
  
  // User authentication
  USER_REGISTER = 'user_register',
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  
  // Place interactions
  PLACE_VIEW = 'place_view',
  PLACE_ADD = 'place_add',
  PLACE_SAVE = 'place_save',
  PLACE_UNSAVE = 'place_unsave',
  PLACE_SHARE = 'place_share',
  PLACE_DIRECTIONS = 'place_directions',
  PLACE_CALL = 'place_call',
  PLACE_WEBSITE = 'place_website',
  
  // Photo capture
  PHOTO_CAPTURE = 'photo_capture',
  PHOTO_SELECT = 'photo_select',
  PHOTO_RETAKE = 'photo_retake',
  PHOTO_ANALYSIS_START = 'photo_analysis_start',
  PHOTO_ANALYSIS_COMPLETE = 'photo_analysis_complete',
  PHOTO_ANALYSIS_ERROR = 'photo_analysis_error',
  
  // Map interactions
  MAP_VIEW = 'map_view',
  MAP_ZOOM = 'map_zoom',
  MAP_SEARCH = 'map_search',
  MAP_FILTER = 'map_filter',
  MAP_MARKER_TAP = 'map_marker_tap',
  
  // Search
  SEARCH_QUERY = 'search_query',
  SEARCH_RESULT_TAP = 'search_result_tap',
  SEARCH_NO_RESULTS = 'search_no_results',
  
  // Collections
  COLLECTION_CREATE = 'collection_create',
  COLLECTION_VIEW = 'collection_view',
  COLLECTION_EDIT = 'collection_edit',
  COLLECTION_DELETE = 'collection_delete',
  COLLECTION_SHARE = 'collection_share',
  
  // Social features
  FRIEND_ADD = 'friend_add',
  FRIEND_REMOVE = 'friend_remove',
  PROFILE_VIEW = 'profile_view',
  ACTIVITY_VIEW = 'activity_view',
  
  // Reviews
  REVIEW_ADD = 'review_add',
  REVIEW_EDIT = 'review_edit',
  REVIEW_DELETE = 'review_delete',
  REVIEW_VIEW = 'review_view',
  
  // Errors
  ERROR_NETWORK = 'error_network',
  ERROR_LOCATION = 'error_location',
  ERROR_CAMERA = 'error_camera',
  ERROR_PERMISSION = 'error_permission',
  ERROR_API = 'error_api',
}

// Event properties interface
export interface AnalyticsEventData {
  event: AnalyticsEvent;
  properties?: Record<string, any>;
  timestamp?: number;
  sessionId?: string;
  userId?: string;
}

// User properties interface
export interface UserProperties {
  userId?: string;
  email?: string;
  registrationDate?: string;
  totalPlaces?: number;
  totalCollections?: number;
  socialFeaturesEnabled?: boolean;
  lastActiveDate?: string;
  appVersion?: string;
  platform?: string;
  deviceModel?: string;
}

export class AnalyticsManager {
  private static instance: AnalyticsManager;
  private sessionId: string;
  private userId: string | null = null;
  private userProperties: UserProperties = {};
  private pendingEvents: AnalyticsEventData[] = [];
  private syncInProgress = false;

  private constructor() {
    this.sessionId = this.generateSessionId();
  }

  static getInstance(): AnalyticsManager {
    if (!AnalyticsManager.instance) {
      AnalyticsManager.instance = new AnalyticsManager();
    }
    return AnalyticsManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Load persisted data
      await this.loadPersistedData();
      
      // Track app open
      await this.track(AnalyticsEvent.APP_OPEN, {
        sessionId: this.sessionId,
        timestamp: Date.now(),
      });

      // Sync pending events
      await this.syncEvents();

      console.log('📊 Analytics initialized');
    } catch (error) {
      console.error('❌ Error initializing analytics:', error);
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async loadPersistedData(): Promise<void> {
    try {
      const [sessionId, userProperties, pendingEvents] = await Promise.all([
        AsyncStorage.getItem(ANALYTICS_STORAGE_KEYS.SESSION_ID),
        AsyncStorage.getItem(ANALYTICS_STORAGE_KEYS.USER_PROPERTIES),
        AsyncStorage.getItem(ANALYTICS_STORAGE_KEYS.PENDING_EVENTS),
      ]);

      if (sessionId) {
        this.sessionId = sessionId;
      } else {
        await AsyncStorage.setItem(ANALYTICS_STORAGE_KEYS.SESSION_ID, this.sessionId);
      }

      if (userProperties) {
        this.userProperties = JSON.parse(userProperties);
      }

      if (pendingEvents) {
        this.pendingEvents = JSON.parse(pendingEvents);
      }
    } catch (error) {
      console.error('Error loading persisted analytics data:', error);
    }
  }

  async setUserId(userId: string): Promise<void> {
    this.userId = userId;
    await this.setUserProperty('userId', userId);
  }

  async setUserProperty(key: keyof UserProperties, value: any): Promise<void> {
    try {
      this.userProperties[key] = value;
      await AsyncStorage.setItem(
        ANALYTICS_STORAGE_KEYS.USER_PROPERTIES,
        JSON.stringify(this.userProperties)
      );
    } catch (error) {
      console.error('Error setting user property:', error);
    }
  }

  async setUserProperties(properties: Partial<UserProperties>): Promise<void> {
    try {
      this.userProperties = { ...this.userProperties, ...properties };
      await AsyncStorage.setItem(
        ANALYTICS_STORAGE_KEYS.USER_PROPERTIES,
        JSON.stringify(this.userProperties)
      );
    } catch (error) {
      console.error('Error setting user properties:', error);
    }
  }

  async track(event: AnalyticsEvent, properties?: Record<string, any>): Promise<void> {
    try {
      const eventData: AnalyticsEventData = {
        event,
        properties: {
          ...properties,
          platform: 'mobile',
          sessionId: this.sessionId,
          userId: this.userId,
        },
        timestamp: Date.now(),
        sessionId: this.sessionId,
        userId: this.userId,
      };

      // Add to pending events
      this.pendingEvents.push(eventData);

      // Persist pending events
      await AsyncStorage.setItem(
        ANALYTICS_STORAGE_KEYS.PENDING_EVENTS,
        JSON.stringify(this.pendingEvents)
      );

      // Try to sync immediately if not already syncing
      if (!this.syncInProgress) {
        this.syncEvents().catch(console.error);
      }

      console.log('📊 Analytics event tracked:', event, properties);
    } catch (error) {
      console.error('Error tracking analytics event:', error);
    }
  }

  private async syncEvents(): Promise<void> {
    if (this.syncInProgress || this.pendingEvents.length === 0) {
      return;
    }

    this.syncInProgress = true;

    try {
      // Batch events for sending
      const eventsToSend = [...this.pendingEvents];
      
      // Send to analytics backend (implement your preferred analytics service)
      await this.sendEventsToBackend(eventsToSend);

      // Clear pending events on successful send
      this.pendingEvents = [];
      await AsyncStorage.setItem(
        ANALYTICS_STORAGE_KEYS.PENDING_EVENTS,
        JSON.stringify(this.pendingEvents)
      );

      // Update last sync time
      await AsyncStorage.setItem(
        ANALYTICS_STORAGE_KEYS.LAST_SYNC,
        Date.now().toString()
      );

      console.log(`📊 Synced ${eventsToSend.length} analytics events`);
    } catch (error) {
      console.error('Error syncing analytics events:', error);
      // Events remain in pending queue for retry
    } finally {
      this.syncInProgress = false;
    }
  }

  private async sendEventsToBackend(events: AnalyticsEventData[]): Promise<void> {
    try {
      // Store events in Supabase analytics table
      const { error } = await supabase
        .from('analytics_events')
        .insert(
          events.map(event => ({
            event_type: event.event,
            properties: event.properties,
            user_id: event.userId,
            session_id: event.sessionId,
            timestamp: new Date(event.timestamp || Date.now()).toISOString(),
          }))
        );

      if (error) throw error;

      // Also send to external analytics service if configured
      // await this.sendToExternalAnalytics(events);
    } catch (error) {
      console.error('Error sending events to backend:', error);
      throw error;
    }
  }

  // Convenience methods for common events
  async trackPlaceView(placeId: string, placeName?: string): Promise<void> {
    await this.track(AnalyticsEvent.PLACE_VIEW, {
      placeId,
      placeName,
    });
  }

  async trackPlaceAdd(placeId: string, placeName?: string, category?: string): Promise<void> {
    await this.track(AnalyticsEvent.PLACE_ADD, {
      placeId,
      placeName,
      category,
    });
  }

  async trackPhotoCapture(analysisTime?: number): Promise<void> {
    await this.track(AnalyticsEvent.PHOTO_CAPTURE, {
      analysisTime,
    });
  }

  async trackSearch(query: string, resultCount?: number): Promise<void> {
    await this.track(AnalyticsEvent.SEARCH_QUERY, {
      query,
      resultCount,
      queryLength: query.length,
    });
  }

  async trackMapInteraction(action: string, details?: Record<string, any>): Promise<void> {
    await this.track(AnalyticsEvent.MAP_VIEW, {
      action,
      ...details,
    });
  }

  async trackError(errorType: string, error: Error, context?: Record<string, any>): Promise<void> {
    await this.track(AnalyticsEvent.ERROR_API, {
      errorType,
      errorMessage: error.message,
      errorStack: error.stack,
      ...context,
    });
  }

  async trackUserRegistration(method: string): Promise<void> {
    await this.track(AnalyticsEvent.USER_REGISTER, {
      method,
      registrationDate: new Date().toISOString(),
    });
  }

  async trackCollectionAction(action: string, collectionId: string, collectionName?: string): Promise<void> {
    const eventMap: Record<string, AnalyticsEvent> = {
      create: AnalyticsEvent.COLLECTION_CREATE,
      view: AnalyticsEvent.COLLECTION_VIEW,
      edit: AnalyticsEvent.COLLECTION_EDIT,
      delete: AnalyticsEvent.COLLECTION_DELETE,
      share: AnalyticsEvent.COLLECTION_SHARE,
    };

    const event = eventMap[action] || AnalyticsEvent.COLLECTION_VIEW;
    
    await this.track(event, {
      collectionId,
      collectionName,
      action,
    });
  }

  // Get analytics insights
  async getInsights(): Promise<{
    totalEvents: number;
    pendingEvents: number;
    sessionId: string;
    userProperties: UserProperties;
  }> {
    return {
      totalEvents: this.pendingEvents.length,
      pendingEvents: this.pendingEvents.length,
      sessionId: this.sessionId,
      userProperties: this.userProperties,
    };
  }

  // Force sync pending events
  async forcSync(): Promise<void> {
    await this.syncEvents();
  }

  // Reset analytics data
  async reset(): Promise<void> {
    try {
      this.sessionId = this.generateSessionId();
      this.userId = null;
      this.userProperties = {};
      this.pendingEvents = [];

      await Promise.all([
        AsyncStorage.removeItem(ANALYTICS_STORAGE_KEYS.SESSION_ID),
        AsyncStorage.removeItem(ANALYTICS_STORAGE_KEYS.USER_PROPERTIES),
        AsyncStorage.removeItem(ANALYTICS_STORAGE_KEYS.PENDING_EVENTS),
        AsyncStorage.removeItem(ANALYTICS_STORAGE_KEYS.LAST_SYNC),
      ]);

      console.log('📊 Analytics data reset');
    } catch (error) {
      console.error('Error resetting analytics data:', error);
    }
  }
}

// Export singleton instance
export const analytics = AnalyticsManager.getInstance();