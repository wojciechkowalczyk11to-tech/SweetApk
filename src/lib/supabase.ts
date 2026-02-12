// src/lib/supabase.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

const FALLBACK_SUPABASE_URL = 'https://placeholder.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'placeholder-anon-key';

const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);
const supabaseConfigError = hasSupabaseConfig
  ? null
  : 'Brak konfiguracji Supabase (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY). Uzupełnij plik .env i uruchom aplikację ponownie.';

if (supabaseConfigError) {
  console.error(supabaseConfigError);
}

// SecureStore adapter for auth tokens (mobile)
// Falls back to AsyncStorage on web for dev
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }

    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
      return;
    }

    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('SecureStore setItem error:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
      return;
    }

    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('SecureStore removeItem error:', error);
    }
  },
};

export const supabase = createClient(
  hasSupabaseConfig ? supabaseUrl : FALLBACK_SUPABASE_URL,
  hasSupabaseConfig ? supabaseAnonKey : FALLBACK_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

export function getSupabaseConfigError(): string | null {
  return supabaseConfigError;
}

// Helper to get current user ID synchronously from cached session
let cachedUserId: string | null = null;

export function getCachedUserId(): string | null {
  return cachedUserId;
}

export function setCachedUserId(id: string | null): void {
  cachedUserId = id;
}

// Initialize cached user from session
export async function initCachedUser(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const id = session?.user?.id ?? null;
  setCachedUserId(id);
  return id;
}
