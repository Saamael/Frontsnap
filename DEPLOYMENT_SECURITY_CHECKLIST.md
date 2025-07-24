# 🔐 Deployment Security Checklist

## ⚠️ CRITICAL - Complete Before Deployment

### 1. Environment Variables Setup ✅ IMPLEMENTED
- [x] **API keys moved to server-side only**
  - ✅ Removed `EXPO_PUBLIC_` prefix from sensitive keys
  - ✅ Only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are client-accessible
  - ✅ OpenAI and Google keys now server-side only via secure API endpoints

- [ ] **Setup Production Environment Variables**
  ```bash
  # Server-side only (not EXPO_PUBLIC_) - ✅ CONFIGURED
  OPENAI_API_KEY=your_actual_openai_key
  GOOGLE_PLACES_API_KEY=your_actual_google_key
  GOOGLE_MAPS_API_KEY=your_actual_maps_key
  
  # Client-side (EXPO_PUBLIC_ prefix)
  EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
  EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
  ```

### 2. API Keys Security Configuration

#### Google APIs Console
- [ ] **Restrict API Keys by Domain/App**
  - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
  - For each API key, click "Edit"
  - Under "Application restrictions":
    - For mobile app: Select "Android apps" and add your package name + SHA-1
    - For web: Select "HTTP referrers" and add your domain
  - Under "API restrictions": Select only needed APIs (Places, Maps, Geocoding)

#### OpenAI API Security
- [ ] **Set Usage Limits**
  - Go to [OpenAI Usage Dashboard](https://platform.openai.com/usage)
  - Set monthly spending limits
  - Enable email alerts for usage thresholds
- [ ] **Restrict API Key Permissions**
  - Create project-specific API keys
  - Set minimum required permissions only

#### Supabase Security
- [ ] **Configure RLS Policies**
  - Verify all tables have Row Level Security enabled
  - Test policies with different user roles
- [ ] **Setup Supabase Auth Rules**
  - Go to Supabase Dashboard > Authentication > Settings
  - Set password requirements: minimum 8 characters
  - Enable email confirmation
  - Configure session timeout (recommended: 24 hours)

### 3. Network Security ✅ IMPLEMENTED

#### CORS Configuration ✅ IMPLEMENTED
- [x] **Secure CORS configuration**
  - ✅ Removed wildcard (*) origins
  - ✅ Added domain whitelist validation
  - ✅ Added security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)
  - ✅ Origin validation for API requests

#### Input Validation & Sanitization ✅ IMPLEMENTED
- [x] **Enhanced password requirements**
  - ✅ Minimum 8 characters (upgraded from 6)
  - ✅ Must contain uppercase, lowercase, and numbers
  - ✅ Common password detection
  - ✅ Maximum length limits to prevent DoS
  
- [x] **Comprehensive input validation**
  - ✅ Email validation with sanitization
  - ✅ Name validation with character restrictions
  - ✅ Text sanitization removing HTML/script tags
  - ✅ URL validation with HTTPS-only requirement
  - ✅ Coordinate and rating validation

#### Error Handling ✅ IMPLEMENTED
- [x] **Secure error messages**
  - ✅ Generic error messages for users
  - ✅ Detailed logging only in development
  - ✅ No sensitive information disclosure
  - ✅ Safe error mapping for all error types

#### Expo App Configuration
- [ ] **Update app.json security settings**
  ```json
  {
    "expo": {
      "ios": {
        "bundleIdentifier": "com.yourcompany.frontsnap",
        "buildNumber": "1.0.0"
      },
      "android": {
        "package": "com.yourcompany.frontsnap",
        "versionCode": 1,
        "permissions": [
          "CAMERA",
          "ACCESS_FINE_LOCATION",
          "ACCESS_COARSE_LOCATION"
        ]
      }
    }
  }
  ```

#### Domain Configuration ✅ PARTIALLY IMPLEMENTED
- [x] **CORS configured for production**
  - ✅ Domain whitelist implemented in API endpoints
  - ❗ **MANUAL ACTION REQUIRED**: Update the allowed origins in:
    - `/app/api/google-places+api.ts` (lines 11-16)
    - `/app/api/openai+api.ts` (lines 11-15)
    - Replace `'https://your-production-domain.com'` with your actual domain
  - [ ] Test from your production domain after deployment

### 4. Database Security

#### Supabase Database
- [ ] **Review Row Level Security Policies**
  - Test user can only access their own data
  - Verify admin policies work correctly
  - Check anonymous access is properly restricted

- [ ] **Database Backups**
  - Enable automatic backups in Supabase dashboard
  - Test backup restoration process

### 5. Mobile App Store Security

#### App Store Connect (iOS)
- [ ] **Configure App Transport Security**
  - Ensure all HTTP connections use HTTPS
  - No exceptions for insecure connections

#### Google Play Console (Android)
- [ ] **App Signing Configuration**
  - Use Google Play App Signing
  - Keep upload key secure and backed up
  - Configure app bundle settings

### 6. Production Testing

#### Security Testing
- [ ] **Test Authentication Flow**
  - Sign up with various email formats
  - Test login with wrong credentials
  - Verify password reset works
  - Test session expiration

- [ ] **Test API Endpoints**
  - Verify API keys work from production environment
  - Test rate limiting (if implemented)
  - Check error messages don't expose sensitive info

- [ ] **Test Permissions**
  - Camera access works properly
  - Location access works properly
  - Permissions are requested appropriately

### 7. Monitoring Setup

#### Error Tracking
- [ ] **Setup Error Monitoring**
  - Consider: Sentry, Bugsnag, or Expo's error tracking
  - Configure to NOT log sensitive data (passwords, API keys)

#### Analytics
- [ ] **Setup Privacy-Compliant Analytics**
  - Ensure GDPR/CCPA compliance
  - Don't track sensitive user data
  - Provide opt-out mechanisms

### 8. Legal & Compliance

#### Privacy & Terms
- [ ] **Create Privacy Policy**
  - Detail what data you collect
  - Explain how data is used and stored
  - Provide contact information for data requests

- [ ] **Create Terms of Service**
  - Define acceptable use
  - Outline user responsibilities
  - Include limitation of liability

- [ ] **App Store Compliance**
  - iOS: Review App Store Review Guidelines
  - Android: Review Google Play Developer Policy

### 9. Final Pre-Launch Checks

#### Code Review
- [ ] **Remove Debug Code**
  - No console.log with sensitive data
  - Remove test credentials
  - Remove debug flags

#### Build Configuration
- [ ] **Production Build Settings**
  - Set correct build variants (release/production)
  - Verify minification is enabled
  - Check source maps are not publicly accessible

#### Domain Setup
- [ ] **SSL/TLS Configuration**
  - Verify HTTPS certificates are valid
  - Test SSL configuration (A+ rating on SSL Labs)
  - Configure HSTS headers if applicable

---

## 🚨 Emergency Contacts

**If Security Issue Found:**
1. Immediately revoke compromised API keys
2. Reset user passwords if auth is compromised
3. Check logs for unauthorized access
4. Contact: [Your security team email]

**API Key Rotation Schedule:**
- Google APIs: Every 6 months
- OpenAI: Every 3 months  
- Supabase: When team members leave

---

## ✅ Sign-off

- [ ] **Security Lead Approval**: _________________ Date: _______
- [ ] **Technical Lead Approval**: _________________ Date: _______
- [ ] **Final Security Scan Complete**: _________________ Date: _______

**Deployment Authorization**: Only proceed when ALL items are checked ✅