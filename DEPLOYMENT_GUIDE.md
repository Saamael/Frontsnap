# FrontSnapV2 App Store Deployment Guide

## 🚨 Critical Security Issues to Fix First

### 1. Environment Variables Security
**Issue**: API keys are exposed in client-side code
**Solution**: Move sensitive API calls to backend proxy

```bash
# Create a backend proxy (recommended) or use environment-specific keys
# For now, ensure your .env file is properly secured
```

### 2. Remove Debug Logging
**Issue**: Extensive console.log statements expose sensitive data
**Solution**: Remove or conditionally disable in production

```typescript
// Replace console.log with production-safe logging
const log = __DEV__ ? console.log : () => {};
```

## 📱 Required App Assets

### 1. App Icons
**Location**: `assets/images/`

**Required Sizes**:
- **iOS**: 1024x1024px (App Store)
- **Android**: 512x512px (Play Store)
- **Adaptive Icon**: 108x108dp foreground, 108x108dp background

**Tools to create icons**:
- [Figma](https://figma.com) (free)
- [Canva](https://canva.com) (free)
- [App Icon Generator](https://appicon.co) (online tool)

**File structure**:
```
assets/
├── images/
│   ├── icon.png (1024x1024)
│   ├── icon-ios.png (1024x1024)
│   ├── icon-android.png (512x512)
│   ├── adaptive-icon.png (108x108)
│   └── adaptive-icon-background.png (108x108)
```

### 2. Splash Screen
**Location**: `assets/images/`

**Required**:
- **iOS**: 2048x2732px (portrait)
- **Android**: 1242x2436px (portrait)

**File structure**:
```
assets/
├── images/
│   ├── splash.png (2048x2732)
│   ├── splash-ios.png (2048x2732)
│   └── splash-android.png (1242x2436)
```

### 3. App Store Screenshots
**Required for each device type**:
- iPhone 6.7" (1290x2796)
- iPhone 6.5" (1242x2688)
- iPhone 5.5" (1242x2208)
- iPad Pro 12.9" (2048x2732)

**Tools**:
- [Screenshot Maker](https://screenshotmaker.com)
- [App Store Screenshot Generator](https://www.appstorescreenshot.com)

## ⚙️ App Configuration Updates

### 1. Update app.json
```json
{
  "expo": {
    "name": "FrontSnap",
    "slug": "frontsnap",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "frontsnap",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/images/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.superingtech.frontsnap",
      "buildNumber": "1",
      "infoPlist": {
        "NSCameraUsageDescription": "Allow FrontSnap to access your camera to capture storefront photos",
        "NSLocationWhenInUseUsageDescription": "Allow FrontSnap to use your location to identify nearby places",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "Allow FrontSnap to use your location to identify nearby places",
        "NSPhotoLibraryUsageDescription": "Allow FrontSnap to access your photo library to select storefront images",
        "NSMicrophoneUsageDescription": "Allow FrontSnap to access your microphone for video features",
        "CFBundleDisplayName": "FrontSnap",
        "CFBundleName": "FrontSnap"
      }
    },
    "android": {
      "package": "com.superingtech.frontsnap",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "permissions": [
        "android.permission.CAMERA",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE"
      ]
    },
    "web": {
      "bundler": "metro",
      "output": "server",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router", 
      "expo-font", 
      "expo-web-browser",
      [
        "expo-camera",
        {
          "cameraPermission": "Allow FrontSnap to access your camera to capture storefront photos"
        }
      ],
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow FrontSnap to use your location to identify nearby places"
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    },
    "extra": {
      "eas": {
        "projectId": "your-project-id-here"
      }
    }
  }
}
```

### 2. Create eas.json for Build Configuration
```json
{
  "cli": {
    "version": ">= 5.9.1"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "ios": {
        "resourceClass": "m-medium"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "your-apple-team-id"
      },
      "android": {
        "serviceAccountKeyPath": "./path-to-your-service-account.json",
        "track": "production"
      }
    }
  }
}
```

## 📄 Legal Documents

### 1. Privacy Policy
**Yes, you can use your @supering.io domain!**

**Location**: Create `docs/privacy-policy.md` and host at `https://supering.io/privacy-policy`

**Required Content**:
- Data collection practices
- How you use user data
- Third-party services (Google Places, OpenAI, Supabase)
- User rights (GDPR compliance)
- Contact information

**Template**: [Privacy Policy Generator](https://www.privacypolicygenerator.info/)

### 2. Terms of Service
**Location**: Create `docs/terms-of-service.md` and host at `https://supering.io/terms-of-service`

**Required Content**:
- App usage terms
- User responsibilities
- Intellectual property rights
- Limitation of liability
- Termination clauses

**Template**: [Terms of Service Generator](https://www.termsofservicegenerator.net/)

### 3. End User License Agreement (EULA)
**Location**: Create `docs/eula.md` and host at `https://supering.io/eula`

**Required Content**:
- Software license terms
- Usage restrictions
- Warranty disclaimers
- Termination conditions

## 🔧 Build and Deployment Setup

### 1. Install EAS CLI
```bash
npm install -g @expo/eas-cli
```

### 2. Login to Expo
```bash
eas login
```

### 3. Configure EAS
```bash
eas build:configure
```

### 4. Create App Store Connect App
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create new app
3. Get App ID and Team ID
4. Update `eas.json` with these values

### 5. Create Google Play Console App
1. Go to [Google Play Console](https://play.google.com/console)
2. Create new app
3. Generate service account key
4. Update `eas.json` with service account path

## 📋 App Store Metadata

### 1. App Store Connect
**Required Fields**:
- App Name: "FrontSnap"
- Subtitle: "Discover Local Businesses"
- Description: [Write compelling description]
- Keywords: "local business, discovery, reviews, places, nearby"
- Category: "Lifestyle" or "Travel"
- Age Rating: 4+ (no objectionable content)

### 2. Google Play Console
**Required Fields**:
- App Name: "FrontSnap"
- Short Description: [Brief description]
- Full Description: [Detailed description]
- Category: "Lifestyle"
- Content Rating: 3+ (General)

## 🛡️ Security Improvements

### 1. Create Environment-Specific Configs
```bash
# Create environment files
touch .env.development
touch .env.production
touch .env.staging
```

### 2. Update API Security
```typescript
// lib/api-config.ts
const getApiConfig = () => {
  if (__DEV__) {
    return {
      googlePlacesKey: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY,
      openaiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
    };
  }
  // Production: Use backend proxy
  return {
    googlePlacesKey: null, // Use backend proxy
    openaiKey: null, // Use backend proxy
  };
};
```

### 3. Remove Debug Logging
```typescript
// utils/logger.ts
export const log = __DEV__ ? console.log : () => {};
export const error = __DEV__ ? console.error : () => {};
export const warn = __DEV__ ? console.warn : () => {};
```

## 📝 Step-by-Step Deployment Checklist

### Phase 1: Assets (Week 1)
- [ ] Create app icons (1024x1024, 512x512, adaptive)
- [ ] Create splash screen (2048x2732)
- [ ] Generate app store screenshots
- [ ] Test icons on different devices

### Phase 2: Configuration (Week 1)
- [ ] Update app.json with all required fields
- [ ] Create eas.json build configuration
- [ ] Set up environment variables
- [ ] Remove debug logging

### Phase 3: Legal Documents (Week 2)
- [ ] Create privacy policy (host on supering.io)
- [ ] Create terms of service (host on supering.io)
- [ ] Create EULA (host on supering.io)
- [ ] Update app.json with privacy policy URL

### Phase 4: Store Setup (Week 2)
- [ ] Create App Store Connect app
- [ ] Create Google Play Console app
- [ ] Configure app signing certificates
- [ ] Set up service accounts

### Phase 5: Build & Test (Week 3)
- [ ] Run EAS build for iOS
- [ ] Run EAS build for Android
- [ ] Test on physical devices
- [ ] Fix any issues found

### Phase 6: Submit (Week 3)
- [ ] Upload to App Store Connect
- [ ] Upload to Google Play Console
- [ ] Submit for review
- [ ] Monitor review process

## 🚀 Quick Start Commands

```bash
# 1. Install EAS CLI
npm install -g @expo/eas-cli

# 2. Login to Expo
eas login

# 3. Configure build
eas build:configure

# 4. Build for iOS
eas build --platform ios

# 5. Build for Android
eas build --platform android

# 6. Submit to stores
eas submit --platform ios
eas submit --platform android
```

## 📞 Support Resources

- **Expo Documentation**: https://docs.expo.dev
- **EAS Build**: https://docs.expo.dev/build/introduction/
- **App Store Guidelines**: https://developer.apple.com/app-store/review/guidelines/
- **Google Play Policies**: https://play.google.com/about/developer-content-policy/

## ⚠️ Important Notes

1. **API Keys**: Consider moving to backend proxy for production
2. **Testing**: Always test on physical devices before submission
3. **Review Process**: iOS review takes 1-7 days, Android 1-3 days
4. **Updates**: Plan for regular updates and maintenance
5. **Analytics**: Consider adding analytics (Firebase, Mixpanel) for insights

## 🎯 Next Steps

1. Start with Phase 1 (Assets) - this takes the most time
2. Set up your supering.io domain for legal documents
3. Create App Store Connect and Google Play Console accounts
4. Begin the build and submission process

Good luck with your app store deployment! 🚀 