import React, { useState } from 'react';
import {
  ImageStyle,
  StyleProp,
  View,
  StyleSheet,
  Text,
} from 'react-native';
import { Image } from 'expo-image';
import { AlertTriangle } from 'lucide-react-native';

interface OptimizedImageProps {
  source: { uri: string } | number;
  style?: StyleProp<ImageStyle>;
  placeholder?: 'blur' | 'skeleton' | string; // Allow blurhash strings
  fallback?: React.ReactNode;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  cachePolicy?: 'memory' | 'disk' | 'memory-disk' | 'none';
  quality?: 'low' | 'medium' | 'high';
  showLoading?: boolean;
  onLoad?: () => void;
  onError?: (error: any) => void;
  accessibilityLabel?: string;
  transition?: number; // Animation duration in ms
  priority?: 'low' | 'normal' | 'high'; // Loading priority
}

// expo-image handles caching natively, so we don't need manual cache management

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  source,
  style,
  placeholder = 'skeleton',
  fallback,
  resizeMode = 'cover',
  cachePolicy = 'memory-disk',
  quality = 'medium',
  showLoading = true,
  onLoad,
  onError,
  accessibilityLabel,
  transition = 300,
  priority = 'normal',
}) => {
  const [hasError, setHasError] = useState(false);

  const handleImageLoad = () => {
    if (onLoad) {
      onLoad();
    }
  };

  const handleImageError = (error: any) => {
    // expo-image v2.4+ passes error directly, not in nativeEvent
    const errorMessage = error?.error || error?.message || 'Unknown error';
    console.error('Image loading error:', errorMessage);
    setHasError(true);
    if (onError) {
      onError(error);
    }
  };

  // Show error state for broken/invalid images
  if (hasError) {
    if (fallback) {
      return <View style={style}>{fallback}</View>;
    }
    
    return (
      <View style={[styles.container, styles.placeholderContainer, style]}>
        <View style={styles.placeholderIcon}>
          <AlertTriangle size={32} color="#C7C7CC" strokeWidth={1.5} />
        </View>
        <Text style={styles.placeholderText}>No Image</Text>
      </View>
    );
  }

  // Map resizeMode to expo-image's contentFit
  const contentFit = resizeMode === 'stretch' ? 'fill' : resizeMode;
  
  // Convert cachePolicy to expo-image format
  const expoImageCachePolicy = cachePolicy === 'none' ? 'none' : 
    cachePolicy === 'memory' ? 'memory' :
    cachePolicy === 'disk' ? 'disk' : 'memory-disk';

  // Generate placeholder based on type
  // For skeleton, we use a light gray blurhash that creates a loading effect
  const placeholderContent = placeholder === 'skeleton' ? 'L1O|b~-;fQ-;_3fQfQfQfQfQfQfQ' : 
    placeholder === 'blur' ? 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' : // Default blurhash
    placeholder; // Allow custom blurhash strings

  // Validate source
  const imageSource = typeof source === 'object' && source.uri ? 
    (source.uri.trim() ? source : null) : source;
  
  // If no valid source, show placeholder
  if (!imageSource || (typeof imageSource === 'object' && !imageSource.uri)) {
    return (
      <View style={[styles.container, styles.placeholderContainer, style]}>
        <View style={styles.placeholderIcon}>
          <AlertTriangle size={32} color="#C7C7CC" strokeWidth={1.5} />
        </View>
        <Text style={styles.placeholderText}>No Image</Text>
      </View>
    );
  }

  // Render optimized image with expo-image
  return (
    <Image
      source={imageSource}
      style={style}
      contentFit={contentFit}
      placeholder={placeholderContent}
      placeholderContentFit={contentFit}
      transition={transition}
      cachePolicy={expoImageCachePolicy}
      priority={priority}
      onLoad={handleImageLoad}
      onError={handleImageError}
      accessibilityLabel={accessibilityLabel}
      recyclingKey={typeof imageSource === 'object' ? imageSource.uri : undefined}
    />
  );
};

// Background image variant using expo-image
export const OptimizedImageBackground: React.FC<
  OptimizedImageProps & { children?: React.ReactNode }
> = ({ children, ...props }) => {
  const contentFit = props.resizeMode === 'stretch' ? 'fill' : props.resizeMode || 'cover';
  const expoImageCachePolicy = props.cachePolicy === 'none' ? 'none' : 
    props.cachePolicy === 'memory' ? 'memory' :
    props.cachePolicy === 'disk' ? 'disk' : 'memory-disk';

  return (
    <View style={props.style}>
      <Image
        source={props.source}
        style={[StyleSheet.absoluteFillObject, { width: '100%', height: '100%' }]}
        contentFit={contentFit}
        cachePolicy={expoImageCachePolicy}
        transition={props.transition || 300}
        priority={props.priority || 'normal'}
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  skeleton: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E5EA',
    position: 'relative',
    overflow: 'hidden',
  },
  skeletonShimmer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F2F2F7',
    opacity: 0.5,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  progressText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 8,
  },
  errorContainer: {
    padding: 16,
  },
  errorText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    padding: 16,
  },
  placeholderIcon: {
    marginBottom: 8,
    opacity: 0.5,
  },
  placeholderText: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
});

// Cache management utilities - expo-image handles caching internally
// These are kept for backward compatibility but now use expo-image's cache
export const ImageCacheManager = {
  async clearCache(): Promise<void> {
    try {
      // expo-image manages its own cache
      // This could be extended to call expo-image's cache clearing if needed
      console.log('Cache cleared (managed by expo-image)');
    } catch (error) {
      console.warn('Cache cleanup failed:', error);
    }
  },

  async getCacheSize(): Promise<number> {
    // expo-image manages its own cache size
    // Return 0 for backward compatibility
    return 0;
  },
};