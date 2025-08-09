import * as InAppPurchases from 'expo-in-app-purchases';
import { Platform } from 'react-native';

// Product IDs must match what's configured in App Store Connect / Google Play Console
const PRODUCT_IDS = {
  basic_monthly: Platform.select({
    ios: 'com.frontsnap.basic.monthly',
    android: 'basic_monthly_subscription',
  })!,
  pro_monthly: Platform.select({
    ios: 'com.frontsnap.pro.monthly',
    android: 'pro_monthly_subscription',
  })!,
};

export const initializeIAP = async () => {
  try {
    // Connect to the store
    const history = await InAppPurchases.connectAsync();
    console.log('IAP connected, history:', history);
    
    // Get available products
    const { results } = await InAppPurchases.getProductsAsync(Object.values(PRODUCT_IDS));
    console.log('Available products:', results);
    
    return results;
  } catch (error) {
    console.error('Failed to initialize IAP:', error);
    throw error;
  }
};

export const purchaseSubscription = async (productId: string, userId: string) => {
  try {
    // Set purchase listener
    InAppPurchases.setPurchaseListener(({ responseCode, results, errorCode }) => {
      if (responseCode === InAppPurchases.IAPResponseCode.OK) {
        results?.forEach(async (purchase) => {
          if (!purchase.acknowledged) {
            console.log('Purchase successful:', purchase);
            
            // Sync with your backend
            await syncPurchaseWithBackend(purchase, userId);
            
            // Acknowledge the purchase
            await InAppPurchases.finishTransactionAsync(purchase, true);
          }
        });
      } else {
        console.error('Purchase failed:', errorCode);
      }
    });
    
    // Initiate purchase
    await InAppPurchases.purchaseItemAsync(productId);
  } catch (error) {
    console.error('Purchase error:', error);
    throw error;
  }
};

const syncPurchaseWithBackend = async (purchase: any, userId: string) => {
  // Send purchase info to your backend for validation
  // Your backend should:
  // 1. Verify the receipt with Apple/Google
  // 2. Update user's subscription status
  // 3. Sync to Supabase
  
  const response = await fetch('https://your-backend.com/api/verify-purchase', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: userId,
      purchase: {
        productId: purchase.productId,
        transactionId: purchase.transactionId,
        receipt: purchase.receipt,
        platform: Platform.OS,
      },
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to sync purchase');
  }
};

export const restorePurchases = async () => {
  try {
    const history = await InAppPurchases.getPurchaseHistoryAsync();
    console.log('Purchase history:', history);
    
    // Process each historical purchase
    for (const purchase of history.results || []) {
      await syncPurchaseWithBackend(purchase, 'current-user-id');
    }
    
    return history.results;
  } catch (error) {
    console.error('Failed to restore purchases:', error);
    throw error;
  }
};