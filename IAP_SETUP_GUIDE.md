# In-App Purchases Setup Guide for FrontSnap

## Overview

This guide covers the complete setup of In-App Purchases (IAP) for FrontSnap using native iOS/Android payment systems with Supabase for subscription management.

## ✅ Implementation Status

### Completed
- ✅ Reverted Clerk authentication changes
- ✅ Restored Supabase Auth
- ✅ Implemented IAP manager (`lib/iap-manager.ts`)
- ✅ Created subscription database schema
- ✅ Built native subscription UI (`app/subscription.tsx`)
- ✅ Added receipt validation endpoint
- ✅ Integrated with Supabase for subscription tracking

## 📱 iOS Setup (App Store Connect)

### 1. Configure App in App Store Connect

1. Log in to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app
3. Go to **Features** → **In-App Purchases**

### 2. Create Subscription Products

Create these exact products (IDs must match):

#### Basic Monthly Subscription
- **Product ID**: `com.frontsnap.subscription.basic`
- **Reference Name**: Basic Monthly
- **Price**: $9.99 USD
- **Duration**: 1 Month
- **Family Sharable**: No

#### Pro Monthly Subscription
- **Product ID**: `com.frontsnap.subscription.pro`
- **Reference Name**: Pro Monthly
- **Price**: $29.99 USD
- **Duration**: 1 Month
- **Family Sharable**: No

#### Pro Annual Subscription
- **Product ID**: `com.frontsnap.subscription.pro.yearly`
- **Reference Name**: Pro Annual
- **Price**: $287.99 USD (Save 20%)
- **Duration**: 1 Year
- **Family Sharable**: No

### 3. Create Subscription Group

1. Create a subscription group called "Premium Plans"
2. Add all subscriptions to this group
3. Set upgrade/downgrade rules

### 4. Generate Shared Secret

1. Go to **App Information** → **App-Specific Shared Secret**
2. Generate a new shared secret
3. Add to your `.env` file:
```env
APPLE_SHARED_SECRET=your_shared_secret_here
```

### 5. Configure App Capabilities

In Xcode:
1. Open your project
2. Select your target
3. Go to **Signing & Capabilities**
4. Add **In-App Purchase** capability

## 🤖 Android Setup (Google Play Console)

### 1. Configure App in Play Console

1. Log in to [Google Play Console](https://play.google.com/console)
2. Select your app
3. Go to **Monetize** → **In-app products** → **Subscriptions**

### 2. Create Subscription Products

Create these exact products:

#### Basic Monthly Subscription
- **Product ID**: `subscription_basic_monthly`
- **Name**: Basic Monthly
- **Price**: $9.99 USD
- **Billing Period**: Monthly
- **Grace Period**: 3 days

#### Pro Monthly Subscription
- **Product ID**: `subscription_pro_monthly`
- **Name**: Pro Monthly
- **Price**: $29.99 USD
- **Billing Period**: Monthly
- **Grace Period**: 3 days

#### Pro Annual Subscription
- **Product ID**: `subscription_pro_yearly`
- **Name**: Pro Annual
- **Price**: $287.99 USD
- **Billing Period**: Yearly
- **Grace Period**: 7 days

### 3. Configure Google Play Billing

1. Enable Google Play Billing API
2. Create service account for server verification
3. Download JSON credentials
4. Add to your server environment

### 4. Update Android Manifest

Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="com.android.vending.BILLING" />
```

## 🗄️ Database Setup

Run the migration to create subscription tables:

```bash
# Apply the migration
npx supabase migration up

# Or run manually:
psql -U postgres -d your_database -f supabase/migrations/20250808000002_iap_subscriptions.sql
```

## 🔧 Environment Variables

Add these to your `.env` file:

```env
# Supabase (existing)
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyxxxxx

# Apple IAP
APPLE_SHARED_SECRET=your_apple_shared_secret

# Google Play (optional for server validation)
GOOGLE_PLAY_SERVICE_ACCOUNT={"type":"service_account",...}
```

## 🧪 Testing In-App Purchases

### iOS Testing (TestFlight)

1. **Create Sandbox Testers**:
   - App Store Connect → Users and Access → Sandbox Testers
   - Create test accounts with fake emails

2. **Test in Simulator/Device**:
   ```bash
   # Run on iOS
   npm run ios
   ```

3. **Test Purchase Flow**:
   - Sign out of real App Store account
   - Sign in with sandbox tester
   - Make test purchases (won't charge real money)

### Android Testing

1. **Add License Testers**:
   - Play Console → Setup → License Testing
   - Add tester email addresses

2. **Test in Emulator/Device**:
   ```bash
   # Run on Android
   npm run android
   ```

3. **Test Purchase Flow**:
   - Install app via Internal Testing track
   - Use license tester account
   - Make test purchases

## 📋 Testing Checklist

### Basic Flow
- [ ] App connects to store successfully
- [ ] Products load with correct prices
- [ ] Purchase flow completes
- [ ] Subscription activates in app
- [ ] Data saves to Supabase

### Subscription Management
- [ ] Restore purchases works
- [ ] Subscription status updates
- [ ] Expiry dates are correct
- [ ] Downgrade/upgrade works
- [ ] Cancellation handled properly

### Edge Cases
- [ ] Network errors handled
- [ ] User cancellation handled
- [ ] Invalid receipts rejected
- [ ] Expired subscriptions detected
- [ ] Multiple device sync works

## 🚀 Production Deployment

### Before Launch

1. **Test Everything**:
   - Complete all testing checklists
   - Test on real devices
   - Verify receipt validation

2. **Configure Production**:
   - Set production API endpoints
   - Update environment variables
   - Enable production receipt validation

3. **App Store Preparation**:
   - Screenshot subscription screens
   - Write subscription descriptions
   - Set up promotional offers (optional)

### Monitoring

1. **Track Metrics**:
   ```sql
   -- Active subscriptions
   SELECT subscription_tier, COUNT(*) 
   FROM user_subscriptions 
   WHERE status = 'active' 
   GROUP BY subscription_tier;

   -- Revenue by platform
   SELECT platform, subscription_tier, COUNT(*) * price 
   FROM user_subscriptions 
   WHERE status = 'active' 
   GROUP BY platform, subscription_tier;
   ```

2. **Monitor Errors**:
   - Check Supabase logs
   - Monitor receipt validation failures
   - Track purchase completion rates

## 🛠️ Troubleshooting

### Common Issues

1. **"Products not loading"**
   - Verify product IDs match exactly
   - Check bundle ID matches app store
   - Ensure agreements signed in App Store Connect

2. **"Purchase fails immediately"**
   - Check test user configuration
   - Verify app capabilities enabled
   - Check network connectivity

3. **"Subscription not activating"**
   - Check Supabase connection
   - Verify receipt validation
   - Check RLS policies

4. **"Restore not working"**
   - Ensure user signed in with same account
   - Check purchase history API
   - Verify transaction IDs stored

## 📝 Important Notes

### App Store Requirements

- **Apple**: Subscriptions MUST use IAP (no Stripe allowed)
- **Google**: Similar policy for digital goods
- **Revenue Share**: Apple/Google take 15-30% commission
- **Review**: Subscription screens will be reviewed

### Best Practices

1. **Always validate receipts server-side**
2. **Store original transaction IDs**
3. **Handle grace periods properly**
4. **Implement proper error handling**
5. **Test thoroughly before release**

## 🔗 Resources

- [Apple - In-App Purchase](https://developer.apple.com/in-app-purchase/)
- [Google - Play Billing](https://developer.android.com/google/play/billing)
- [Expo - In-App Purchases](https://docs.expo.dev/versions/latest/sdk/in-app-purchases/)
- [RevenueCat Alternative](https://www.revenuecat.com/) - Consider for easier implementation

## 📱 Running the App

```bash
# Install dependencies
npm install

# iOS
npm run ios

# Android  
npm run android

# Start Expo
npm run dev
```

## ✅ Final Steps

1. **Configure products in app stores**
2. **Test with sandbox/test accounts**
3. **Submit for review with IAP enabled**
4. **Monitor post-launch metrics**

Remember: The app is now ready for IAP testing. You need to configure products in App Store Connect and Google Play Console before testing real purchases.