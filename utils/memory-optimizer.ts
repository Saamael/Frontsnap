import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

interface CacheEntry {
  key: string;
  size: number;
  timestamp: number;
  lastAccessed: number;
}

interface MemoryStats {
  totalCacheSize: number;
  entryCount: number;
  oldestEntry: number;
  newestEntry: number;
}

class MemoryOptimizer {
  private static instance: MemoryOptimizer;
  private readonly MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB
  private readonly MAX_ENTRIES = 1000;
  private readonly CLEANUP_THRESHOLD = 0.8; // Clean up when 80% full
  private readonly MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  static getInstance(): MemoryOptimizer {
    if (!MemoryOptimizer.instance) {
      MemoryOptimizer.instance = new MemoryOptimizer();
    }
    return MemoryOptimizer.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.cleanupExpiredEntries();
      await this.enforceMemoryLimits();
      console.log('🧹 Memory optimizer initialized');
    } catch (error) {
      console.error('Error initializing memory optimizer:', error);
    }
  }

  async getCacheStats(): Promise<MemoryStats> {
    try {
      const cacheDir = `${FileSystem.cacheDirectory}optimized_images/`;
      const entries = await this.getCacheEntries();
      
      const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
      const timestamps = entries.map(e => e.timestamp);
      
      return {
        totalCacheSize: totalSize,
        entryCount: entries.length,
        oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
        newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalCacheSize: 0,
        entryCount: 0,
        oldestEntry: 0,
        newestEntry: 0,
      };
    }
  }

  private async getCacheEntries(): Promise<CacheEntry[]> {
    try {
      const cacheDir = `${FileSystem.cacheDirectory}optimized_images/`;
      
      // Ensure cache directory exists
      const dirInfo = await FileSystem.getInfoAsync(cacheDir);
      if (!dirInfo.exists) {
        return [];
      }

      const files = await FileSystem.readDirectoryAsync(cacheDir);
      const entries: CacheEntry[] = [];

      for (const file of files) {
        try {
          const filePath = `${cacheDir}${file}`;
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          
          if (fileInfo.exists && !fileInfo.isDirectory) {
            entries.push({
              key: file,
              size: fileInfo.size || 0,
              timestamp: fileInfo.modificationTime ? fileInfo.modificationTime * 1000 : 0,
              lastAccessed: fileInfo.modificationTime ? fileInfo.modificationTime * 1000 : 0,
            });
          }
        } catch (fileError) {
          console.warn(`Error processing cache file ${file}:`, fileError);
        }
      }

      return entries;
    } catch (error) {
      console.error('Error getting cache entries:', error);
      return [];
    }
  }

  async cleanupExpiredEntries(): Promise<number> {
    try {
      const entries = await this.getCacheEntries();
      const now = Date.now();
      let deletedCount = 0;

      for (const entry of entries) {
        const age = now - entry.timestamp;
        if (age > this.MAX_AGE_MS) {
          await this.deleteCacheEntry(entry.key);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        console.log(`🗑️ Cleaned up ${deletedCount} expired cache entries`);
      }

      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up expired entries:', error);
      return 0;
    }
  }

  async enforceMemoryLimits(): Promise<void> {
    try {
      const stats = await this.getCacheStats();
      
      if (stats.totalCacheSize > this.MAX_CACHE_SIZE * this.CLEANUP_THRESHOLD ||
          stats.entryCount > this.MAX_ENTRIES * this.CLEANUP_THRESHOLD) {
        
        await this.performLRUCleanup();
      }
    } catch (error) {
      console.error('Error enforcing memory limits:', error);
    }
  }

  private async performLRUCleanup(): Promise<void> {
    try {
      const entries = await this.getCacheEntries();
      
      // Sort by last accessed time (oldest first)
      entries.sort((a, b) => a.lastAccessed - b.lastAccessed);
      
      const targetSize = this.MAX_CACHE_SIZE * 0.7; // Clean down to 70%
      const targetCount = Math.floor(this.MAX_ENTRIES * 0.7);
      
      let currentSize = entries.reduce((sum, entry) => sum + entry.size, 0);
      let deletedSize = 0;
      let deletedCount = 0;

      for (const entry of entries) {
        if (currentSize <= targetSize && entries.length - deletedCount <= targetCount) {
          break;
        }

        await this.deleteCacheEntry(entry.key);
        currentSize -= entry.size;
        deletedSize += entry.size;
        deletedCount++;
      }

      console.log(`🧹 LRU cleanup: deleted ${deletedCount} entries, freed ${this.formatBytes(deletedSize)}`);
    } catch (error) {
      console.error('Error performing LRU cleanup:', error);
    }
  }

  private async deleteCacheEntry(key: string): Promise<void> {
    try {
      const filePath = `${FileSystem.cacheDirectory}optimized_images/${key}`;
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(filePath);
      }
    } catch (error) {
      console.error(`Error deleting cache entry ${key}:`, error);
    }
  }

  async clearCache(): Promise<void> {
    try {
      const cacheDir = `${FileSystem.cacheDirectory}optimized_images/`;
      const dirInfo = await FileSystem.getInfoAsync(cacheDir);
      
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(cacheDir);
        await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
        console.log('🗑️ Cache cleared completely');
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  // AsyncStorage cleanup
  async cleanupAsyncStorage(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const now = Date.now();
      let deletedCount = 0;

      for (const key of keys) {
        try {
          // Skip non-cache keys
          if (!key.startsWith('cache_') && !key.startsWith('temp_')) {
            continue;
          }

          const data = await AsyncStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            
            // Check if data has timestamp and is expired
            if (parsed.timestamp && (now - parsed.timestamp) > this.MAX_AGE_MS) {
              await AsyncStorage.removeItem(key);
              deletedCount++;
            }
          }
        } catch (parseError) {
          // If we can't parse the data, consider it corrupted and remove it
          await AsyncStorage.removeItem(key);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        console.log(`🗑️ Cleaned up ${deletedCount} AsyncStorage entries`);
      }
    } catch (error) {
      console.error('Error cleaning up AsyncStorage:', error);
    }
  }

  // Memory pressure handling
  async handleMemoryWarning(): Promise<void> {
    console.warn('⚠️ Memory warning received, performing aggressive cleanup');
    
    try {
      await Promise.all([
        this.performLRUCleanup(),
        this.cleanupAsyncStorage(),
        this.cleanupExpiredEntries(),
      ]);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      console.log('🧹 Aggressive memory cleanup completed');
    } catch (error) {
      console.error('Error handling memory warning:', error);
    }
  }

  // Image cache optimization
  async optimizeImageCache(): Promise<void> {
    try {
      const entries = await this.getCacheEntries();
      const imageEntries = entries.filter(entry => 
        entry.key.match(/\.(jpg|jpeg|png|webp)$/i)
      );

      // Remove duplicate images (same content, different names)
      const sizeGroups = new Map<number, CacheEntry[]>();
      
      for (const entry of imageEntries) {
        const sizeGroup = sizeGroups.get(entry.size) || [];
        sizeGroup.push(entry);
        sizeGroups.set(entry.size, sizeGroup);
      }

      let duplicatesRemoved = 0;
      for (const [size, group] of sizeGroups.entries()) {
        if (group.length > 1) {
          // Keep the most recently accessed, remove others
          group.sort((a, b) => b.lastAccessed - a.lastAccessed);
          
          for (let i = 1; i < group.length; i++) {
            await this.deleteCacheEntry(group[i].key);
            duplicatesRemoved++;
          }
        }
      }

      if (duplicatesRemoved > 0) {
        console.log(`🖼️ Removed ${duplicatesRemoved} duplicate images from cache`);
      }
    } catch (error) {
      console.error('Error optimizing image cache:', error);
    }
  }

  // Utility methods
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async getMemoryReport(): Promise<{
    cacheStats: MemoryStats;
    recommendations: string[];
    formattedStats: {
      totalCacheSize: string;
      cacheUtilization: string;
      oldestEntry: string;
    };
  }> {
    const stats = await this.getCacheStats();
    const recommendations: string[] = [];
    
    const utilizationPercent = (stats.totalCacheSize / this.MAX_CACHE_SIZE) * 100;
    
    if (utilizationPercent > 80) {
      recommendations.push('Cache is nearly full - consider cleanup');
    }
    
    if (stats.entryCount > this.MAX_ENTRIES * 0.8) {
      recommendations.push('High number of cache entries - consider pruning');
    }
    
    const oldestAge = Date.now() - stats.oldestEntry;
    if (oldestAge > this.MAX_AGE_MS) {
      recommendations.push('Old cache entries detected - cleanup recommended');
    }
    
    if (stats.totalCacheSize < this.MAX_CACHE_SIZE * 0.1) {
      recommendations.push('Cache usage is low - performing well');
    }

    return {
      cacheStats: stats,
      recommendations,
      formattedStats: {
        totalCacheSize: this.formatBytes(stats.totalCacheSize),
        cacheUtilization: `${utilizationPercent.toFixed(1)}%`,
        oldestEntry: stats.oldestEntry > 0 
          ? new Date(stats.oldestEntry).toLocaleDateString()
          : 'No entries',
      },
    };
  }

  // Scheduled maintenance
  async performMaintenance(): Promise<void> {
    console.log('🔧 Starting memory maintenance...');
    
    try {
      const startTime = Date.now();
      
      await Promise.all([
        this.cleanupExpiredEntries(),
        this.enforceMemoryLimits(),
        this.cleanupAsyncStorage(),
        this.optimizeImageCache(),
      ]);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Memory maintenance completed in ${duration}ms`);
      
      const report = await this.getMemoryReport();
      console.log('📊 Memory report:', report.formattedStats);
      
      if (report.recommendations.length > 0) {
        console.log('💡 Recommendations:', report.recommendations);
      }
    } catch (error) {
      console.error('Error performing memory maintenance:', error);
    }
  }
}

export default MemoryOptimizer;