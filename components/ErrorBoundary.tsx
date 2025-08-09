import React, { Component, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetOnPropsChange?: any;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to analytics service
    this.logError(error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Reset error boundary when specified props change
    if (hasError && resetOnPropsChange !== prevProps.resetOnPropsChange) {
      this.resetErrorBoundary();
    }
  }

  private logError = (error: Error, errorInfo: React.ErrorInfo) => {
    // In production, send to crash analytics service
    if (!__DEV__) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
      // Example: Sentry.captureException(error, { extra: errorInfo });
    } else {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  };

  private resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleRetry = () => {
    this.resetErrorBoundary();
  };

  private getErrorMessage = (): string => {
    const { error } = this.state;
    
    if (!error) return 'An unexpected error occurred';

    // Provide user-friendly error messages
    if (error.message.includes('Network')) {
      return 'Network connection problem. Please check your internet connection.';
    }
    
    if (error.message.includes('Location')) {
      return 'Location access error. Please check your location permissions.';
    }

    if (error.message.includes('Camera')) {
      return 'Camera access error. Please check your camera permissions.';
    }

    if (__DEV__) {
      return error.message;
    }

    return 'Something went wrong. Please try again.';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <AlertTriangle size={64} color="#FF3B30" strokeWidth={1.5} />
            </View>
            
            <Text style={styles.title}>Oops! Something went wrong</Text>
            <Text style={styles.message}>
              {this.getErrorMessage()}
            </Text>

            {__DEV__ && this.state.error && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorDetailsTitle}>Error Details (Dev Mode):</Text>
                <Text style={styles.errorDetailsText}>
                  {this.state.error.message}
                </Text>
                {this.state.errorInfo && (
                  <Text style={styles.errorDetailsText}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.actions}>
              <TouchableOpacity 
                style={styles.retryButton} 
                onPress={this.handleRetry}
                accessibilityLabel="Try again"
                accessibilityRole="button"
              >
                <RefreshCw size={20} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Specialized error boundaries for different app sections
export const ScreenErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    onError={(error, errorInfo) => {
      console.error('Screen Error:', error, errorInfo);
    }}
  >
    {children}
  </ErrorBoundary>
);

export const CameraErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={
      <View style={styles.cameraErrorFallback}>
        <AlertTriangle size={48} color="#FF3B30" strokeWidth={1.5} />
        <Text style={styles.cameraErrorText}>Camera unavailable</Text>
        <Text style={styles.cameraErrorSubtext}>
          Please check camera permissions and try again
        </Text>
      </View>
    }
    onError={(error, errorInfo) => {
      console.error('Camera Error:', error, errorInfo);
    }}
  >
    {children}
  </ErrorBoundary>
);

export const MapErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={
      <View style={styles.mapErrorFallback}>
        <AlertTriangle size={48} color="#FF3B30" strokeWidth={1.5} />
        <Text style={styles.mapErrorText}>Map unavailable</Text>
        <Text style={styles.mapErrorSubtext}>
          Unable to load map. Please check your connection.
        </Text>
      </View>
    }
    onError={(error, errorInfo) => {
      console.error('Map Error:', error, errorInfo);
    }}
  >
    {children}
  </ErrorBoundary>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  errorDetails: {
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    width: '100%',
  },
  errorDetailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  errorDetailsText: {
    fontSize: 12,
    color: '#8E8E93',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  actions: {
    width: '100%',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraErrorFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 32,
  },
  cameraErrorText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  cameraErrorSubtext: {
    color: '#8E8E93',
    fontSize: 14,
    textAlign: 'center',
  },
  mapErrorFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    padding: 32,
  },
  mapErrorText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  mapErrorSubtext: {
    color: '#8E8E93',
    fontSize: 14,
    textAlign: 'center',
  },
});