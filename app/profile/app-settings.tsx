import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { 
  ArrowLeft, 
  Moon, 
  Sun, 
  Smartphone,
  Globe,
  Type,
  Trash2,
  MapPin,
  Wifi,
  Volume2
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { HapticFeedback } from '@/utils/haptics';
import { useToast } from '@/hooks/useToast';
import { Toast } from '@/components/Toast';
import { ImageCacheManager } from '@/components/OptimizedImage';
import { useSettings, AppSettings } from '@/contexts/SettingsContext';

// AppSettings interface is now imported from SettingsContext
// No duplicate interface definition needed

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
];

const FONT_SIZES = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'extra_large', label: 'Extra Large' },
];

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export default function AppSettingsScreen() {
  const router = useRouter();
  const { toast, showSuccess, showError, showInfo, hideToast } = useToast();
  const { settings, updateSetting, colors, isDarkMode, isLoading } = useSettings();

  // Settings are now managed by SettingsContext

  const handleBack = () => {
    HapticFeedback.light();
    router.back();
  };

  const handleThemeChange = async (theme: AppSettings['theme']) => {
    HapticFeedback.selection();
    try {
      await updateSetting('theme', theme);
      showSuccess('Saved', 'Theme updated successfully');
    } catch (error) {
      showError('Save Failed', 'Failed to save theme setting');
    }
  };

  const handleLanguageChange = async (language: string) => {
    HapticFeedback.selection();
    try {
      await updateSetting('language', language);
      showSuccess('Saved', 'Language updated successfully');
    } catch (error) {
      showError('Save Failed', 'Failed to save language setting');
    }
  };

  const handleToggleSetting = async (key: keyof AppSettings, value: boolean) => {
    HapticFeedback.selection();
    try {
      await updateSetting(key, value);
      showSuccess('Saved', 'Setting updated successfully');
    } catch (error) {
      showError('Save Failed', 'Failed to save setting');
    }
  };

  const handleOptionChange = async (key: keyof AppSettings, value: string) => {
    HapticFeedback.selection();
    try {
      await updateSetting(key, value);
      showSuccess('Saved', 'Setting updated successfully');
    } catch (error) {
      showError('Save Failed', 'Failed to save setting');
    }
  };

  const handleClearCache = async () => {
    HapticFeedback.medium();
    
    try {
      // Get cache size before clearing
      const cacheSize = await ImageCacheManager.getCacheSize();
      const formattedSize = formatBytes(cacheSize);
      
      Alert.alert(
        'Clear Cache',
        `This will clear ${formattedSize} of cached images and data. The app may take longer to load content temporarily.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear Cache',
            style: 'destructive',
            onPress: async () => {
              try {
                await ImageCacheManager.clearCache();
                showSuccess('Cache Cleared', `Freed ${formattedSize} of storage space`);
              } catch (error) {
                console.error('Failed to clear cache:', error);
                showError('Clear Failed', 'Failed to clear app cache');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to get cache size:', error);
      // Fallback to simple clear without size display
      Alert.alert(
        'Clear Cache',
        'This will clear all cached images and data. The app may take longer to load content temporarily.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear Cache',
            style: 'destructive',
            onPress: async () => {
              try {
                await ImageCacheManager.clearCache();
                showSuccess('Cache Cleared', 'App cache has been cleared');
              } catch (error) {
                console.error('Failed to clear cache:', error);
                showError('Clear Failed', 'Failed to clear app cache');
              }
            },
          },
        ]
      );
    }
  };

  const SettingRow = ({ 
    icon: Icon, 
    title, 
    subtitle, 
    rightComponent 
  }: {
    icon: any;
    title: string;
    subtitle?: string;
    rightComponent: React.ReactNode;
  }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          <Icon size={20} color="#007AFF" strokeWidth={2} />
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightComponent}
      </View>
    </View>
  );

  const ThemeSelector = () => (
    <View style={styles.optionContainer}>
      {[
        { value: 'light', label: 'Light', icon: Sun },
        { value: 'dark', label: 'Dark', icon: Moon },
        { value: 'system', label: 'System', icon: Smartphone },
      ].map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.optionButton,
            dynamicStyles.optionButton,
            settings.theme === option.value && [styles.optionButtonSelected, dynamicStyles.optionButtonSelected],
          ]}
          onPress={() => handleThemeChange(option.value as AppSettings['theme'])}
          accessibilityLabel={`${option.label} theme`}
          accessibilityRole="button"
          accessibilityState={{ selected: settings.theme === option.value }}
        >
          <option.icon size={16} color={settings.theme === option.value ? '#FFFFFF' : colors.primary} />
          <Text style={[
            styles.optionText,
            dynamicStyles.optionText,
            settings.theme === option.value && styles.optionTextSelected,
          ]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const LanguageSelector = () => {
    const currentLanguage = LANGUAGES.find(lang => lang.code === settings.language);
    
    return (
      <TouchableOpacity
        style={styles.valueButton}
        onPress={() => {
          // TODO: Show language selection modal
          showInfo('Coming Soon', 'Language selection will be available soon');
        }}
        accessibilityLabel={`Current language: ${currentLanguage?.name}`}
        accessibilityRole="button"
      >
        <Text style={[styles.valueText, dynamicStyles.valueText]}>{currentLanguage?.name || 'English'}</Text>
      </TouchableOpacity>
    );
  };

  const FontSizeSelector = () => {
    const currentSize = FONT_SIZES.find(size => size.value === settings.fontSize);
    
    return (
      <TouchableOpacity
        style={styles.valueButton}
        onPress={() => {
          // TODO: Show font size selection modal
          showInfo('Coming Soon', 'Font size selection will be available soon');
        }}
        accessibilityLabel={`Current font size: ${currentSize?.label}`}
        accessibilityRole="button"
      >
        <Text style={[styles.valueText, dynamicStyles.valueText]}>{currentSize?.label || 'Medium'}</Text>
      </TouchableOpacity>
    );
  };

  // Create dynamic styles based on theme
  const dynamicStyles = createDynamicStyles(colors);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, dynamicStyles.loadingText]}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      {/* Header */}
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <ArrowLeft size={24} color={colors.primary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>App Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Appearance */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Appearance</Text>
          <View style={[styles.settingContainer, dynamicStyles.settingContainer]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, dynamicStyles.settingIcon]}>
                  <Moon size={20} color={colors.primary} strokeWidth={2} />
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, dynamicStyles.settingTitle]}>Theme</Text>
                  <Text style={[styles.settingSubtitle, dynamicStyles.settingSubtitle]}>Choose your preferred theme</Text>
                </View>
              </View>
            </View>
            <ThemeSelector />
          </View>
        </View>

        {/* Localization */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Localization</Text>
          <View style={[styles.settingContainer, dynamicStyles.settingContainer]}>
            <SettingRow
              icon={Globe}
              title="Language"
              subtitle="App display language"
              rightComponent={<LanguageSelector />}
            />
            <SettingRow
              icon={MapPin}
              title="Units"
              subtitle="Distance and measurement units"
              rightComponent={
                <View style={styles.switchContainer}>
                  <Text style={[styles.switchLabel, dynamicStyles.switchLabel]}>
                    {settings.units === 'metric' ? 'Metric' : 'Imperial'}
                  </Text>
                  <Switch
                    value={settings.units === 'imperial'}
                    onValueChange={(value) => 
                      handleOptionChange('units', value ? 'imperial' : 'metric')
                    }
                    trackColor={{ false: '#E5E5E7', true: '#34C759' }}
                    thumbColor="#FFFFFF"
                    accessibilityLabel="Toggle between metric and imperial units"
                  />
                </View>
              }
            />
          </View>
        </View>

        {/* Typography */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Typography</Text>
          <View style={[styles.settingContainer, dynamicStyles.settingContainer]}>
            <SettingRow
              icon={Type}
              title="Font Size"
              subtitle="Text size throughout the app"
              rightComponent={<FontSizeSelector />}
            />
          </View>
        </View>

        {/* Storage */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Storage</Text>
          <View style={[styles.settingContainer, dynamicStyles.settingContainer]}>
            <SettingRow
              icon={Trash2}
              title="Clear Cache"
              subtitle="Free up storage space"
              rightComponent={
                <TouchableOpacity
                  style={[styles.clearButton, dynamicStyles.clearButton]}
                  onPress={handleClearCache}
                  accessibilityLabel="Clear app cache"
                  accessibilityRole="button"
                >
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
              }
            />
          </View>
        </View>

        {/* Maps */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Maps</Text>
          <View style={[styles.settingContainer, dynamicStyles.settingContainer]}>
            <SettingRow
              icon={Wifi}
              title="Show Traffic"
              subtitle="Display traffic information on maps"
              rightComponent={
                <Switch
                  value={settings.showTraffic}
                  onValueChange={(value) => handleToggleSetting('showTraffic', value)}
                  trackColor={{ false: '#E5E5E7', true: '#34C759' }}
                  thumbColor="#FFFFFF"
                  accessibilityLabel="Toggle traffic display"
                />
              }
            />
            <SettingRow
              icon={MapPin}
              title="Auto Location"
              subtitle="Automatically detect your location"
              rightComponent={
                <Switch
                  value={settings.autoLocation}
                  onValueChange={(value) => handleToggleSetting('autoLocation', value)}
                  trackColor={{ false: '#E5E5E7', true: '#34C759' }}
                  thumbColor="#FFFFFF"
                  accessibilityLabel="Toggle auto location detection"
                />
              }
            />
          </View>
        </View>

        {/* Feedback */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Feedback</Text>
          <View style={[styles.settingContainer, dynamicStyles.settingContainer]}>
            <SettingRow
              icon={Volume2}
              title="Sound Effects"
              subtitle="Play sounds for interactions"
              rightComponent={
                <Switch
                  value={settings.soundEnabled}
                  onValueChange={(value) => handleToggleSetting('soundEnabled', value)}
                  trackColor={{ false: '#E5E5E7', true: '#34C759' }}
                  thumbColor="#FFFFFF"
                  accessibilityLabel="Toggle sound effects"
                />
              }
            />
            <SettingRow
              icon={Smartphone}
              title="Vibration"
              subtitle="Haptic feedback for interactions"
              rightComponent={
                <Switch
                  value={settings.vibrationEnabled}
                  onValueChange={(value) => handleToggleSetting('vibrationEnabled', value)}
                  trackColor={{ false: '#E5E5E7', true: '#34C759' }}
                  thumbColor="#FFFFFF"
                  accessibilityLabel="Toggle vibration feedback"
                />
              }
            />
          </View>
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

// Dynamic styles function that takes theme colors
const createDynamicStyles = (colors: any) => StyleSheet.create({
  container: {
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.textSecondary,
  },
  header: {
    backgroundColor: colors.background,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    color: colors.text,
  },
  sectionTitle: {
    color: colors.text,
  },
  settingContainer: {
    backgroundColor: colors.surface,
  },
  settingIcon: {
    backgroundColor: colors.primary + '20',
  },
  settingTitle: {
    color: colors.text,
  },
  settingSubtitle: {
    color: colors.textSecondary,
  },
  optionButton: {
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  optionButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    color: colors.primary,
  },
  valueText: {
    color: colors.textSecondary,
  },
  switchLabel: {
    color: colors.textSecondary,
  },
  clearButton: {
    backgroundColor: colors.error,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C2C2E',
    marginBottom: 16,
  },
  settingContainer: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#007AFF20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C2C2E',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  optionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  optionButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  optionTextSelected: {
    color: '#FFFFFF',
  },
  valueButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  valueText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchLabel: {
    fontSize: 16,
    color: '#8E8E93',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});