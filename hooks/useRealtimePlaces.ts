import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { LocationData } from '@/contexts/LocationContext';

interface UseRealtimePlacesProps {
  locationData: LocationData | null;
  onPlaceAdded?: (place: any) => void;
  onPlaceUpdated?: (place: any) => void;
  onPlaceDeleted?: (placeId: string) => void;
}

export const useRealtimePlaces = ({
  locationData,
  onPlaceAdded,
  onPlaceUpdated,
  onPlaceDeleted
}: UseRealtimePlacesProps) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  
  const setupSubscription = useCallback(() => {
    if (!locationData) return;
    
    // Clean up existing subscription
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }
    
    // Create location-based filter for nearby places (within ~10km)
    const latRange = 0.09; // Approximately 10km
    const lngRange = 0.09;
    const minLat = locationData.latitude - latRange;
    const maxLat = locationData.latitude + latRange;
    const minLng = locationData.longitude - lngRange;
    const maxLng = locationData.longitude + lngRange;
    
    // Create new subscription for current location
    const channel = supabase
      .channel(`places-${locationData.city}-${locationData.country}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'places'
      }, (payload) => {
        console.log('🔄 Real-time: New place added:', payload.new);
        
        // Check if the new place is within our location range
        const place = payload.new as any;
        if (place.latitude >= minLat && place.latitude <= maxLat && 
            place.longitude >= minLng && place.longitude <= maxLng) {
          onPlaceAdded?.(place);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'places'
      }, (payload) => {
        console.log('🔄 Real-time: Place updated:', payload.new);
        onPlaceUpdated?.(payload.new);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'places'
      }, (payload) => {
        console.log('🔄 Real-time: Place deleted:', payload.old);
        onPlaceDeleted?.(payload.old?.id);
      })
      .subscribe();
      
    channelRef.current = channel;
    console.log(`🔔 Subscribed to real-time places updates for ${locationData.city}`);
  }, [locationData, onPlaceAdded, onPlaceUpdated, onPlaceDeleted]);
  
  useEffect(() => {
    setupSubscription();
    
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        console.log('🔕 Unsubscribed from places updates');
      }
    };
  }, [setupSubscription]);
};