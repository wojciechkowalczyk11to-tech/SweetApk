// src/hooks/useLocationRealtime.ts
import { useEffect, useState, useRef, useCallback } from 'react';
import * as ExpoLocation from 'expo-location';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import type { Location } from '../types/database';

interface UseLocationRealtimeResult {
  myLocation: Location | null;
  partnerLocation: Location | null;
  isSharing: boolean;
  permissionGranted: boolean;
  toggleSharing: () => Promise<void>;
  refreshLocation: () => Promise<void>;
  distanceKm: number | null;
}

function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useLocationRealtime(): UseLocationRealtimeResult {
  const { user, couple } = useAuthStore();
  const [myLocation, setMyLocation] = useState<Location | null>(null);
  const [partnerLocation, setPartnerLocation] = useState<Location | null>(null);
  const [isSharing, setIsSharing] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const userId = user?.id;
  const coupleId = couple?.id;

  // Request location permissions
  useEffect(() => {
    (async () => {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      setPermissionGranted(status === 'granted');
    })();
  }, []);

  // Update own location
  const updateMyLocation = useCallback(async () => {
    if (!permissionGranted || !userId || !coupleId || !isSharing) return;

    try {
      const loc = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });

      const locationData = {
        user_id: userId,
        couple_id: coupleId,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy ?? 0,
        is_sharing: true,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('locations')
        .upsert(locationData, { onConflict: 'user_id' })
        .select()
        .single();

      if (!error && data) {
        setMyLocation(data);
      }
    } catch (error) {
      console.error('Location update error:', error);
    }
  }, [permissionGranted, userId, coupleId, isSharing]);

  // Poll own location every 60s
  useEffect(() => {
    if (!permissionGranted || !userId || !coupleId) return;

    updateMyLocation();
    intervalRef.current = setInterval(updateMyLocation, 60000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [permissionGranted, userId, coupleId, updateMyLocation]);

  // Subscribe to partner's location changes via Realtime
  useEffect(() => {
    if (!coupleId || !userId) return;

    // Initial fetch of partner location
    (async () => {
      const { data } = await supabase
        .from('locations')
        .select('*')
        .eq('couple_id', coupleId)
        .neq('user_id', userId);

      if (data && data.length > 0) {
        setPartnerLocation(data[0] ?? null);
      }
    })();

    const channel = supabase
      .channel(`location-${coupleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'locations',
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => {
          const newLoc = payload.new as Location;
          if (newLoc.user_id === userId) {
            setMyLocation(newLoc);
          } else {
            setPartnerLocation(newLoc);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId, userId]);

  const toggleSharing = async () => {
    if (!userId) return;

    const newState = !isSharing;
    setIsSharing(newState);

    if (!newState) {
      // Stop sharing - update DB
      await supabase
        .from('locations')
        .update({ is_sharing: false })
        .eq('user_id', userId);
    } else {
      // Resume sharing
      await updateMyLocation();
    }
  };

  const distanceKm =
    myLocation && partnerLocation
      ? Math.round(
          haversineDistance(
            myLocation.latitude,
            myLocation.longitude,
            partnerLocation.latitude,
            partnerLocation.longitude
          ) * 10
        ) / 10
      : null;

  return {
    myLocation,
    partnerLocation,
    isSharing,
    permissionGranted,
    toggleSharing,
    refreshLocation: updateMyLocation,
    distanceKm,
  };
}
