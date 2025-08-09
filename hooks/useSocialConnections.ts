import { useState, useEffect, useCallback } from 'react';
import { UserConnection, ConnectionsCount, SocialProfile, supabase, getCurrentUser } from '@/lib/supabase';
import { withRetry, AppError, ErrorType } from '@/utils/error-handling';
import { sendNewFollowerNotification } from '@/lib/push-notifications';

export interface UseSocialConnectionsReturn {
  connections: UserConnection[];
  connectionsCount: ConnectionsCount;
  isLoading: boolean;
  error: string | null;
  followUser: (userId: string) => Promise<boolean>;
  unfollowUser: (userId: string) => Promise<boolean>;
  getConnectionsCount: (userId?: string) => Promise<ConnectionsCount | null>;
  searchUsers: (query: string) => Promise<SocialProfile[]>;
  isFollowing: (userId: string) => boolean;
  refreshConnections: () => Promise<void>;
}

export const useSocialConnections = (): UseSocialConnectionsReturn => {
  const [connections, setConnections] = useState<UserConnection[]>([]);
  const [connectionsCount, setConnectionsCount] = useState<ConnectionsCount>({
    following_count: 0,
    followers_count: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserConnections();
  }, []);

  const loadUserConnections = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new AppError('User not authenticated', ErrorType.AUTH);
      }

      // Load user's connections (people they follow)
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('user_connections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (connectionsError) {
        throw new AppError(connectionsError.message, ErrorType.DATABASE);
      }

      setConnections(connectionsData || []);

      // Load connections count
      const count = await getConnectionsCount();
      if (count) {
        setConnectionsCount(count);
      }

    } catch (err) {
      const errorMessage = err instanceof AppError ? err.message : 'Failed to load connections';
      
      // Check if it's a missing table error (migrations not run)
      if (errorMessage.includes('user_connections') && errorMessage.includes('does not exist')) {
        setError('Social features require database setup. Please run migrations.');
        console.error('❌ Database migrations required - user_connections table missing');
      } else {
        setError(errorMessage);
        console.error('Error loading connections:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const followUser = async (userId: string): Promise<boolean> => {
    try {
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new AppError('User not authenticated', ErrorType.AUTH);
      }

      if (user.id === userId) {
        throw new AppError('Cannot follow yourself', ErrorType.VALIDATION);
      }

      const { error } = await supabase
        .from('user_connections')
        .insert({
          user_id: user.id,
          connected_user_id: userId,
          status: 'following'
        });

      if (error) {
        // Handle unique constraint violation (already following)
        if (error.code === '23505') {
          setError('Already following this user');
          return false;
        }
        throw new AppError(error.message, ErrorType.DATABASE);
      }

      // Send notification to the followed user
      try {
        const currentUserProfile = await getCurrentUser();
        if (currentUserProfile) {
          await sendNewFollowerNotification(
            userId,
            currentUserProfile.full_name,
            currentUserProfile.id
          );
        }
      } catch (notifError) {
        console.log('Could not send follow notification:', notifError);
      }

      // Refresh connections
      await loadUserConnections();
      return true;

    } catch (err) {
      const errorMessage = err instanceof AppError ? err.message : 'Failed to follow user';
      setError(errorMessage);
      console.error('Error following user:', err);
      return false;
    }
  };

  const unfollowUser = async (userId: string): Promise<boolean> => {
    try {
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new AppError('User not authenticated', ErrorType.AUTH);
      }

      const { error } = await supabase
        .from('user_connections')
        .delete()
        .eq('user_id', user.id)
        .eq('connected_user_id', userId);

      if (error) {
        throw new AppError(error.message, ErrorType.DATABASE);
      }

      // Refresh connections
      await loadUserConnections();
      return true;

    } catch (err) {
      const errorMessage = err instanceof AppError ? err.message : 'Failed to unfollow user';
      setError(errorMessage);
      console.error('Error unfollowing user:', err);
      return false;
    }
  };

  const getConnectionsCount = async (userId?: string): Promise<ConnectionsCount | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const targetUserId = userId || user.id;

      const { data, error } = await supabase
        .rpc('get_user_connections_count', { user_uuid: targetUserId });

      if (error) {
        throw new AppError(error.message, ErrorType.DATABASE);
      }

      const result = data?.[0] || { following_count: 0, followers_count: 0 };
      return {
        following_count: Number(result.following_count) || 0,
        followers_count: Number(result.followers_count) || 0
      };

    } catch (err) {
      console.error('Error getting connections count:', err);
      return null;
    }
  };

  const searchUsers = async (query: string): Promise<SocialProfile[]> => {
    try {
      if (!query.trim()) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, bio, allow_social_features')
        .eq('allow_social_features', true)
        .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(20);

      if (error) {
        throw new AppError(error.message, ErrorType.DATABASE);
      }

      return data || [];

    } catch (err) {
      console.error('Error searching users:', err);
      return [];
    }
  };

  const isFollowing = useCallback((userId: string): boolean => {
    return connections.some(conn => conn.connected_user_id === userId);
  }, [connections]);

  const refreshConnections = useCallback(async () => {
    await loadUserConnections();
  }, [loadUserConnections]);

  return {
    connections,
    connectionsCount,
    isLoading,
    error,
    followUser,
    unfollowUser,
    getConnectionsCount,
    searchUsers,
    isFollowing,
    refreshConnections
  };
};