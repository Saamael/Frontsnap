import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Check, X, AlertTriangle, Info } from 'lucide-react-native';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  visible: boolean;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onHide: () => void;
}

const { width } = Dimensions.get('window');

export const Toast: React.FC<ToastProps> = ({
  visible,
  type,
  title,
  message,
  duration = 3000,
  onHide,
}) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hideToast();
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Check size={20} color="#FFFFFF" strokeWidth={2} />;
      case 'error':
        return <X size={20} color="#FFFFFF" strokeWidth={2} />;
      case 'warning':
        return <AlertTriangle size={20} color="#FFFFFF" strokeWidth={2} />;
      case 'info':
        return <Info size={20} color="#FFFFFF" strokeWidth={2} />;
      default:
        return <Info size={20} color="#FFFFFF" strokeWidth={2} />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return { backgroundColor: '#34C759', borderColor: '#28A745' };
      case 'error':
        return { backgroundColor: '#FF3B30', borderColor: '#DC3545' };
      case 'warning':
        return { backgroundColor: '#FF9500', borderColor: '#FD7E14' };
      case 'info':
        return { backgroundColor: '#007AFF', borderColor: '#0056CC' };
      default:
        return { backgroundColor: '#007AFF', borderColor: '#0056CC' };
    }
  };

  if (!visible) return null;

  const colors = getColors();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
          backgroundColor: colors.backgroundColor,
          borderColor: colors.borderColor,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={hideToast}
        activeOpacity={0.9}
        accessibilityLabel={`${type} toast: ${title}`}
        accessibilityRole="alert"
        accessibilityHint="Tap to dismiss"
      >
        <View style={styles.iconContainer}>
          {getIcon()}
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {message && (
            <Text style={styles.message} numberOfLines={2}>
              {message}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    lineHeight: 18,
  },
});