import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Apple App Store verification endpoint
const APPLE_VERIFY_URL_SANDBOX = 'https://sandbox.itunes.apple.com/verifyReceipt';
const APPLE_VERIFY_URL_PRODUCTION = 'https://buy.itunes.apple.com/verifyReceipt';

// Google Play verification would require Google Play Developer API setup
// For production, use: https://developers.google.com/android-publisher/api-ref/purchases/products

interface ValidateRequest {
  userId: string;
  platform: 'ios' | 'android';
  receipt: string;
  productId: string;
  transactionId: string;
}

export async function POST(request: ExpoRequest): Promise<ExpoResponse> {
  try {
    const body: ValidateRequest = await request.json();
    const { userId, platform, receipt, productId, transactionId } = body;

    if (!userId || !platform || !receipt || !productId || !transactionId) {
      return ExpoResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    let isValid = false;
    let subscriptionData: any = null;

    if (platform === 'ios') {
      // Validate with Apple
      const validationResult = await validateAppleReceipt(receipt);
      isValid = validationResult.isValid;
      subscriptionData = validationResult.data;
    } else if (platform === 'android') {
      // Validate with Google Play
      // Note: This requires setting up Google Play Developer API
      // For now, we'll trust the client (NOT recommended for production)
      console.warn('Android receipt validation not implemented - trusting client');
      isValid = true;
      subscriptionData = {
        productId,
        transactionId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      };
    }

    if (!isValid) {
      return ExpoResponse.json(
        { error: 'Invalid receipt' },
        { status: 400 }
      );
    }

    // Determine subscription tier from product ID
    const tier = getSubscriptionTier(productId);

    // Save subscription to database
    const { data, error } = await supabaseAdmin
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        product_id: productId,
        transaction_id: transactionId,
        subscription_tier: tier,
        status: 'active',
        platform,
        purchase_date: new Date().toISOString(),
        expires_at: subscriptionData.expiresAt,
        receipt_data: receipt,
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to save subscription:', error);
      return ExpoResponse.json(
        { error: 'Failed to save subscription' },
        { status: 500 }
      );
    }

    // Update user profile
    await supabaseAdmin
      .from('profiles')
      .update({
        subscription_tier: tier,
        subscription_status: 'active',
        subscription_expires_at: subscriptionData.expiresAt,
      })
      .eq('id', userId);

    return ExpoResponse.json({
      success: true,
      subscription: data,
    });
  } catch (error) {
    console.error('Receipt validation error:', error);
    return ExpoResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function validateAppleReceipt(receipt: string): Promise<{
  isValid: boolean;
  data: any;
}> {
  try {
    // Try production first
    let response = await fetch(APPLE_VERIFY_URL_PRODUCTION, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        'receipt-data': receipt,
        'password': process.env.APPLE_SHARED_SECRET, // Your app's shared secret
      }),
    });

    let result = await response.json();

    // If sandbox receipt, try sandbox URL
    if (result.status === 21007) {
      response = await fetch(APPLE_VERIFY_URL_SANDBOX, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          'receipt-data': receipt,
          'password': process.env.APPLE_SHARED_SECRET,
        }),
      });
      result = await response.json();
    }

    if (result.status === 0) {
      // Receipt is valid
      const latestReceipt = result.latest_receipt_info?.[0] || result.receipt;
      
      return {
        isValid: true,
        data: {
          productId: latestReceipt.product_id,
          transactionId: latestReceipt.transaction_id,
          originalTransactionId: latestReceipt.original_transaction_id,
          purchaseDate: latestReceipt.purchase_date_ms,
          expiresAt: latestReceipt.expires_date || 
                     new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      };
    }

    return {
      isValid: false,
      data: null,
    };
  } catch (error) {
    console.error('Apple receipt validation error:', error);
    return {
      isValid: false,
      data: null,
    };
  }
}

function getSubscriptionTier(productId: string): 'free' | 'basic' | 'pro' {
  if (productId.includes('basic')) {
    return 'basic';
  } else if (productId.includes('pro')) {
    return 'pro';
  }
  return 'free';
}

export async function GET(): Promise<ExpoResponse> {
  return ExpoResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}