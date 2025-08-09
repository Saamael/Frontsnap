import { useState, useEffect, useCallback } from 'react';
import { FriendActivity, getFriendActivityFeed } from '@/lib/supabase';
import { withRetry, AppError, ErrorType } from '@/utils/error-handling';

export interface UseFriendActivityReturn {
  activities: FriendActivity[];
  isLoading: boolean;
  error: string | null;
  refreshActivities: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

export const useFriendActivity = (initialLimit: number = 20): UseFriendActivityReturn => {
  const [activities, setActivities] = useState<FriendActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentLimit, setCurrentLimit] = useState(initialLimit);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = useCallback(async (limit?: number) => {
    try {
      setIsLoading(true);
      setError(null);

      const limitToUse = limit || currentLimit;
      const data = await getFriendActivityFeed(limitToUse);
      
      setActivities(data);
      setHasMore(data.length === limitToUse); // If we got exactly the limit, there might be more

    } catch (err) {
      const errorMessage = err instanceof AppError ? err.message : 'Failed to load friend activities';
      setError(errorMessage);
      console.error('Error loading friend activities:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentLimit]);

  const refreshActivities = useCallback(async () => {
    setCurrentLimit(initialLimit);
    await loadActivities(initialLimit);
  }, [initialLimit, loadActivities]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;

    const newLimit = currentLimit + initialLimit;
    setCurrentLimit(newLimit);
    await loadActivities(newLimit);
  }, [hasMore, isLoading, currentLimit, initialLimit, loadActivities]);

  return {
    activities,
    isLoading,
    error,
    refreshActivities,
    loadMore,
    hasMore
  };
};