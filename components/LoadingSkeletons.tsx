import React from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  ViewStyle,
} from 'react-native';

const { width } = Dimensions.get('window');

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

// Base skeleton component with shimmer animation
const SkeletonBase: React.FC<SkeletonProps> = ({
  width: skeletonWidth = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const shimmerAnimation = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const startShimmer = () => {
      Animated.sequence([
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnimation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => startShimmer());
    };

    startShimmer();
  }, [shimmerAnimation]);

  const shimmerOpacity = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View
      style={[
        styles.skeletonBase,
        {
          width: skeletonWidth,
          height,
          borderRadius,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            opacity: shimmerOpacity,
            borderRadius,
          },
        ]}
      />
    </View>
  );
};

// Place card skeleton
export const PlaceCardSkeleton: React.FC = () => (
  <View style={styles.placeCardSkeleton}>
    <SkeletonBase width="100%" height={120} borderRadius={12} />
    <View style={styles.placeCardContent}>
      <SkeletonBase width="80%" height={18} style={{ marginBottom: 8 }} />
      <SkeletonBase width="60%" height={14} style={{ marginBottom: 4 }} />
      <View style={styles.placeCardMeta}>
        <SkeletonBase width={60} height={14} />
        <SkeletonBase width={40} height={14} />
      </View>
    </View>
  </View>
);

// Collection card skeleton
export const CollectionCardSkeleton: React.FC = () => (
  <View style={styles.collectionCardSkeleton}>
    <SkeletonBase width="100%" height={100} borderRadius={8} />
    <View style={styles.collectionCardContent}>
      <SkeletonBase width="70%" height={16} style={{ marginBottom: 6 }} />
      <SkeletonBase width="50%" height={12} />
    </View>
  </View>
);

// Review skeleton
export const ReviewSkeleton: React.FC = () => (
  <View style={styles.reviewSkeleton}>
    <View style={styles.reviewHeader}>
      <SkeletonBase width={40} height={40} borderRadius={20} />
      <View style={styles.reviewUserInfo}>
        <SkeletonBase width={120} height={14} style={{ marginBottom: 4 }} />
        <SkeletonBase width={80} height={12} />
      </View>
    </View>
    <SkeletonBase width="90%" height={12} style={{ marginTop: 12, marginBottom: 4 }} />
    <SkeletonBase width="70%" height={12} style={{ marginBottom: 4 }} />
    <SkeletonBase width="40%" height={12} />
  </View>
);

// Search results skeleton
export const SearchResultSkeleton: React.FC = () => (
  <View style={styles.searchResultSkeleton}>
    <SkeletonBase width={24} height={24} borderRadius={12} />
    <View style={styles.searchResultContent}>
      <SkeletonBase width="70%" height={16} style={{ marginBottom: 4 }} />
      <SkeletonBase width="50%" height={12} />
    </View>
  </View>
);

// Profile skeleton
export const ProfileSkeleton: React.FC = () => (
  <View style={styles.profileSkeleton}>
    <View style={styles.profileHeader}>
      <SkeletonBase width={80} height={80} borderRadius={40} />
      <View style={styles.profileInfo}>
        <SkeletonBase width={150} height={20} style={{ marginBottom: 8 }} />
        <SkeletonBase width={100} height={14} style={{ marginBottom: 4 }} />
        <SkeletonBase width={120} height={14} />
      </View>
    </View>
    <View style={styles.profileStats}>
      <View style={styles.statItem}>
        <SkeletonBase width={30} height={18} style={{ marginBottom: 4 }} />
        <SkeletonBase width={50} height={12} />
      </View>
      <View style={styles.statItem}>
        <SkeletonBase width={30} height={18} style={{ marginBottom: 4 }} />
        <SkeletonBase width={50} height={12} />
      </View>
      <View style={styles.statItem}>
        <SkeletonBase width={30} height={18} style={{ marginBottom: 4 }} />
        <SkeletonBase width={50} height={12} />
      </View>
    </View>
  </View>
);

// Map placeholder skeleton
export const MapSkeleton: React.FC = () => (
  <View style={styles.mapSkeleton}>
    <SkeletonBase width="100%" height={200} borderRadius={12} />
    <View style={styles.mapControls}>
      <SkeletonBase width={40} height={40} borderRadius={20} />
      <SkeletonBase width={40} height={40} borderRadius={20} />
    </View>
  </View>
);

// List loading skeleton
export const ListLoadingSkeleton: React.FC<{
  count?: number;
  ItemSkeleton: React.ComponentType;
}> = ({ count = 5, ItemSkeleton }) => (
  <View style={styles.listSkeleton}>
    {Array.from({ length: count }).map((_, index) => (
      <ItemSkeleton key={`skeleton-${index}`} />
    ))}
  </View>
);

// Generic content skeleton
export const ContentSkeleton: React.FC<{
  lines?: number;
  showTitle?: boolean;
}> = ({ lines = 3, showTitle = true }) => (
  <View style={styles.contentSkeleton}>
    {showTitle && (
      <SkeletonBase width="60%" height={20} style={{ marginBottom: 16 }} />
    )}
    {Array.from({ length: lines }).map((_, index) => (
      <SkeletonBase
        key={`line-${index}`}
        width={index === lines - 1 ? '70%' : '100%'}
        height={14}
        style={{ marginBottom: 8 }}
      />
    ))}
  </View>
);

// Loading screen skeleton
export const ScreenLoadingSkeleton: React.FC<{
  showHeader?: boolean;
  showSearch?: boolean;
  itemCount?: number;
}> = ({ showHeader = true, showSearch = true, itemCount = 6 }) => (
  <View style={styles.screenSkeleton}>
    {showHeader && (
      <View style={styles.headerSkeleton}>
        <SkeletonBase width={150} height={24} />
        <SkeletonBase width={40} height={40} borderRadius={20} />
      </View>
    )}
    
    {showSearch && (
      <View style={styles.searchSkeleton}>
        <SkeletonBase width="85%" height={44} borderRadius={22} />
        <SkeletonBase width={44} height={44} borderRadius={22} />
      </View>
    )}
    
    <ListLoadingSkeleton count={itemCount} ItemSkeleton={PlaceCardSkeleton} />
  </View>
);

const styles = StyleSheet.create({
  skeletonBase: {
    backgroundColor: '#E5E5EA',
    overflow: 'hidden',
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F2F2F7',
  },
  
  // Place card skeleton
  placeCardSkeleton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  placeCardContent: {
    padding: 16,
  },
  placeCardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  
  // Collection card skeleton
  collectionCardSkeleton: {
    width: (width - 60) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  collectionCardContent: {
    padding: 12,
  },
  
  // Review skeleton
  reviewSkeleton: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    marginHorizontal: 20,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewUserInfo: {
    marginLeft: 12,
    flex: 1,
  },
  
  // Search result skeleton
  searchResultSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  searchResultContent: {
    marginLeft: 12,
    flex: 1,
  },
  
  // Profile skeleton
  profileSkeleton: {
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  profileInfo: {
    marginLeft: 20,
    flex: 1,
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  
  // Map skeleton
  mapSkeleton: {
    position: 'relative',
  },
  mapControls: {
    position: 'absolute',
    top: 16,
    right: 16,
    gap: 8,
  },
  
  // List skeleton
  listSkeleton: {
    flex: 1,
  },
  
  // Content skeleton
  contentSkeleton: {
    padding: 20,
  },
  
  // Screen skeleton
  screenSkeleton: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  headerSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  searchSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
});

export default SkeletonBase;