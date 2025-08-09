import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeHiddenGemsProps {
  currentCity: string | null;
  onHiddenGemAdded?: (gem: any) => void;
  onHiddenGemUpdated?: (gem: any) => void;
  onHiddenGemDiscovered?: (gem: any) => void;
}

export const useRealtimeHiddenGems = ({
  currentCity,
  onHiddenGemAdded,
  onHiddenGemUpdated,
  onHiddenGemDiscovered
}: UseRealtimeHiddenGemsProps) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  
  const setupSubscription = useCallback(() => {
    if (!currentCity) return;
    
    // Clean up existing subscription
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }
    
    // Create new subscription for current city
    const channel = supabase
      .channel(`hidden-gems-${currentCity}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'hidden_gems'
      }, (payload) => {
        const gem = payload.new as any;
        // Only notify if the gem is for current city
        if (gem.city === currentCity) {
          console.log('🔄 Real-time: New hidden gem added:', gem);
          onHiddenGemAdded?.(gem);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'hidden_gems'
      }, (payload) => {
        const gem = payload.new as any;
        const oldGem = payload.old as any;
        
        // Only handle if it's for current city
        if (gem.city === currentCity) {
          console.log('🔄 Real-time: Hidden gem updated:', gem);
          onHiddenGemUpdated?.(gem);
          
          // Check if gem was just discovered (is_active changed from true to false)
          if (oldGem?.is_active && !gem?.is_active) {
            console.log('🎉 Real-time: Hidden gem discovered:', gem);
            onHiddenGemDiscovered?.(gem);
          }
        }
      })
      .subscribe();
      
    channelRef.current = channel;
    console.log(`🔔 Subscribed to real-time hidden gems for ${currentCity}`);
  }, [currentCity, onHiddenGemAdded, onHiddenGemUpdated, onHiddenGemDiscovered]);
  
  useEffect(() => {
    setupSubscription();
    
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        console.log('🔕 Unsubscribed from hidden gems updates');
      }
    };
  }, [setupSubscription]);
};