// src/store/useCoupleStore.ts
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type {
  Pet,
  KissWallet,
  Streak,
  PetOutfit,
  OwnedOutfit,
  KissReason,
} from '../types/database';
import { KISS_REWARDS } from '../types/database';
import dayjs from 'dayjs';

interface CoupleState {
  pet: Pet | null;
  wallet: KissWallet | null;
  streak: Streak | null;
  outfitsShop: PetOutfit[];
  ownedOutfits: OwnedOutfit[];
  daysTogetherCount: number;
  isLoading: boolean;

  loadCoupleData: (coupleId: string) => Promise<void>;
  feedPet: (coupleId: string, userId: string) => Promise<void>;
  petThePet: (coupleId: string, userId: string) => Promise<void>;
  changePetName: (coupleId: string, newName: string) => Promise<void>;
  changePetOutfit: (coupleId: string, outfitId: string) => Promise<void>;
  purchaseOutfit: (coupleId: string, userId: string, outfitId: string) => Promise<boolean>;
  earnKisses: (coupleId: string, userId: string, reason: KissReason) => Promise<void>;
  updateStreak: (coupleId: string) => Promise<void>;
  calculateDaysTogether: (anniversaryDate: string) => void;
  subscribeToPetChanges: (coupleId: string) => () => void;
}

export const useCoupleStore = create<CoupleState>((set, get) => ({
  pet: null,
  wallet: null,
  streak: null,
  outfitsShop: [],
  ownedOutfits: [],
  daysTogetherCount: 0,
  isLoading: false,

  loadCoupleData: async (coupleId: string) => {
    set({ isLoading: true });
    try {
      const [petResult, walletResult, streakResult, outfitsResult, ownedResult] =
        await Promise.all([
          supabase.from('pets').select('*').eq('couple_id', coupleId).single(),
          supabase.from('kiss_wallet').select('*').eq('couple_id', coupleId).single(),
          supabase.from('streaks').select('*').eq('couple_id', coupleId).single(),
          supabase.from('pet_outfits').select('*').order('price', { ascending: true }),
          supabase.from('owned_outfits').select('*').eq('couple_id', coupleId),
        ]);

      set({
        pet: petResult.data,
        wallet: walletResult.data,
        streak: streakResult.data,
        outfitsShop: outfitsResult.data ?? [],
        ownedOutfits: ownedResult.data ?? [],
      });
    } catch (error) {
      console.error('Load couple data error:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  feedPet: async (coupleId: string, userId: string) => {
    const { pet } = get();
    if (!pet) return;

    // Cooldown: min 30min between feeds
    const lastFed = dayjs(pet.last_fed_at);
    if (dayjs().diff(lastFed, 'minute') < 30) {
      return;
    }

    const newHunger = Math.max(0, pet.hunger - 20);
    const newHappiness = Math.min(100, pet.happiness + 5);

    const { data, error } = await supabase
      .from('pets')
      .update({
        hunger: newHunger,
        happiness: newHappiness,
        last_fed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('couple_id', coupleId)
      .select()
      .single();

    if (!error && data) {
      set({ pet: data });
      await get().earnKisses(coupleId, userId, 'feed_pet');
    }
  },

  petThePet: async (coupleId: string, userId: string) => {
    const { pet } = get();
    if (!pet) return;

    // Cooldown: min 5min between pets
    const lastPet = dayjs(pet.last_pet_at);
    if (dayjs().diff(lastPet, 'minute') < 5) {
      return;
    }

    const newHappiness = Math.min(100, pet.happiness + 10);

    const { data, error } = await supabase
      .from('pets')
      .update({
        happiness: newHappiness,
        last_pet_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('couple_id', coupleId)
      .select()
      .single();

    if (!error && data) {
      set({ pet: data });
      await get().earnKisses(coupleId, userId, 'pet_pet');
    }
  },

  changePetName: async (coupleId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed.length > 20) return;

    const { data, error } = await supabase
      .from('pets')
      .update({ name: trimmed, updated_at: new Date().toISOString() })
      .eq('couple_id', coupleId)
      .select()
      .single();

    if (!error && data) {
      set({ pet: data });
    }
  },

  changePetOutfit: async (coupleId: string, outfitId: string) => {
    const { ownedOutfits } = get();
    const isOwned = ownedOutfits.some((o) => o.outfit_id === outfitId);
    if (!isOwned) return;

    const { data, error } = await supabase
      .from('pets')
      .update({ outfit_id: outfitId, updated_at: new Date().toISOString() })
      .eq('couple_id', coupleId)
      .select()
      .single();

    if (!error && data) {
      set({ pet: data });
    }
  },

  purchaseOutfit: async (coupleId: string, userId: string, outfitId: string) => {
    const { wallet, outfitsShop, ownedOutfits } = get();
    if (!wallet) return false;

    // Already owned?
    if (ownedOutfits.some((o) => o.outfit_id === outfitId)) return false;

    const outfit = outfitsShop.find((o) => o.id === outfitId);
    if (!outfit) return false;

    if (wallet.balance < outfit.price) return false;

    // Use atomic spend function
    const { data: success, error } = await supabase.rpc('spend_kisses', {
      p_couple_id: coupleId,
      p_user_id: userId,
      p_amount: outfit.price,
      p_reason: 'purchase_outfit',
      p_reference_id: null,
    });

    if (error || !success) return false;

    // Insert owned outfit
    const { error: insertError } = await supabase
      .from('owned_outfits')
      .insert({ couple_id: coupleId, outfit_id: outfitId });

    if (insertError) return false;

    // Reload wallet and owned outfits
    const [walletResult, ownedResult] = await Promise.all([
      supabase.from('kiss_wallet').select('*').eq('couple_id', coupleId).single(),
      supabase.from('owned_outfits').select('*').eq('couple_id', coupleId),
    ]);

    set({
      wallet: walletResult.data,
      ownedOutfits: ownedResult.data ?? [],
    });

    return true;
  },

  earnKisses: async (coupleId: string, userId: string, reason: KissReason) => {
    const amount = KISS_REWARDS[reason];
    if (amount <= 0) return;

    const { error } = await supabase.rpc('earn_kisses', {
      p_couple_id: coupleId,
      p_user_id: userId,
      p_amount: amount,
      p_reason: reason,
    });

    if (!error) {
      const { data } = await supabase
        .from('kiss_wallet')
        .select('*')
        .eq('couple_id', coupleId)
        .single();
      if (data) set({ wallet: data });
    }
  },

  updateStreak: async (coupleId: string) => {
    const { streak } = get();
    if (!streak) return;

    const today = dayjs().format('YYYY-MM-DD');
    if (streak.last_active_date === today) return;

    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    const isConsecutive = streak.last_active_date === yesterday;

    const newStreak = isConsecutive ? streak.current_streak + 1 : 1;
    const longestStreak = Math.max(streak.longest_streak, newStreak);

    const { data, error } = await supabase
      .from('streaks')
      .update({
        current_streak: newStreak,
        longest_streak: longestStreak,
        last_active_date: today,
        updated_at: new Date().toISOString(),
      })
      .eq('couple_id', coupleId)
      .select()
      .single();

    if (!error && data) {
      set({ streak: data });

      // Bonus kisses for milestone streaks
      if (newStreak % 7 === 0) {
        const userId = (await supabase.auth.getUser()).data.user?.id;
        if (userId) {
          await get().earnKisses(coupleId, userId, 'streak_bonus');
        }
      }
    }
  },

  calculateDaysTogether: (anniversaryDate: string) => {
    const days = dayjs().diff(dayjs(anniversaryDate), 'day');
    set({ daysTogetherCount: Math.max(0, days) });
  },

  subscribeToPetChanges: (coupleId: string) => {
    const channel = supabase
      .channel(`pet-${coupleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pets',
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
            set({ pet: payload.new as Pet });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kiss_wallet',
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
            set({ wallet: payload.new as KissWallet });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
