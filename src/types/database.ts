// src/types/database.ts
// Auto-generated types matching Supabase schema

export interface Couple {
  id: string;
  pairing_code: string;
  anniversary_date: string;
  created_at: string;
}

export interface Profile {
  id: string;
  couple_id: string | null;
  display_name: string;
  avatar_url: string | null;
  role: 'partner_a' | 'partner_b' | 'pending';
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  user_id: string;
  couple_id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  is_sharing: boolean;
  updated_at: string;
}

export interface Moment {
  id: string;
  couple_id: string;
  author_id: string;
  media_url: string;
  media_type: 'image' | 'video' | 'gif' | 'raw';
  mime_type: string;
  thumbnail_url: string | null;
  caption: string;
  file_size_bytes: number;
  width: number;
  height: number;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  couple_id: string;
  author_id: string | null;
  title: string;
  description: string;
  event_date: string;
  event_time: string | null;
  color: string;
  is_recurring: boolean;
  recurrence_rule: string | null;
  created_at: string;
}

export interface Pet {
  id: string;
  couple_id: string;
  name: string;
  happiness: number;
  hunger: number;
  outfit_id: string;
  last_fed_at: string;
  last_pet_at: string;
  created_at: string;
  updated_at: string;
}

export interface PetOutfit {
  id: string;
  name: string;
  description: string;
  price: number;
  image_key: string;
  category: 'hat' | 'shirt' | 'accessory' | 'full';
  rarity: 'common' | 'rare' | 'legendary';
}

export interface OwnedOutfit {
  id: string;
  couple_id: string;
  outfit_id: string;
  purchased_at: string;
}

export interface KissWallet {
  id: string;
  couple_id: string;
  balance: number;
  total_earned: number;
  updated_at: string;
}

export interface KissTransaction {
  id: string;
  couple_id: string;
  user_id: string | null;
  amount: number;
  reason: KissReason;
  reference_id: string | null;
  created_at: string;
}

export type KissReason =
  | 'daily_login'
  | 'send_kiss'
  | 'upload_moment'
  | 'feed_pet'
  | 'pet_pet'
  | 'streak_bonus'
  | 'purchase_outfit'
  | 'calendar_event';

export interface Nudge {
  id: string;
  couple_id: string;
  sender_id: string;
  receiver_id: string;
  pattern: number[];
  pattern_name: string;
  emoji: string;
  is_read: boolean;
  created_at: string;
}

export interface Streak {
  id: string;
  couple_id: string;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  updated_at: string;
}

// Vibration pattern presets
export const VIBRATION_PATTERNS: Record<string, { name: string; pattern: number[]; emoji: string }> = {
  gentle_tap: { name: 'Delikatny stuk', pattern: [100], emoji: '👆' },
  double_tap: { name: 'Podwójny stuk', pattern: [100, 80, 100], emoji: '👆👆' },
  heartbeat: { name: 'Bicie serca', pattern: [200, 100, 200, 400, 200, 100, 200], emoji: '💓' },
  kiss: { name: 'Buziak', pattern: [50, 50, 50, 50, 300], emoji: '💋' },
  hug: { name: 'Przytulas', pattern: [500, 100, 500], emoji: '🤗' },
  sos: { name: 'Tęsknię!', pattern: [100, 50, 100, 50, 100, 200, 300, 50, 300, 50, 300, 200, 100, 50, 100, 50, 100], emoji: '😭' },
  party: { name: 'Impreza!', pattern: [50, 30, 50, 30, 50, 30, 100, 50, 100, 50, 200], emoji: '🎉' },
  custom: { name: 'Własny wzór', pattern: [], emoji: '✨' },
};

// Pet mood thresholds
export const PET_MOOD = {
  ECSTATIC: 90,
  HAPPY: 70,
  CONTENT: 50,
  SAD: 30,
  MISERABLE: 0,
} as const;

// Kiss rewards
export const KISS_REWARDS: Record<KissReason, number> = {
  daily_login: 3,
  send_kiss: 1,
  upload_moment: 5,
  feed_pet: 2,
  pet_pet: 1,
  streak_bonus: 10,
  purchase_outfit: 0,
  calendar_event: 3,
} as const;
