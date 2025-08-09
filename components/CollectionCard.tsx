import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  AccessibilityInfo,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  MoreVertical, 
  Share2, 
  Globe, 
  Lock,
  Heart,
  MapPin
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface Collection {
  id: string;
  name: string;
  description?: string;
  color: string;
  is_public: boolean;
  cover_image?: string;
  place_count?: number;
  created_at: string;
  updated_at: string;
}

interface CollectionCardProps {
  collection: Collection;
  width?: number;
  onPress: () => void;
  onShare: () => void;
  onMenu: () => void;
  variant?: 'default' | 'compact' | 'featured';
}

export const CollectionCard: React.FC<CollectionCardProps> = ({
  collection,
  width,
  onPress,
  onShare,
  onMenu,
  variant = 'default',
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Calculate responsive dimensions
  const getCardDimensions = useCallback(() => {
    const isSmallDevice = screenWidth < 375;
    const baseWidth = width || (screenWidth - 64) / 2; // Default to half screen minus padding
    
    const dimensions = {
      width: baseWidth,
      height: variant === 'compact' ? baseWidth * 0.8 : baseWidth * 1.1,
      coverHeight: variant === 'compact' ? baseWidth * 0.4 : baseWidth * 0.6,
      borderRadius: Platform.OS === 'ios' ? 16 : 14,
      padding: isSmallDevice ? 12 : 16,
    };
    
    return dimensions;
  }, [width, screenWidth, variant]);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: new Date().getFullYear() !== new Date(dateString).getFullYear() ? 'numeric' : undefined,
    });
  }, []);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const handleShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onShare();
  };

  const handleMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onMenu();
  };

  const cardDimensions = getCardDimensions();
  const dynamicStyles = createDynamicStyles(cardDimensions);

  return (
    <TouchableOpacity 
      style={[
        dynamicStyles.card,
        variant === 'featured' && dynamicStyles.featuredCard
      ]}
      onPress={handlePress}
      activeOpacity={0.92}
      accessibilityRole="button"
      accessibilityLabel={`${collection.name} collection with ${collection.place_count || 0} places`}
      accessibilityHint="Double tap to view collection details"
    >
      {/* Cover Image/Color */}
      <View style={dynamicStyles.coverContainer}>
        {collection.cover_image ? (
          <Image 
            source={{ uri: collection.cover_image }} 
            style={dynamicStyles.coverImage}
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
            placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={[dynamicStyles.colorCover, { backgroundColor: collection.color || '#007AFF' }]}>
            {variant === 'featured' && (
              <View style={dynamicStyles.coverIcon}>
                <Heart size={32} color="#FFFFFF" strokeWidth={2} fill="#FFFFFF" />
              </View>
            )}
          </View>
        )}
        
        {/* Overlay with badges */}
        <View style={dynamicStyles.overlay}>
          <View style={dynamicStyles.topBadges}>
            <View style={[
              dynamicStyles.privacyBadge,
              collection.is_public ? dynamicStyles.publicBadge : dynamicStyles.privateBadge
            ]}>
              {collection.is_public ? (
                <Globe size={10} color="#FFFFFF" strokeWidth={2} />
              ) : (
                <Lock size={10} color="#FFFFFF" strokeWidth={2} />
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Content */}
      <View style={dynamicStyles.content}>
        <View style={dynamicStyles.header}>
          <Text 
            style={[
              dynamicStyles.title,
              variant === 'featured' && dynamicStyles.featuredTitle
            ]} 
            numberOfLines={variant === 'compact' ? 1 : 2}
            adjustsFontSizeToFit
            minimumFontScale={0.9}
          >
            {collection.name}
          </Text>
          <TouchableOpacity
            style={dynamicStyles.menuButton}
            onPress={handleMenu}
            hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Collection options"
          >
            <MoreVertical size={16} color="#8E8E93" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {collection.description && variant !== 'compact' && (
          <Text 
            style={dynamicStyles.description} 
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.9}
          >
            {collection.description}
          </Text>
        )}

        <View style={dynamicStyles.footer}>
          <View style={dynamicStyles.meta}>
            <View style={dynamicStyles.metaItem}>
              <MapPin size={12} color="#8E8E93" strokeWidth={2} />
              <Text style={dynamicStyles.metaText}>
                {collection.place_count || 0}
              </Text>
            </View>
            <Text style={dynamicStyles.metaDivider}>•</Text>
            <Text style={dynamicStyles.metaText}>
              {formatDate(collection.created_at)}
            </Text>
          </View>

          <TouchableOpacity
            style={dynamicStyles.shareButton}
            onPress={handleShare}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Share collection"
          >
            <Share2 size={14} color="#007AFF" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const createDynamicStyles = (dimensions: any) => StyleSheet.create({
  card: {
    width: dimensions.width,
    height: dimensions.height,
    backgroundColor: '#FFFFFF',
    borderRadius: dimensions.borderRadius,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
    borderWidth: Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 0.5,
    borderColor: '#E5E5E7',
    overflow: 'hidden',
  },
  featuredCard: {
    ...Platform.select({
      ios: {
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
    borderColor: '#007AFF20',
    borderWidth: 1,
  },
  coverContainer: {
    height: dimensions.coverHeight,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  colorCover: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverIcon: {
    opacity: 0.6,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: 12,
  },
  topBadges: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  privacyBadge: {
    borderRadius: 12,
    padding: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
    }),
  },
  publicBadge: {
    backgroundColor: 'rgba(52, 199, 89, 0.9)',
  },
  privateBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  content: {
    flex: 1,
    padding: dimensions.padding,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    flex: 1,
    marginRight: 8,
    lineHeight: 20,
    ...Platform.select({
      ios: {
        letterSpacing: -0.2,
      },
    }),
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: '700',
    ...Platform.select({
      ios: {
        letterSpacing: -0.3,
      },
    }),
  },
  menuButton: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  description: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 18,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  metaText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
    marginLeft: 4,
  },
  metaDivider: {
    fontSize: 12,
    color: '#C7C7CC',
    marginRight: 8,
  },
  shareButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F0F8FF',
  },
});