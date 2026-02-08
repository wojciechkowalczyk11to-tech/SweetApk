// src/hooks/useCalendar.ts
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useCoupleStore } from '../store/useCoupleStore';
import type { CalendarEvent } from '../types/database';

interface UseCalendarResult {
  events: CalendarEvent[];
  markedDates: Record<string, { marked: boolean; dotColor: string; dots?: Array<{ color: string }> }>;
  isLoading: boolean;
  addEvent: (title: string, date: string, time?: string, color?: string, description?: string) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  getEventsForDate: (date: string) => CalendarEvent[];
  refresh: () => Promise<void>;
}

export function useCalendar(): UseCalendarResult {
  const { user, couple } = useAuthStore();
  const { earnKisses } = useCoupleStore();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const userId = user?.id;
  const coupleId = couple?.id;

  const fetchEvents = useCallback(async () => {
    if (!coupleId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('couple_id', coupleId)
        .order('event_date', { ascending: true });

      if (!error && data) {
        setEvents(data);
      }
    } catch (error) {
      console.error('Fetch events error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [coupleId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Realtime subscription
  useEffect(() => {
    if (!coupleId) return;

    const channel = supabase
      .channel(`calendar-${coupleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_events',
          filter: `couple_id=eq.${coupleId}`,
        },
        () => {
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId, fetchEvents]);

  const addEvent = useCallback(
    async (
      title: string,
      date: string,
      time?: string,
      color?: string,
      description?: string
    ) => {
      if (!userId || !coupleId) return;

      const { error } = await supabase.from('calendar_events').insert({
        couple_id: coupleId,
        author_id: userId,
        title: title.trim(),
        event_date: date,
        event_time: time ?? null,
        color: color ?? '#FF6B9D',
        description: description ?? '',
      });

      if (!error) {
        await earnKisses(coupleId, userId, 'calendar_event');
        await fetchEvents();
      }
    },
    [userId, coupleId, earnKisses, fetchEvents]
  );

  const deleteEvent = useCallback(
    async (eventId: string) => {
      await supabase.from('calendar_events').delete().eq('id', eventId);
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    },
    []
  );

  const getEventsForDate = useCallback(
    (date: string) => {
      return events.filter((e) => e.event_date === date);
    },
    [events]
  );

  // Build marked dates for react-native-calendars
  const markedDates = events.reduce(
    (acc, event) => {
      const existing = acc[event.event_date];
      if (existing) {
        existing.dots = [...(existing.dots ?? [{ color: existing.dotColor }]), { color: event.color }];
      } else {
        acc[event.event_date] = {
          marked: true,
          dotColor: event.color,
          dots: [{ color: event.color }],
        };
      }
      return acc;
    },
    {} as UseCalendarResult['markedDates']
  );

  // Mark anniversary
  if (couple?.anniversary_date) {
    const anniv = couple.anniversary_date;
    markedDates[anniv] = {
      marked: true,
      dotColor: '#FFD700',
      dots: [{ color: '#FFD700' }, ...(markedDates[anniv]?.dots ?? [])],
    };
  }

  return {
    events,
    markedDates,
    isLoading,
    addEvent,
    deleteEvent,
    getEventsForDate,
    refresh: fetchEvents,
  };
}
