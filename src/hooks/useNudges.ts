// src/hooks/useNudges.ts
import { useEffect, useState, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { Vibration, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useCoupleStore } from '../store/useCoupleStore';
import type { Nudge } from '../types/database';
import { VIBRATION_PATTERNS } from '../types/database';

interface UseNudgesResult {
  unreadNudges: Nudge[];
  recentNudges: Nudge[];
  sendNudge: (patternKey: string) => Promise<void>;
  sendCustomNudge: (pattern: number[], name: string, emoji: string) => Promise<void>;
  markAsRead: (nudgeId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  availablePatterns: typeof VIBRATION_PATTERNS;
}

async function playVibrationPattern(pattern: number[]): Promise<void> {
  if (pattern.length === 0) return;

  if (Platform.OS === 'ios') {
    // iOS: use Haptics for each segment
    for (let i = 0; i < pattern.length; i++) {
      const duration = pattern[i];
      if (duration === undefined) continue;
      if (i % 2 === 0) {
        // Vibrate segment
        await Haptics.impactAsync(
          duration > 200
            ? Haptics.ImpactFeedbackStyle.Heavy
            : duration > 100
              ? Haptics.ImpactFeedbackStyle.Medium
              : Haptics.ImpactFeedbackStyle.Light
        );
      }
      await new Promise((resolve) => setTimeout(resolve, duration));
    }
  } else {
    // Android: native vibration pattern
    // Android expects [pause, vibrate, pause, vibrate, ...]
    // Our format is [vibrate, pause, vibrate, pause, ...]
    // Prepend 0 pause to align
    Vibration.vibrate([0, ...pattern]);
  }
}

export function useNudges(): UseNudgesResult {
  const { user, couple, partnerProfile } = useAuthStore();
  const { earnKisses } = useCoupleStore();
  const [unreadNudges, setUnreadNudges] = useState<Nudge[]>([]);
  const [recentNudges, setRecentNudges] = useState<Nudge[]>([]);

  const userId = user?.id;
  const coupleId = couple?.id;

  // Load initial nudges
  useEffect(() => {
    if (!userId || !coupleId) return;

    (async () => {
      const { data } = await supabase
        .from('nudges')
        .select('*')
        .eq('couple_id', coupleId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        setRecentNudges(data);
        setUnreadNudges(data.filter((n) => n.receiver_id === userId && !n.is_read));
      }
    })();
  }, [userId, coupleId]);

  // Subscribe to new nudges in realtime
  useEffect(() => {
    if (!userId || !coupleId) return;

    const channel = supabase
      .channel(`nudges-${coupleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'nudges',
          filter: `couple_id=eq.${coupleId}`,
        },
        async (payload) => {
          const newNudge = payload.new as Nudge;

          setRecentNudges((prev) => [newNudge, ...prev].slice(0, 50));

          // If I'm the receiver, vibrate and add to unread
          if (newNudge.receiver_id === userId) {
            setUnreadNudges((prev) => [newNudge, ...prev]);
            await playVibrationPattern(newNudge.pattern);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, coupleId]);

  const sendNudge = useCallback(
    async (patternKey: string) => {
      if (!userId || !coupleId || !partnerProfile) return;

      const preset = VIBRATION_PATTERNS[patternKey];
      if (!preset) return;

      const { error } = await supabase.from('nudges').insert({
        couple_id: coupleId,
        sender_id: userId,
        receiver_id: partnerProfile.id,
        pattern: preset.pattern,
        pattern_name: preset.name,
        emoji: preset.emoji,
      });

      if (!error) {
        // Give sender a kiss for being sweet
        await earnKisses(coupleId, userId, 'send_kiss');
        // Play own vibration as confirmation
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    [userId, coupleId, partnerProfile, earnKisses]
  );

  const sendCustomNudge = useCallback(
    async (pattern: number[], name: string, emoji: string) => {
      if (!userId || !coupleId || !partnerProfile) return;
      if (pattern.length === 0 || pattern.length > 20) return;

      const { error } = await supabase.from('nudges').insert({
        couple_id: coupleId,
        sender_id: userId,
        receiver_id: partnerProfile.id,
        pattern,
        pattern_name: name || 'Własny wzór',
        emoji: emoji || '✨',
      });

      if (!error) {
        await earnKisses(coupleId, userId, 'send_kiss');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    [userId, coupleId, partnerProfile, earnKisses]
  );

  const markAsRead = useCallback(
    async (nudgeId: string) => {
      await supabase.from('nudges').update({ is_read: true }).eq('id', nudgeId);
      setUnreadNudges((prev) => prev.filter((n) => n.id !== nudgeId));
    },
    []
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    await supabase
      .from('nudges')
      .update({ is_read: true })
      .eq('receiver_id', userId)
      .eq('is_read', false);
    setUnreadNudges([]);
  }, [userId]);

  return {
    unreadNudges,
    recentNudges,
    sendNudge,
    sendCustomNudge,
    markAsRead,
    markAllAsRead,
    availablePatterns: VIBRATION_PATTERNS,
  };
}
