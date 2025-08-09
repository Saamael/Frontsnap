import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Check if we're running in Expo Go
export const isExpoGo = Constants.appOwnership === 'expo';

// Safely import IAP only in development builds
let InAppPurchases: any = null;

if (!isExpoGo) {
  try {
    InAppPurchases = require('expo-in-app-purchases');
  } catch (error) {
    console.warn('In-App Purchases not available in this environment');
  }
}

export { InAppPurchases };

// Mock IAP response types for Expo Go
export const IAPResponseCode = {
  OK: 0,
  USER_CANCELED: 1,
  ERROR: 2,
};

export const MockIAPManager = {
  async initialize(): Promise<boolean> {
    console.log('🎭 Mock IAP: Running in Expo Go - IAP features disabled');
    return false;
  },

  async getProducts(): Promise<any[]> {
    // Return mock products for UI testing
    return [
      {
        productId: 'com.frontsnap.subscription.basic',
        price: '$9.99',
        title: 'Basic Monthly',
        description: 'Basic subscription',
      },
      {
        productId: 'com.frontsnap.subscription.pro',
        price: '$29.99',
        title: 'Pro Monthly',
        description: 'Pro subscription',
      },
    ];
  },

  async purchaseSubscription(productId: string): Promise<boolean> {
    console.log('🎭 Mock purchase:', productId);
    alert('In-App Purchases require a development build. Running in Expo Go for testing only.');
    return false;
  },

  async restorePurchases(): Promise<any[]> {
    console.log('🎭 Mock restore purchases');
    return [];
  },

  async checkSubscriptionStatus(): Promise<string> {
    return 'free';
  },

  disconnect() {
    console.log('🎭 Mock disconnect');
  },
};