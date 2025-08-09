import { Image } from 'react-native';
import { Place } from '@/lib/supabase';

interface PrefetchOptions {
  concurrency?: number;
  signal?: AbortSignal;
}

/**
 * Prefetch multiple image URLs with concurrency control
 * Uses React Native's Image.prefetch to warm the cache
 */
export async function prefetchImages(
  urls: string[], 
  opts: PrefetchOptions = {}
): Promise<void> {
  const { concurrency = 6, signal } = opts;
  
  if (!urls || urls.length === 0) {
    return;
  }

  // Filter out invalid URLs
  const validUrls = urls.filter(url => url && url.trim() !== '');
  
  if (validUrls.length === 0) {
    return;
  }

  console.log(`🖼️ Prefetching ${validUrls.length} images with concurrency ${concurrency}`);
  
  // Create a queue of URLs to process
  const queue = [...validUrls];
  const inProgress = new Set<Promise<any>>();
  
  // Process URLs with concurrency control
  while (queue.length > 0 || inProgress.size > 0) {
    // Check if aborted
    if (signal?.aborted) {
      console.log('🛑 Prefetch aborted');
      break;
    }
    
    // Start new prefetch tasks up to concurrency limit
    while (queue.length > 0 && inProgress.size < concurrency) {
      const url = queue.shift();
      if (!url) continue;
      
      const prefetchPromise = Image.prefetch(url)
        .then(() => {
          console.log(`✅ Prefetched: ${url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('/') + 20)}...`);
        })
        .catch((error) => {
          // Don't fail the whole batch on individual errors
          console.warn(`⚠️ Failed to prefetch: ${url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('/') + 20)}...`, error.message);
        })
        .finally(() => {
          inProgress.delete(prefetchPromise);
        });
      
      inProgress.add(prefetchPromise);
    }
    
    // Wait for at least one task to complete before continuing
    if (inProgress.size > 0) {
      await Promise.race(Array.from(inProgress));
    }
  }
  
  // Wait for all remaining tasks to complete
  if (inProgress.size > 0) {
    await Promise.allSettled(Array.from(inProgress));
  }
  
  console.log(`🎯 Prefetch batch complete`);
}

/**
 * Prefetch thumbnail images for an array of places
 * Prefers thumbnail_url over image_url for faster loading
 */
export async function prefetchPlaceThumbs(
  places: Place[], 
  opts: PrefetchOptions = {}
): Promise<void> {
  if (!places || places.length === 0) {
    return;
  }
  
  // Extract thumbnail URLs, preferring thumbnail_url over image_url
  const urls = places
    .map(place => place.thumbnail_url || place.image_url)
    .filter(url => url && url.trim() !== '');
  
  if (urls.length === 0) {
    console.log('📭 No images to prefetch');
    return;
  }
  
  console.log(`🏞️ Prefetching thumbnails for ${urls.length} places`);
  await prefetchImages(urls, opts);
}

/**
 * Split places into priority groups and prefetch accordingly
 * @param places - Array of places to prefetch
 * @param topCount - Number of places to treat as high priority (default 4-8)
 * @param opts - Prefetch options
 */
export async function prefetchPlacesWithPriority(
  places: Place[],
  topCount: number = 6,
  opts: PrefetchOptions = {}
): Promise<void> {
  if (!places || places.length === 0) {
    return;
  }
  
  const { signal } = opts;
  
  // Split into priority groups
  const topPlaces = places.slice(0, topCount);
  const remainingPlaces = places.slice(topCount);
  
  // Prefetch top places first with higher concurrency
  if (topPlaces.length > 0) {
    console.log(`⚡ Prefetching ${topPlaces.length} high-priority places`);
    await prefetchPlaceThumbs(topPlaces, { 
      concurrency: 8, // Higher concurrency for top items
      signal 
    });
  }
  
  // Then prefetch remaining places with normal concurrency
  if (remainingPlaces.length > 0 && !signal?.aborted) {
    console.log(`📦 Prefetching ${remainingPlaces.length} remaining places in background`);
    // Don't await this - let it run in background
    prefetchPlaceThumbs(remainingPlaces, { 
      concurrency: 4, // Lower concurrency for background
      signal 
    }).catch(error => {
      console.warn('Background prefetch error:', error);
    });
  }
}