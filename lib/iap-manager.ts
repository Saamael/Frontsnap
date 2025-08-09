import { Platform } from 'react-native';
import { supabase } from './supabase';
import { InAppPurchases, isExpoGo, MockIAPManager, IAPResponseCode } from './iap-safe';

// Product IDs - These must match EXACTLY what you configure in:
// - App Store Connect (iOS)
// - Google Play Console (Android)
export const IAP_PRODUCTS = {
  BASIC_MONTHLY: Platform.select({
    ios: 'com.frontsnap.subscription.basic',
    android: 'subscription_basic_monthly',
  })!,
  PRO_MONTHLY: Platform.select({
    ios: 'com.frontsnap.subscription.pro',
    android: 'subscription_pro_monthly',
  })!,
  PRO_YEARLY: Platform.select({
    ios: 'com.frontsnap.subscription.pro.yearly',
    android: 'subscription_pro_yearly',
  })!,
};

// Subscription tiers
export enum SubscriptionTier {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
}

// Product features by tier
export const TIER_FEATURES = {
  [SubscriptionTier.FREE]: {
    maxPlacesPerMonth: 5,
    maxCollections: 1,
    canExportData: false,
    hasAdvancedSearch: false,
    hasAIRecommendations: false,
    hasAnalytics: false,
    supportLevel: 'community',
  },
  [SubscriptionTier.BASIC]: {
    maxPlacesPerMonth: 50,
    maxCollections: 10,
    canExportData: true,
    hasAdvancedSearch: true,
    hasAIRecommendations: false,
    hasAnalytics: false,
    supportLevel: 'email',
  },
  [SubscriptionTier.PRO]: {
    maxPlacesPerMonth: -1, // Unlimited
    maxCollections: -1, // Unlimited
    canExportData: true,
    hasAdvancedSearch: true,
    hasAIRecommendations: true,
    hasAnalytics: true,
    supportLevel: 'priority',
  },
};

class IAPManager {
  private purchaseListener: any = null;
  private products: any[] = [];
  private isInitialized = false;

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    // Use mock manager in Expo Go
    if (isExpoGo || !InAppPurchases) {
      console.warn('⚠️ Running in Expo Go - IAP features are mocked');
      this.isInitialized = true;
      return false;
    }

    try {
      console.log('🛍️ Initializing In-App Purchases...');
      
      // Connect to the store
      await InAppPurchases.connectAsync();
      console.log('✅ Connected to store');

      // Get available products
      const productIds = Object.values(IAP_PRODUCTS);
      const { results, responseCode } = await InAppPurchases.getProductsAsync(productIds);
      
      if (responseCode === InAppPurchases.IAPResponseCode.OK) {
        this.products = results || [];
        console.log('✅ Products loaded:', this.products.map(p => p.productId));
      } else {
        console.warn('⚠️ Failed to load products, response code:', responseCode);
      }

      // Set up purchase listener
      this.setupPurchaseListener();
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize IAP:', error);
      return false;
    }
  }

  private setupPurchaseListener() {
    this.purchaseListener = InAppPurchases.setPurchaseListener(
      async ({ responseCode, results, errorCode }) => {
        console.log('🛍️ Purchase response:', { responseCode, errorCode });

        if (responseCode === InAppPurchases.IAPResponseCode.OK) {
          for (const purchase of results || []) {
            await this.handleSuccessfulPurchase(purchase);
          }
        } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
          console.log('👤 User canceled purchase');
        } else {
          console.error('❌ Purchase failed:', errorCode);
        }
      }
    );
  }

  private async handleSuccessfulPurchase(purchase: InAppPurchases.InAppPurchase) {
    try {
      console.log('✅ Processing purchase:', purchase);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('❌ No authenticated user');
        return;
      }

      // Determine subscription tier from product ID
      const tier = this.getTierFromProductId(purchase.productId);
      
      // Store subscription in Supabase
      const { error } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: user.id,
          product_id: purchase.productId,
          transaction_id: purchase.transactionId,
          subscription_tier: tier,
          status: 'active',
          platform: Platform.OS,
          purchase_date: new Date(purchase.purchaseTime || Date.now()).toISOString(),
          expires_at: this.calculateExpiryDate(purchase),
          original_transaction_id: purchase.originalTransactionIdentifierIOS || purchase.transactionId,
          receipt_data: purchase.transactionReceipt,
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        console.error('❌ Failed to save subscription:', error);
        return;
      }

      // Update user profile
      await supabase
        .from('profiles')
        .update({
          subscription_tier: tier,
          subscription_status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      console.log('✅ Subscription activated for user:', user.id);

      // Acknowledge the purchase
      if (!purchase.acknowledged) {
        await InAppPurchases.finishTransactionAsync(purchase, true);
      }
    } catch (error) {
      console.error('❌ Error handling purchase:', error);
    }
  }

  private getTierFromProductId(productId: string): SubscriptionTier {
    if (productId === IAP_PRODUCTS.BASIC_MONTHLY) {
      return SubscriptionTier.BASIC;
    } else if (productId === IAP_PRODUCTS.PRO_MONTHLY || productId === IAP_PRODUCTS.PRO_YEARLY) {
      return SubscriptionTier.PRO;
    }
    return SubscriptionTier.FREE;
  }

  private calculateExpiryDate(purchase: InAppPurchases.InAppPurchase): string {
    const purchaseDate = new Date(purchase.purchaseTime || Date.now());
    const productId = purchase.productId;

    // Calculate expiry based on product type
    if (productId.includes('yearly')) {
      purchaseDate.setFullYear(purchaseDate.getFullYear() + 1);
    } else {
      purchaseDate.setMonth(purchaseDate.getMonth() + 1);
    }

    return purchaseDate.toISOString();
  }

  async purchaseSubscription(productId: string): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log('🛍️ Starting purchase for:', productId);
      await InAppPurchases.purchaseItemAsync(productId);
      return true;
    } catch (error: any) {
      if (error.code === 'E_USER_CANCELLED') {
        console.log('👤 User cancelled purchase');
      } else {
        console.error('❌ Purchase error:', error);
      }
      return false;
    }
  }

  async restorePurchases(): Promise<InAppPurchases.InAppPurchase[]> {
    try {
      console.log('🔄 Restoring purchases...');
      
      const { responseCode, results } = await InAppPurchases.getPurchaseHistoryAsync();
      
      if (responseCode === InAppPurchases.IAPResponseCode.OK) {
        console.log(`✅ Found ${results?.length || 0} purchases to restore`);
        
        // Process each purchase
        for (const purchase of results || []) {
          await this.handleSuccessfulPurchase(purchase);
        }
        
        return results || [];
      } else {
        console.warn('⚠️ Failed to restore purchases, response code:', responseCode);
        return [];
      }
    } catch (error) {
      console.error('❌ Restore error:', error);
      return [];
    }
  }

  async getProducts(): Promise<InAppPurchases.IAPItemDetails[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.products;
  }

  async checkSubscriptionStatus(): Promise<SubscriptionTier> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return SubscriptionTier.FREE;

      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('subscription_tier, expires_at, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (error || !data) {
        return SubscriptionTier.FREE;
      }

      // Check if subscription is expired
      const expiryDate = new Date(data.expires_at);
      if (expiryDate < new Date()) {
        // Mark as expired
        await supabase
          .from('user_subscriptions')
          .update({ status: 'expired' })
          .eq('user_id', user.id);
        
        return SubscriptionTier.FREE;
      }

      return data.subscription_tier as SubscriptionTier;
    } catch (error) {
      console.error('❌ Error checking subscription:', error);
      return SubscriptionTier.FREE;
    }
  }

  disconnect() {
    if (this.purchaseListener) {
      this.purchaseListener.remove();
      this.purchaseListener = null;
    }
    InAppPurchases.disconnectAsync();
    this.isInitialized = false;
  }
}

// Export singleton instance
export const iapManager = new IAPManager();