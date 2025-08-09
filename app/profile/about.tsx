import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { 
  ArrowLeft, 
  ExternalLink, 
  Heart, 
  Star, 
  Globe, 
  Mail, 
  Twitter, 
  Instagram,
  Shield,
  FileText,
  Info
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { HapticFeedback } from '@/utils/haptics';
import { useToast } from '@/hooks/useToast';
import { Toast } from '@/components/Toast';

export default function AboutScreen() {
  const router = useRouter();
  const { toast, showSuccess, showError, showInfo, hideToast } = useToast();

  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const buildNumber = Constants.expoConfig?.runtimeVersion || '1';

  const handleBack = () => {
    HapticFeedback.light();
    router.back();
  };

  const handleOpenLink = async (url: string, title: string) => {
    try {
      HapticFeedback.light();
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        showError('Link Error', `Cannot open ${title}`);
      }
    } catch (error) {
      console.error('Error opening link:', error);
      showError('Link Error', `Failed to open ${title}`);
    }
  };

  const handleRateApp = () => {
    HapticFeedback.medium();
    Alert.alert(
      'Rate FrontSnap',
      'Would you like to rate us on the App Store?',
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Rate App',
          onPress: () => {
            // TODO: Replace with actual app store URLs
            const appStoreUrl = 'https://apps.apple.com/app/frontsnap/id123456789';
            const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.frontsnap.app';
            
            const url = Platform.OS === 'ios' ? appStoreUrl : playStoreUrl;
            handleOpenLink(url, 'App Store');
          },
        },
      ]
    );
  };

  const handleShareApp = async () => {
    try {
      HapticFeedback.medium();
      const result = await Share.share({
        message: 'Check out FrontSnap - Discover amazing places with AI-powered reviews! Download now:',
        // TODO: Replace with actual app store URLs
        url: 'https://frontsnap.app',
      });

      if (result.action === Share.sharedAction) {
        showSuccess('Shared!', 'Thanks for sharing FrontSnap');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      showError('Share Failed', 'Unable to share app');
    }
  };

  const InfoRow = ({ 
    icon: Icon, 
    title, 
    value, 
    onPress, 
    showArrow = false 
  }: {
    icon: any;
    title: string;
    value: string;
    onPress?: () => void;
    showArrow?: boolean;
  }) => (
    <TouchableOpacity
      style={styles.infoRow}
      onPress={onPress}
      disabled={!onPress}
      accessibilityLabel={`${title}: ${value}`}
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityHint={onPress ? "Double tap to open" : undefined}
    >
      <View style={styles.infoRowLeft}>
        <View style={styles.infoIcon}>
          <Icon size={20} color="#007AFF" strokeWidth={2} />
        </View>
        <View style={styles.infoTextContainer}>
          <Text style={styles.infoTitle}>{title}</Text>
          <Text style={styles.infoValue}>{value}</Text>
        </View>
      </View>
      {showArrow && (
        <ExternalLink size={16} color="#C7C7CC" strokeWidth={2} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <ArrowLeft size={24} color="#007AFF" strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About FrontSnap</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* App Info Section */}
        <View style={styles.section}>
          <View style={styles.appLogoContainer}>
            <View style={styles.appLogo}>
              <Text style={styles.appLogoText}>FS</Text>
            </View>
            <Text style={styles.appName}>FrontSnap</Text>
            <Text style={styles.appTagline}>Discover. Review. Share.</Text>
          </View>

          <View style={styles.versionContainer}>
            <Text style={styles.versionText}>Version {appVersion}</Text>
            <Text style={styles.buildText}>Build {buildNumber}</Text>
          </View>
        </View>

        {/* App Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Information</Text>
          <View style={styles.infoContainer}>
            <InfoRow
              icon={Info}
              title="Version"
              value={`${appVersion} (${buildNumber})`}
            />
            <InfoRow
              icon={Globe}
              title="Website"
              value="frontsnap.app"
              onPress={() => handleOpenLink('https://frontsnap.app', 'Website')}
              showArrow
            />
            <InfoRow
              icon={Mail}
              title="Support"
              value="support@frontsnap.app"
              onPress={() => handleOpenLink('mailto:support@frontsnap.app', 'Email')}
              showArrow
            />
          </View>
        </View>

        {/* Legal Documents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <View style={styles.infoContainer}>
            <InfoRow
              icon={Shield}
              title="Privacy Policy"
              value="Our privacy commitment"
              onPress={() => {
                // 🔗 REPLACE THIS URL WITH YOUR PRIVACY POLICY LINK
                handleOpenLink('https://frontsnap.app/privacy-policy', 'Privacy Policy');
              }}
              showArrow
            />
            <InfoRow
              icon={FileText}
              title="Terms of Service"
              value="Usage terms and conditions"
              onPress={() => {
                // 🔗 REPLACE THIS URL WITH YOUR TERMS OF SERVICE LINK
                handleOpenLink('https://frontsnap.app/terms-of-service', 'Terms of Service');
              }}
              showArrow
            />
            <InfoRow
              icon={FileText}
              title="Licenses"
              value="Open source acknowledgments"
              onPress={() => {
                // 🔗 REPLACE THIS URL WITH YOUR LICENSES PAGE LINK
                handleOpenLink('https://frontsnap.app/licenses', 'Open Source Licenses');
              }}
              showArrow
            />
          </View>
        </View>

        {/* Social Media */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connect With Us</Text>
          <View style={styles.socialContainer}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => {
                // 🔗 REPLACE WITH YOUR TWITTER HANDLE
                handleOpenLink('https://twitter.com/frontsnap', 'Twitter');
              }}
              accessibilityLabel="Follow us on Twitter"
              accessibilityRole="button"
            >
              <Twitter size={24} color="#1DA1F2" strokeWidth={2} />
              <Text style={styles.socialText}>Twitter</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => {
                // 🔗 REPLACE WITH YOUR INSTAGRAM HANDLE
                handleOpenLink('https://instagram.com/frontsnap', 'Instagram');
              }}
              accessibilityLabel="Follow us on Instagram"
              accessibilityRole="button"
            >
              <Instagram size={24} color="#E4405F" strokeWidth={2} />
              <Text style={styles.socialText}>Instagram</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleRateApp}
            accessibilityLabel="Rate FrontSnap"
            accessibilityRole="button"
          >
            <Star size={20} color="#FFD700" strokeWidth={2} />
            <Text style={styles.actionButtonText}>Rate FrontSnap</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleShareApp}
            accessibilityLabel="Share FrontSnap"
            accessibilityRole="button"
          >
            <Heart size={20} color="#FF3B30" strokeWidth={2} />
            <Text style={styles.actionButtonText}>Share with Friends</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Made with ❤️ by SUPERING TECHNOLOGY</Text>
          <Text style={styles.footerSubtext}>© 2024 FrontSnap. All rights reserved.</Text>
        </View>
      </ScrollView>

      <Toast
        visible={toast.visible}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        duration={toast.duration}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C2C2E',
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  appLogoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  appLogo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  appLogoText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2C2C2E',
    marginBottom: 4,
  },
  appTagline: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  versionContainer: {
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  versionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2E',
  },
  buildText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C2C2E',
    marginBottom: 16,
  },
  infoContainer: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#007AFF20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C2C2E',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#8E8E93',
  },
  socialContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
  },
  socialText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C2C2E',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C2C2E',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C2C2E',
    marginBottom: 8,
    textAlign: 'center',
  },
  footerSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
});