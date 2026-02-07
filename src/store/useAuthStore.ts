// src/store/useAuthStore.ts
import { create } from 'zustand';
import { supabase, setCachedUserId } from '../lib/supabase';
import type { Profile, Couple } from '../types/database';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  couple: Couple | null;
  partnerProfile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  createCouple: (anniversaryDate: string) => Promise<string>;
  joinCouple: (pairingCode: string) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  couple: null,
  partnerProfile: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  initialize: async () => {
    try {
      set({ isLoading: true });
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setCachedUserId(session.user.id);
        set({ session, user: session.user });
        await get().fetchProfile();
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, newSession) => {
        const userId = newSession?.user?.id ?? null;
        setCachedUserId(userId);
        set({ session: newSession, user: newSession?.user ?? null });

        if (event === 'SIGNED_IN' && newSession?.user) {
          await get().fetchProfile();
        } else if (event === 'SIGNED_OUT') {
          set({ profile: null, couple: null, partnerProfile: null });
        }
      });
    } catch (error) {
      console.error('Auth init error:', error);
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  signUp: async (email: string, password: string, displayName: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
        },
      });
      if (error) throw error;
      if (data.user) {
        setCachedUserId(data.user.id);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Błąd rejestracji';
      set({ error: message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) {
        setCachedUserId(data.user.id);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Błąd logowania';
      set({ error: message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      await supabase.auth.signOut();
      setCachedUserId(null);
      set({ session: null, user: null, profile: null, couple: null, partnerProfile: null });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Błąd wylogowania';
      set({ error: message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchProfile: async () => {
    const userId = get().user?.id;
    if (!userId) return;

    try {
      // Fetch own profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      set({ profile });

      // If user has a couple, fetch couple data and partner profile
      if (profile.couple_id) {
        const { data: couple, error: coupleError } = await supabase
          .from('couples')
          .select('*')
          .eq('id', profile.couple_id)
          .single();

        if (coupleError) throw coupleError;
        set({ couple });

        // Fetch partner profile
        const { data: partners, error: partnerError } = await supabase
          .from('profiles')
          .select('*')
          .eq('couple_id', profile.couple_id)
          .neq('id', userId);

        if (!partnerError && partners && partners.length > 0) {
          set({ partnerProfile: partners[0] ?? null });
        }
      }
    } catch (error) {
      console.error('Fetch profile error:', error);
    }
  },

  createCouple: async (anniversaryDate: string) => {
    const userId = get().user?.id;
    if (!userId) throw new Error('Not authenticated');

    set({ isLoading: true, error: null });
    try {
      // Create couple
      const { data: couple, error: coupleError } = await supabase
        .from('couples')
        .insert({ anniversary_date: anniversaryDate })
        .select()
        .single();

      if (coupleError) throw coupleError;

      // Update own profile with couple_id and role
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ couple_id: couple.id, role: 'partner_a' })
        .eq('id', userId);

      if (profileError) throw profileError;

      await get().fetchProfile();
      return couple.pairing_code;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Błąd tworzenia pary';
      set({ error: message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  joinCouple: async (pairingCode: string) => {
    const userId = get().user?.id;
    if (!userId) throw new Error('Not authenticated');

    set({ isLoading: true, error: null });
    try {
      // Find couple by pairing code
      const { data: couple, error: findError } = await supabase
        .from('couples')
        .select('*')
        .eq('pairing_code', pairingCode.trim().toLowerCase())
        .single();

      if (findError || !couple) {
        throw new Error('Nie znaleziono pary z tym kodem. Sprawdź kod i spróbuj ponownie.');
      }

      // Check if couple already has two members
      const { data: members, error: membersError } = await supabase
        .from('profiles')
        .select('id')
        .eq('couple_id', couple.id);

      if (membersError) throw membersError;
      if (members && members.length >= 2) {
        throw new Error('Ta para ma już dwóch partnerów.');
      }

      // Update own profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ couple_id: couple.id, role: 'partner_b' })
        .eq('id', userId);

      if (profileError) throw profileError;

      await get().fetchProfile();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Błąd dołączania do pary';
      set({ error: message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
