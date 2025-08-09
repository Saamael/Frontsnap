import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import PerformanceMonitor from '../../utils/performance-monitor';
import MemoryOptimizer from '../../utils/memory-optimizer';

interface PerformanceData {
  totalMetrics: number;
  timeRange: { start: number; end: number } | null;
  averages: Record<string, number>;
  slowOperations: Array<{
    name: string;
    value: number;
    unit: string;
    timestamp: number;
    metadata?: Record<string, any>;
  }>;
  memoryUsage?: number;
}

interface MemoryData {
  totalCacheSize: number;
  entryCount: number;
  oldestEntry: number;
  newestEntry: number;
  formattedStats: {
    totalCacheSize: string;
    cacheUtilization: string;
    oldestEntry: string;
  };
  recommendations: string[];
}

export default function AdminPerformance() {
  const router = useRouter();
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [memoryData, setMemoryData] = useState<MemoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [monitoringEnabled, setMonitoringEnabled] = useState(false);

  useEffect(() => {
    checkAdminAccess();
    loadPerformanceData();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        router.replace('/auth/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        Alert.alert('Access Denied', 'Admin privileges required');
        router.back();
        return;
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
      router.back();
    }
  };

  const loadPerformanceData = async () => {
    try {
      const monitor = PerformanceMonitor.getInstance();
      const optimizer = MemoryOptimizer.getInstance();

      // Load performance data
      const perfSummary = monitor.getPerformanceSummary();
      setPerformanceData(perfSummary);

      // Load memory data
      const memoryReport = await optimizer.getMemoryReport();
      setMemoryData({
        ...memoryReport.cacheStats,
        ...memoryReport,
      });

      // Check if monitoring is currently active
      // This would depend on your implementation - you might store this in AsyncStorage
      setMonitoringEnabled(true); // Default to true for now
    } catch (error) {
      console.error('Error loading performance data:', error);
      Alert.alert('Error', 'Failed to load performance data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPerformanceData();
  };

  const toggleMonitoring = async (enabled: boolean) => {
    try {
      const monitor = PerformanceMonitor.getInstance();
      
      if (enabled) {
        monitor.startMonitoring();
      } else {
        monitor.stopMonitoring();
      }
      
      setMonitoringEnabled(enabled);
      Alert.alert(
        'Monitoring ' + (enabled ? 'Started' : 'Stopped'),
        enabled 
          ? 'Performance monitoring is now active'
          : 'Performance monitoring has been stopped'
      );
    } catch (error) {
      console.error('Error toggling monitoring:', error);
      Alert.alert('Error', 'Failed to toggle monitoring');
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached images and data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const optimizer = MemoryOptimizer.getInstance();
              await optimizer.clearCache();
              await loadPerformanceData();
              Alert.alert('Success', 'Cache cleared successfully');
            } catch (error) {
              console.error('Error clearing cache:', error);
              Alert.alert('Error', 'Failed to clear cache');
            }
          }
        }
      ]
    );
  };

  const handleMemoryCleanup = async () => {
    try {
      const optimizer = MemoryOptimizer.getInstance();
      await optimizer.performMaintenance();
      await loadPerformanceData();
      Alert.alert('Success', 'Memory cleanup completed');
    } catch (error) {
      console.error('Error performing memory cleanup:', error);
      Alert.alert('Error', 'Failed to perform memory cleanup');
    }
  };

  const handleExportMetrics = async () => {
    try {
      const monitor = PerformanceMonitor.getInstance();
      const exportData = monitor.exportMetrics();
      
      // In a real app, you might save this to a file or send to a server
      console.log('Performance metrics exported:', exportData);
      Alert.alert('Success', 'Metrics exported to console (check logs)');
    } catch (error) {
      console.error('Error exporting metrics:', error);
      Alert.alert('Error', 'Failed to export metrics');
    }
  };

  const MetricCard = ({ 
    title, 
    value, 
    unit, 
    color = '#007AFF',
    subtitle,
    onPress 
  }: {
    title: string;
    value: string | number;
    unit?: string;
    color?: string;
    subtitle?: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity 
      style={[styles.metricCard, { borderLeftColor: color }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={styles.metricTitle}>{title}</Text>
      <View style={styles.metricValueContainer}>
        <Text style={[styles.metricValue, { color }]}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Text>
        {unit && <Text style={styles.metricUnit}>{unit}</Text>}
      </View>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    </TouchableOpacity>
  );

  const ActionButton = ({ 
    title, 
    icon, 
    onPress, 
    color = '#007AFF',
    destructive = false 
  }: {
    title: string;
    icon: string;
    onPress: () => void;
    color?: string;
    destructive?: boolean;
  }) => (
    <TouchableOpacity
      style={[
        styles.actionButton,
        { backgroundColor: destructive ? '#FF3B30' : color }
      ]}
      onPress={onPress}
    >
      <Ionicons name={icon as any} size={20} color="white" />
      <Text style={styles.actionButtonText}>{title}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading performance data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Performance Monitor</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => loadPerformanceData()}
        >
          <Ionicons name="refresh" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Monitoring Control */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monitoring Control</Text>
          <View style={styles.controlRow}>
            <View style={styles.controlInfo}>
              <Text style={styles.controlTitle}>Performance Monitoring</Text>
              <Text style={styles.controlDescription}>
                Track app performance metrics in real-time
              </Text>
            </View>
            <Switch
              value={monitoringEnabled}
              onValueChange={toggleMonitoring}
              trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Performance Overview */}
        {performanceData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance Overview</Text>
            <View style={styles.metricsGrid}>
              <MetricCard
                title="Total Metrics"
                value={performanceData.totalMetrics}
                color="#007AFF"
              />
              <MetricCard
                title="Memory Usage"
                value={performanceData.memoryUsage?.toFixed(1) || 'N/A'}
                unit={performanceData.memoryUsage ? '%' : ''}
                color={
                  performanceData.memoryUsage 
                    ? performanceData.memoryUsage > 80 
                      ? '#FF3B30' 
                      : performanceData.memoryUsage > 60 
                        ? '#FF9500' 
                        : '#34C759'
                    : '#666'
                }
              />
              <MetricCard
                title="Slow Operations"
                value={performanceData.slowOperations.length}
                color="#FF9500"
                subtitle="Operations > 500ms"
              />
            </View>
          </View>
        )}

        {/* Average Response Times */}
        {performanceData && Object.keys(performanceData.averages).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Average Response Times</Text>
            <View style={styles.averagesList}>
              {Object.entries(performanceData.averages)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([name, avg]) => (
                  <View key={name} style={styles.averageItem}>
                    <Text style={styles.averageName}>{name.replace(/_/g, ' ')}</Text>
                    <Text style={[
                      styles.averageValue,
                      { color: avg > 1000 ? '#FF3B30' : avg > 500 ? '#FF9500' : '#34C759' }
                    ]}>
                      {avg.toFixed(0)}ms
                    </Text>
                  </View>
                ))}
            </View>
          </View>
        )}

        {/* Memory Statistics */}
        {memoryData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Memory & Cache</Text>
            <View style={styles.metricsGrid}>
              <MetricCard
                title="Cache Size"
                value={memoryData.formattedStats.totalCacheSize}
                color="#5856D6"
              />
              <MetricCard
                title="Cache Entries"
                value={memoryData.entryCount}
                color="#34C759"
              />
              <MetricCard
                title="Cache Utilization"
                value={memoryData.formattedStats.cacheUtilization}
                color="#FF9500"
              />
            </View>

            {/* Recommendations */}
            {memoryData.recommendations.length > 0 && (
              <View style={styles.recommendationsContainer}>
                <Text style={styles.recommendationsTitle}>Recommendations</Text>
                {memoryData.recommendations.map((rec, index) => (
                  <View key={index} style={styles.recommendationItem}>
                    <Ionicons name="information-circle" size={16} color="#007AFF" />
                    <Text style={styles.recommendationText}>{rec}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Slow Operations */}
        {performanceData && performanceData.slowOperations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Slow Operations</Text>
            <View style={styles.slowOperationsList}>
              {performanceData.slowOperations.slice(0, 5).map((op, index) => (
                <View key={index} style={styles.slowOperationItem}>
                  <View style={styles.slowOperationHeader}>
                    <Text style={styles.slowOperationName}>
                      {op.name.replace(/_/g, ' ')}
                    </Text>
                    <Text style={styles.slowOperationValue}>
                      {op.value.toFixed(0)}ms
                    </Text>
                  </View>
                  <Text style={styles.slowOperationTime}>
                    {new Date(op.timestamp).toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionsGrid}>
            <ActionButton
              title="Memory Cleanup"
              icon="trash"
              onPress={handleMemoryCleanup}
              color="#34C759"
            />
            <ActionButton
              title="Clear Cache"
              icon="refresh"
              onPress={handleClearCache}
              destructive
            />
            <ActionButton
              title="Export Metrics"
              icon="download"
              onPress={handleExportMetrics}
              color="#5856D6"
            />
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  refreshButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlInfo: {
    flex: 1,
  },
  controlTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  controlDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  metricTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  metricValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  metricUnit: {
    fontSize: 16,
    color: '#666',
  },
  metricSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  averagesList: {
    gap: 8,
  },
  averageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  averageName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textTransform: 'capitalize',
  },
  averageValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  recommendationsContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  slowOperationsList: {
    gap: 8,
  },
  slowOperationItem: {
    padding: 12,
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
  },
  slowOperationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  slowOperationName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    textTransform: 'capitalize',
  },
  slowOperationValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9500',
  },
  slowOperationTime: {
    fontSize: 12,
    color: '#666',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  bottomPadding: {
    height: 40,
  },
});