# FrontSnapV2 Deployment Checklist

## 🚨 Critical Security Fixes (Do First!)

### Environment & Security
- [ ] **Update .gitignore** ✅ (Already done)
- [ ] **Create production-safe logger** ✅ (utils/logger.ts created)
- [ ] **Create secure API config** ✅ (lib/api-config.ts created)
- [ ] **Remove all console.log statements** from production code
- [ ] **Set up environment variables** for different environments
- [ ] **Review and update database RLS policies**

### API Security
- [ ] **Move sensitive API calls to backend proxy** (Google Places, OpenAI)
- [ ] **Implement rate limiting** on API endpoints
- [ ] **Add input validation** to all user inputs
- [ ] **Sanitize user-generated content**
- [ ] **Implement proper error handling** without exposing sensitive data

## 📱 App Assets (Week 1)

### App Icons
- [ ] **Create 1024x1024px icon** for iOS App Store
- [ ] **Create 512x512px icon** for Android Play Store
- [ ] **Create 108x108dp adaptive icon** for Android
- [ ] **Create 108x108dp adaptive icon background** for Android
- [ ] **Test icons on different devices** and screen densities

### Splash Screen
- [ ] **Create 2048x2732px splash screen** for iOS
- [ ] **Create 1242x2436px splash screen** for Android
- [ ] **Test splash screen on different devices**
- [ ] **Ensure splash screen matches app branding**

### App Store Screenshots
- [ ] **Create iPhone 6.7" screenshots** (1290x2796)
- [ ] **Create iPhone 6.5" screenshots** (1242x2688)
- [ ] **Create iPhone 5.5" screenshots** (1242x2208)
- [ ] **Create iPad Pro 12.9" screenshots** (2048x2732)
- [ ] **Create Android screenshots** for different device types
- [ ] **Add compelling screenshots** showing key features

## ⚙️ App Configuration (Week 1)

### app.json Updates
- [ ] **Add splash screen configuration**
- [ ] **Add adaptive icon configuration**
- [ ] **Add all required iOS permissions** with descriptions
- [ ] **Add all required Android permissions**
- [ ] **Add buildNumber and versionCode**
- [ ] **Add privacy policy URL**
- [ ] **Add app description and keywords**

### Build Configuration
- [ ] **Create eas.json** ✅ (Already done)
- [ ] **Configure EAS build profiles**
- [ ] **Set up environment variables** for different builds
- [ ] **Configure app signing certificates**

## 📄 Legal Documents (Week 2)

### Privacy Policy
- [ ] **Customize privacy policy template** ✅ (docs/privacy-policy.md created)
- [ ] **Add your business information**
- [ ] **Review third-party services** (Google, OpenAI, Supabase)
- [ ] **Add GDPR compliance** for EU users
- [ ] **Add CCPA compliance** for California users
- [ ] **Host on supering.io** at `/privacy-policy`

### Terms of Service
- [ ] **Customize terms of service template** ✅ (docs/terms-of-service.md created)
- [ ] **Add your business information**
- [ ] **Review user content policies**
- [ ] **Add jurisdiction and governing law**
- [ ] **Host on supering.io** at `/terms-of-service`

### EULA
- [ ] **Customize EULA template** ✅ (docs/eula.md created)
- [ ] **Add software license terms**
- [ ] **Add usage restrictions**
- [ ] **Host on supering.io** at `/eula`

## 🏪 Store Setup (Week 2)

### App Store Connect
- [ ] **Create Apple Developer account** ($99/year)
- [ ] **Create App Store Connect app**
- [ ] **Get App ID and Team ID**
- [ ] **Configure app signing certificates**
- [ ] **Add app metadata** (name, description, keywords)
- [ ] **Add app category** (Lifestyle/Travel)
- [ ] **Set age rating** (4+)
- [ ] **Add privacy policy URL**

### Google Play Console
- [ ] **Create Google Play Console account** ($25 one-time)
- [ ] **Create Play Console app**
- [ ] **Generate service account key**
- [ ] **Add app metadata** (name, description)
- [ ] **Add app category** (Lifestyle)
- [ ] **Set content rating** (3+ General)
- [ ] **Add privacy policy URL**

## 🔧 Build & Test (Week 3)

### EAS Setup
- [ ] **Install EAS CLI** (`npm install -g @expo/eas-cli`)
- [ ] **Login to Expo** (`eas login`)
- [ ] **Configure EAS** (`eas build:configure`)
- [ ] **Update eas.json** with your app IDs

### Build Process
- [ ] **Build for iOS** (`eas build --platform ios`)
- [ ] **Build for Android** (`eas build --platform android`)
- [ ] **Test on physical devices**
- [ ] **Fix any build issues**

### Testing
- [ ] **Test on iPhone** (latest iOS version)
- [ ] **Test on Android** (latest Android version)
- [ ] **Test all app features**
- [ ] **Test offline functionality**
- [ ] **Test location permissions**
- [ ] **Test camera functionality**
- [ ] **Test photo upload**
- [ ] **Test user registration/login**

## 📤 Submit & Deploy (Week 3)

### App Store Submission
- [ ] **Upload build to App Store Connect**
- [ ] **Add app store screenshots**
- [ ] **Add app description**
- [ ] **Add keywords**
- [ ] **Set pricing** (Free)
- [ ] **Submit for review**
- [ ] **Monitor review status**

### Google Play Submission
- [ ] **Upload APK/AAB to Play Console**
- [ ] **Add store screenshots**
- [ ] **Add app description**
- [ ] **Set content rating**
- [ ] **Submit for review**
- [ ] **Monitor review status**

## 🛡️ Security Audit (Before Submission)

### Code Security
- [ ] **Remove all debug logging**
- [ ] **Validate all user inputs**
- [ ] **Sanitize user-generated content**
- [ ] **Implement proper error handling**
- [ ] **Review API security**

### Data Security
- [ ] **Encrypt sensitive data**
- [ ] **Implement secure authentication**
- [ ] **Review database security**
- [ ] **Test for common vulnerabilities**

### Privacy Compliance
- [ ] **Review privacy policy** for accuracy
- [ ] **Test data deletion** functionality
- [ ] **Verify GDPR compliance**
- [ ] **Test user consent** mechanisms

## 📊 Post-Launch

### Analytics Setup
- [ ] **Add Firebase Analytics**
- [ ] **Add crash reporting**
- [ ] **Set up user behavior tracking**
- [ ] **Monitor app performance**

### Monitoring
- [ ] **Set up app monitoring**
- [ ] **Monitor user feedback**
- [ ] **Track app store reviews**
- [ ] **Monitor crash reports**

### Updates
- [ ] **Plan regular updates**
- [ ] **Set up automated builds**
- [ ] **Create update schedule**
- [ ] **Prepare for app store updates**

## 🎯 Priority Order

### Week 1: Foundation
1. **Security fixes** (critical)
2. **App assets** (icons, splash screen)
3. **App configuration** (app.json, eas.json)

### Week 2: Legal & Setup
1. **Legal documents** (privacy, terms, EULA)
2. **Store accounts** (Apple, Google)
3. **Build configuration**

### Week 3: Build & Submit
1. **Build and test**
2. **Submit to stores**
3. **Monitor review process**

## 📞 Resources

### Tools
- **Icon Creation**: Figma, Canva, App Icon Generator
- **Screenshot Creation**: Screenshot Maker, App Store Screenshot Generator
- **Legal Templates**: Privacy Policy Generator, Terms of Service Generator

### Documentation
- **Expo**: https://docs.expo.dev
- **EAS Build**: https://docs.expo.dev/build/
- **App Store**: https://developer.apple.com/app-store/
- **Google Play**: https://play.google.com/console

### Support
- **Expo Support**: https://expo.canny.io/
- **Apple Developer**: https://developer.apple.com/support/
- **Google Play**: https://support.google.com/googleplay/

---

**Remember**: Start with security fixes first, then move through the checklist systematically. Each item is important for a successful app store deployment! 