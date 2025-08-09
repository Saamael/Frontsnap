import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Colors, Typography, Spacing } from '@/constants/theme';

interface LoadingProps {
  size?: 'small' | 'large';
  message?: string;
  color?: string;
  style?: ViewStyle;
  fullScreen?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({
  size = 'large',
  message,
  color = Colors.primary,
  style,
  fullScreen = false,
}) => {
  const containerStyle = [
    fullScreen ? styles.fullScreenContainer : styles.container,
    style,
  ];

  return (
    <View style={containerStyle}>
      <ActivityIndicator
        size={size}
        color={color}
        accessibilityLabel="Loading"
        accessibilityHint="Content is loading"
      />
      {message && (
        <Text style={styles.message} accessibilityLabel={message}>
          {message}
        </Text>
      )}
    </View>
  );
};

// Skeleton component for content placeholders
interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
        },
        style,
      ]}
      accessibilityLabel="Loading content"
      accessibilityHint="Content placeholder while loading"
    />
  );
};

// Skeleton list item for consistent list loading states
export const SkeletonListItem: React.FC = () => {
  return (
    <View style={styles.skeletonListItem}>
      <View style={styles.skeletonListItemLeft}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={styles.skeletonListItemContent}>
          <Skeleton width="70%" height={16} />
          <Skeleton width="40%" height={14} style={{ marginTop: Spacing.xs }} />
        </View>
      </View>
      <Skeleton width={60} height={14} />
    </View>
  );
};

// Skeleton card for loading cards
export const SkeletonCard: React.FC = () => {
  return (
    <View style={styles.skeletonCard}>
      <Skeleton width="100%" height={120} borderRadius={8} />
      <View style={styles.skeletonCardContent}>
        <Skeleton width="80%" height={18} />
        <Skeleton width="60%" height={14} style={{ marginTop: Spacing.xs }} />
        <Skeleton width="40%" height={12} style={{ marginTop: Spacing.xs }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  fullScreenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  message: {
    ...Typography.styles.body2,
    marginTop: Spacing.md,
    textAlign: 'center',
    color: Colors.textSecondary,
  },
  skeleton: {
    backgroundColor: Colors.gray100,
  },
  skeletonListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.base,
    backgroundColor: Colors.surface,
  },
  skeletonListItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  skeletonListItemContent: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  skeletonCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  skeletonCardContent: {
    marginTop: Spacing.md,
  },
});

export default Loading;