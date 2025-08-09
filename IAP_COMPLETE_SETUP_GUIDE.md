# Complete In-App Purchase Setup Guide for FrontSnap

## ⚠️ Critical Requirements

### You MUST use a Development Build
**In-App Purchases do NOT work in Expo Go!** You need a development build.

## 📱 Step 1: Create a Development Build

### Option A: EAS Build (Recommended)
```bash
# 1. Install EAS CLI globally
npm install -g eas-cli

# 2. Login to your Expo account
eas login

# 3. Configure your project for EAS
eas build:configure

# 4. Create a development build for iOS
eas build --platform ios --profile development

# 5. Create a development build for Android
eas build --platform android --profile development
```

### Option B: Local Build (Advanced)
```bash
# For iOS (Mac only)
npx expo prebuild
cd ios && pod install
npx expo run:ios

# For Android
npx expo prebuild
npx expo run:android
```

## 🍎 Step 2: iOS Setup (App Store Connect)

### 2.1 Configure App Identifier
1. Go to [Apple Developer Portal](https://developer.apple.com)
2. Navigate to **Identifiers**
3. Select your app identifier
4. Enable **In-App Purchase** capability
5. Save changes

### 2.2 Create Products in App Store Connect
1. Log in to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app
3. Go to **Features** → **In-App Purchases**
4. Click **+** to create new products

#### Create These Exact Products:

**Basic Monthly Subscription**
- Product ID: `com.frontsnap.subscription.basic`
- Reference Name: Basic Monthly
- Price: Tier 10 ($9.99 USD)
- Duration: 1 Month
- Description: "50 places per month, advanced search, 10 collections"

**Pro Monthly Subscription**
- Product ID: `com.frontsnap.subscription.pro`
- Reference Name: Pro Monthly
- Price: Tier 30 ($29.99 USD)
- Duration: 1 Month
- Description: "Unlimited places, AI recommendations, analytics"

**Pro Yearly Subscription**
- Product ID: `com.frontsnap.subscription.pro.yearly`
- Reference Name: Pro Yearly
- Price: Tier 288 ($287.99 USD)
- Duration: 1 Year
- Description: "All Pro features with 20% annual discount"

### 2.3 Create Subscription Group
1. In **In-App Purchases**, create a group named "Premium Subscriptions"
2. Add all subscriptions to this group
3. Configure upgrade/downgrade paths

### 2.4 Generate Shared Secret
1. Go to **App Information** → **Shared Secret**
2. Generate or view your shared secret
3. Copy and save for server validation

### 2.5 Create Sandbox Testers
1. Go to **Users and Access** → **Sandbox Testers**
2. Create test accounts (use fake emails like test1@test.com)
3. Note: These accounts are for testing only

## 🤖 Step 3: Android Setup (Google Play Console)

### 3.1 Enable Google Play Billing
1. Log in to [Google Play Console](https://play.google.com/console)
2. Select your app
3. Go to **Setup** → **API access**
4. Link a Google Cloud project

### 3.2 Create Subscriptions
1. Navigate to **Monetize** → **In-app products** → **Subscriptions**
2. Click **Create subscription**

#### Create These Products:

**Basic Monthly**
- Product ID: `subscription_basic_monthly`
- Name: Basic Monthly
- Price: $9.99 USD
- Billing Period: Monthly
- Free Trial: 7 days (optional)

**Pro Monthly**
- Product ID: `subscription_pro_monthly`
- Name: Pro Monthly
- Price: $29.99 USD
- Billing Period: Monthly
- Free Trial: 7 days (optional)

**Pro Yearly**
- Product ID: `subscription_pro_yearly`
- Name: Pro Yearly
- Price: $287.99 USD
- Billing Period: Yearly
- Free Trial: 14 days (optional)

### 3.3 Add License Testers
1. Go to **Setup** → **License testing**
2. Add tester email addresses
3. Set response to "RESPOND_NORMALLY"

## 🔧 Step 4: Configure Your App

### 4.1 Update app.json
```json
{
  "expo": {
    "plugins": [
      "expo-dev-client"
    ],
    "ios": {
      "bundleIdentifier": "com.yourcompany.frontsnap",
      "config": {
        "usesNonExemptEncryption": false
      }
    },
    "android": {
      "package": "com.yourcompany.frontsnap",
      "permissions": ["com.android.vending.BILLING"]
    }
  }
}
```

### 4.2 Environment Variables
Create/update `.env` file:
```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Apple IAP
APPLE_SHARED_SECRET=your_apple_shared_secret

# Bundle IDs (must match app stores)
IOS_BUNDLE_ID=com.yourcompany.frontsnap
ANDROID_PACKAGE_NAME=com.yourcompany.frontsnap
```

### 4.3 Update EAS Configuration
Create/update `eas.json`:
```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "ios": {
        "autoIncrement": true
      },
      "android": {
        "autoIncrement": true
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

## 🧪 Step 5: Testing

### 5.1 Install Development Build

**iOS:**
1. Download the build from EAS
2. Install using TestFlight or direct install
3. Sign out of real App Store account
4. Sign in with sandbox tester

**Android:**
1. Download the APK from EAS
2. Install on device/emulator
3. Add test account to device
4. Use license tester account

### 5.2 Test Purchase Flow
```javascript
// Test in your app
import { iapManager } from '@/lib/iap-manager';

// Initialize IAP
await iapManager.initialize();

// Get products
const products = await iapManager.getProducts();
console.log('Available products:', products);

// Make a test purchase
await iapManager.purchaseSubscription('com.frontsnap.subscription.basic');

// Restore purchases
await iapManager.restorePurchases();
```

### 5.3 Verify in Database
```sql
-- Check subscription status in Supabase
SELECT * FROM user_subscriptions WHERE user_id = 'your-user-id';
SELECT * FROM profiles WHERE id = 'your-user-id';
```

## 📋 Testing Checklist

### Initial Setup
- [ ] Development build created
- [ ] Products configured in app stores
- [ ] Sandbox/test accounts created
- [ ] Environment variables set

### iOS Testing
- [ ] Build installs on device
- [ ] Products load with prices
- [ ] Purchase completes successfully
- [ ] Subscription appears in Manage Subscriptions
- [ ] Restore purchases works

### Android Testing
- [ ] APK installs correctly
- [ ] Products load from Play Store
- [ ] Purchase flow completes
- [ ] Subscription visible in Play Store
- [ ] Restore works

### Backend Validation
- [ ] Receipt validation works
- [ ] Subscription saved to Supabase
- [ ] User profile updated
- [ ] Features unlock correctly

## 🚨 Common Issues & Solutions

### "Cannot find native module 'ExpoInAppPurchases'"
**Solution:** You're using Expo Go. Create a development build.

### "Products not loading"
**Solutions:**
1. Verify product IDs match exactly
2. Check bundle ID matches app store
3. Ensure products are in "Ready to Submit" state
4. Wait 24 hours after creating products

### "Purchase fails immediately"
**Solutions:**
1. Check sandbox tester is signed in (iOS)
2. Verify license tester added (Android)
3. Ensure agreements signed in App Store Connect
4. Check payment method on test account

### "Subscription not appearing in app"
**Solutions:**
1. Check Supabase connection
2. Verify receipt validation endpoint
3. Check RLS policies in Supabase
4. Look at server logs for errors

## 🚀 Production Deployment

### Before Launch
1. **Test everything** with real devices
2. **Submit for review** with IAP included
3. **Provide demo account** for reviewers
4. **Include screenshots** of subscription screens

### App Store Review Notes
Include this in your review notes:
```
This app includes auto-renewable subscriptions:
- Basic ($9.99/month): 50 places, advanced features
- Pro ($29.99/month): Unlimited places, AI features
- Pro Yearly ($287.99/year): Save 20%

To test subscriptions:
1. Navigate to Profile → Subscription
2. Select a plan and subscribe
3. Features unlock immediately

Test account: [provide test credentials]
```

## 📚 Resources

- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [Apple In-App Purchase](https://developer.apple.com/in-app-purchase/)
- [Google Play Billing](https://developer.android.com/google/play/billing)
- [RevenueCat (Alternative)](https://www.revenuecat.com/docs/getting-started/installation/reactnative)

## 🆘 Need Help?

If you're stuck:
1. Check the [Expo Discord](https://chat.expo.dev)
2. Post in [Expo Forums](https://forums.expo.dev)
3. Consider using [RevenueCat](https://www.revenuecat.com) for easier implementation

---

**Remember:** In-App Purchases require a development build. They will NOT work in Expo Go!