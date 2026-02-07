-- SweetSync: Complete Database Schema
-- Migration 001: Initial Setup
-- Run this in Supabase SQL Editor

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- COUPLES (the core entity - a pair is a first-class citizen)
-- ============================================================
CREATE TABLE public.couples (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  pairing_code text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(4), 'hex'),
  anniversary_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================================
-- PROFILES (linked to auth.users AND to a couple)
-- ============================================================
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  couple_id uuid REFERENCES public.couples(id) ON DELETE SET NULL,
  display_name text NOT NULL DEFAULT 'Kochanie',
  avatar_url text,
  role text NOT NULL DEFAULT 'pending' CHECK (role IN ('partner_a', 'partner_b', 'pending')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_profiles_couple_id ON public.profiles(couple_id);

-- ============================================================
-- LOCATIONS (realtime GPS sharing)
-- ============================================================
CREATE TABLE public.locations (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  couple_id uuid REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL,
  latitude double precision NOT NULL DEFAULT 0,
  longitude double precision NOT NULL DEFAULT 0,
  accuracy double precision DEFAULT 0,
  is_sharing boolean DEFAULT true NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_locations_couple_id ON public.locations(couple_id);

-- ============================================================
-- MOMENTS (shared media gallery - photos, videos, gifs, etc.)
-- ============================================================
CREATE TABLE public.moments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  couple_id uuid REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  media_url text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video', 'gif', 'raw')),
  mime_type text NOT NULL DEFAULT 'image/jpeg',
  thumbnail_url text,
  caption text DEFAULT '',
  file_size_bytes bigint DEFAULT 0,
  width integer DEFAULT 0,
  height integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_moments_couple_id ON public.moments(couple_id);
CREATE INDEX idx_moments_created_at ON public.moments(created_at DESC);

-- ============================================================
-- CALENDAR EVENTS (shared couple calendar)
-- ============================================================
CREATE TABLE public.calendar_events (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  couple_id uuid REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text DEFAULT '',
  event_date date NOT NULL,
  event_time time,
  color text DEFAULT '#FF6B9D',
  is_recurring boolean DEFAULT false,
  recurrence_rule text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_calendar_couple_date ON public.calendar_events(couple_id, event_date);

-- ============================================================
-- PET (virtual maltese dog)
-- ============================================================
CREATE TABLE public.pets (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  couple_id uuid REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name text NOT NULL DEFAULT 'Puszek',
  happiness integer NOT NULL DEFAULT 50 CHECK (happiness >= 0 AND happiness <= 100),
  hunger integer NOT NULL DEFAULT 50 CHECK (hunger >= 0 AND hunger <= 100),
  outfit_id text DEFAULT 'default',
  last_fed_at timestamptz DEFAULT now(),
  last_pet_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================================
-- PET OUTFITS (purchasable with kiss currency)
-- ============================================================
CREATE TABLE public.pet_outfits (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text DEFAULT '',
  price integer NOT NULL DEFAULT 10,
  image_key text NOT NULL,
  category text NOT NULL CHECK (category IN ('hat', 'shirt', 'accessory', 'full')),
  rarity text NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'legendary'))
);

-- ============================================================
-- OWNED OUTFITS (couple's inventory)
-- ============================================================
CREATE TABLE public.owned_outfits (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  couple_id uuid REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL,
  outfit_id text REFERENCES public.pet_outfits(id) ON DELETE CASCADE NOT NULL,
  purchased_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(couple_id, outfit_id)
);

-- ============================================================
-- KISS CURRENCY (wallet per couple)
-- ============================================================
CREATE TABLE public.kiss_wallet (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  couple_id uuid REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_earned integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================================
-- KISS TRANSACTIONS (audit trail)
-- ============================================================
CREATE TABLE public.kiss_transactions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  couple_id uuid REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount integer NOT NULL,
  reason text NOT NULL CHECK (reason IN (
    'daily_login', 'send_kiss', 'upload_moment', 'feed_pet',
    'pet_pet', 'streak_bonus', 'purchase_outfit', 'calendar_event'
  )),
  reference_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_kiss_tx_couple ON public.kiss_transactions(couple_id, created_at DESC);

-- ============================================================
-- NUDGES (custom vibration patterns sent to partner)
-- ============================================================
CREATE TABLE public.nudges (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  couple_id uuid REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  pattern jsonb NOT NULL DEFAULT '[200, 100, 200]'::jsonb,
  pattern_name text DEFAULT 'Zaczepka',
  emoji text DEFAULT '💋',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_nudges_receiver ON public.nudges(receiver_id, is_read, created_at DESC);

-- ============================================================
-- DAILY STREAKS
-- ============================================================
CREATE TABLE public.streaks (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  couple_id uuid REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL UNIQUE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_active_date date,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Helper function: get current user's couple_id
CREATE OR REPLACE FUNCTION public.get_my_couple_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT couple_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Helper function: check if user belongs to couple
CREATE OR REPLACE FUNCTION public.is_couple_member(target_couple_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND couple_id = target_couple_id
  );
$$;

-- PROFILES RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can read partner profile" ON public.profiles
  FOR SELECT USING (
    couple_id IS NOT NULL AND couple_id = public.get_my_couple_id()
  );

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- COUPLES RLS
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple members can read their couple" ON public.couples
  FOR SELECT USING (public.is_couple_member(id));

CREATE POLICY "Anyone can read couple by pairing code" ON public.couples
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create couples" ON public.couples
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- LOCATIONS RLS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple members can read locations" ON public.locations
  FOR SELECT USING (public.is_couple_member(couple_id));

CREATE POLICY "Users can upsert own location" ON public.locations
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own location" ON public.locations
  FOR UPDATE USING (user_id = auth.uid());

-- MOMENTS RLS
ALTER TABLE public.moments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple members can read moments" ON public.moments
  FOR SELECT USING (public.is_couple_member(couple_id));

CREATE POLICY "Users can insert moments for their couple" ON public.moments
  FOR INSERT WITH CHECK (
    author_id = auth.uid() AND couple_id = public.get_my_couple_id()
  );

CREATE POLICY "Authors can delete own moments" ON public.moments
  FOR DELETE USING (author_id = auth.uid());

-- CALENDAR RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple members can read events" ON public.calendar_events
  FOR SELECT USING (public.is_couple_member(couple_id));

CREATE POLICY "Couple members can insert events" ON public.calendar_events
  FOR INSERT WITH CHECK (
    author_id = auth.uid() AND couple_id = public.get_my_couple_id()
  );

CREATE POLICY "Couple members can update events" ON public.calendar_events
  FOR UPDATE USING (public.is_couple_member(couple_id));

CREATE POLICY "Authors can delete events" ON public.calendar_events
  FOR DELETE USING (author_id = auth.uid());

-- PETS RLS
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple members can read pet" ON public.pets
  FOR SELECT USING (public.is_couple_member(couple_id));

CREATE POLICY "Couple members can update pet" ON public.pets
  FOR UPDATE USING (public.is_couple_member(couple_id));

CREATE POLICY "Couple members can insert pet" ON public.pets
  FOR INSERT WITH CHECK (couple_id = public.get_my_couple_id());

-- PET OUTFITS RLS (public read)
ALTER TABLE public.pet_outfits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read outfits" ON public.pet_outfits
  FOR SELECT USING (true);

-- OWNED OUTFITS RLS
ALTER TABLE public.owned_outfits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple members can read owned outfits" ON public.owned_outfits
  FOR SELECT USING (public.is_couple_member(couple_id));

CREATE POLICY "Couple members can insert owned outfits" ON public.owned_outfits
  FOR INSERT WITH CHECK (couple_id = public.get_my_couple_id());

-- KISS WALLET RLS
ALTER TABLE public.kiss_wallet ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple members can read wallet" ON public.kiss_wallet
  FOR SELECT USING (public.is_couple_member(couple_id));

CREATE POLICY "Couple members can update wallet" ON public.kiss_wallet
  FOR UPDATE USING (public.is_couple_member(couple_id));

CREATE POLICY "Couple members can insert wallet" ON public.kiss_wallet
  FOR INSERT WITH CHECK (couple_id = public.get_my_couple_id());

-- KISS TRANSACTIONS RLS
ALTER TABLE public.kiss_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple members can read transactions" ON public.kiss_transactions
  FOR SELECT USING (public.is_couple_member(couple_id));

CREATE POLICY "Couple members can insert transactions" ON public.kiss_transactions
  FOR INSERT WITH CHECK (couple_id = public.get_my_couple_id());

-- NUDGES RLS
ALTER TABLE public.nudges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read received nudges" ON public.nudges
  FOR SELECT USING (receiver_id = auth.uid() OR sender_id = auth.uid());

CREATE POLICY "Users can send nudges to partner" ON public.nudges
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND public.is_couple_member(couple_id)
  );

CREATE POLICY "Receiver can update nudge" ON public.nudges
  FOR UPDATE USING (receiver_id = auth.uid());

-- STREAKS RLS
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple members can read streak" ON public.streaks
  FOR SELECT USING (public.is_couple_member(couple_id));

CREATE POLICY "Couple members can update streak" ON public.streaks
  FOR UPDATE USING (public.is_couple_member(couple_id));

CREATE POLICY "Couple members can insert streak" ON public.streaks
  FOR INSERT WITH CHECK (couple_id = public.get_my_couple_id());

-- ============================================================
-- ENABLE REALTIME for key tables
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.nudges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.moments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kiss_wallet;

-- ============================================================
-- SEED DATA: Default pet outfits
-- ============================================================
INSERT INTO public.pet_outfits (id, name, description, price, image_key, category, rarity) VALUES
  ('default', 'Naturalny', 'Puszek au naturel', 0, 'outfit_default', 'full', 'common'),
  ('sailor', 'Marynarz', 'Ahoj przygodo!', 10, 'outfit_sailor', 'shirt', 'common'),
  ('princess', 'Księżniczka', 'Tiara i tutu', 15, 'outfit_princess', 'full', 'common'),
  ('hoodie_pink', 'Różowa bluza', 'Ciepło i słodko', 8, 'outfit_hoodie_pink', 'shirt', 'common'),
  ('hoodie_blue', 'Niebieska bluza', 'Chłodny szyk', 8, 'outfit_hoodie_blue', 'shirt', 'common'),
  ('santa', 'Mikołaj', 'Ho ho ho!', 20, 'outfit_santa', 'full', 'rare'),
  ('bunny', 'Króliczek', 'Uszy i ogoneczek', 25, 'outfit_bunny', 'full', 'rare'),
  ('tuxedo', 'Smoking', 'Elegancki pan', 30, 'outfit_tuxedo', 'full', 'rare'),
  ('crown', 'Korona królewska', 'Władca maltańczyków', 50, 'outfit_crown', 'hat', 'legendary'),
  ('superhero', 'Superbohater', 'Peleryna i maska!', 60, 'outfit_superhero', 'full', 'legendary')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- FUNCTIONS: Atomic kiss spending
-- ============================================================
CREATE OR REPLACE FUNCTION public.spend_kisses(
  p_couple_id uuid,
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_reference_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_balance integer;
BEGIN
  SELECT balance INTO current_balance
  FROM public.kiss_wallet
  WHERE couple_id = p_couple_id
  FOR UPDATE;

  IF current_balance IS NULL OR current_balance < p_amount THEN
    RETURN false;
  END IF;

  UPDATE public.kiss_wallet
  SET balance = balance - p_amount, updated_at = now()
  WHERE couple_id = p_couple_id;

  INSERT INTO public.kiss_transactions (couple_id, user_id, amount, reason, reference_id)
  VALUES (p_couple_id, p_user_id, -p_amount, p_reason, p_reference_id);

  RETURN true;
END;
$$;

-- ============================================================
-- FUNCTIONS: Earn kisses
-- ============================================================
CREATE OR REPLACE FUNCTION public.earn_kisses(
  p_couple_id uuid,
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_reference_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_balance integer;
BEGIN
  INSERT INTO public.kiss_wallet (couple_id, balance, total_earned)
  VALUES (p_couple_id, p_amount, p_amount)
  ON CONFLICT (couple_id) DO UPDATE
  SET balance = kiss_wallet.balance + p_amount,
      total_earned = kiss_wallet.total_earned + p_amount,
      updated_at = now();

  SELECT balance INTO new_balance
  FROM public.kiss_wallet
  WHERE couple_id = p_couple_id;

  INSERT INTO public.kiss_transactions (couple_id, user_id, amount, reason, reference_id)
  VALUES (p_couple_id, p_user_id, p_amount, p_reason, p_reference_id);

  RETURN new_balance;
END;
$$;

-- ============================================================
-- TRIGGER: Auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Kochanie')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TRIGGER: Auto-create pet + wallet + streak when couple forms
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_couple_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.pets (couple_id) VALUES (NEW.id);
  INSERT INTO public.kiss_wallet (couple_id, balance) VALUES (NEW.id, 20);
  INSERT INTO public.streaks (couple_id) VALUES (NEW.id);
  INSERT INTO public.owned_outfits (couple_id, outfit_id) VALUES (NEW.id, 'default');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_couple_created
  AFTER INSERT ON public.couples
  FOR EACH ROW EXECUTE FUNCTION public.handle_couple_created();

-- ============================================================
-- STORAGE BUCKETS (run after migration)
-- ============================================================
-- Execute these in Supabase Dashboard > Storage:
-- 1. Create bucket "moments" (public: false, file size limit: 50MB)
-- 2. Create bucket "avatars" (public: true, file size limit: 5MB)
--
-- Storage policies (SQL):
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('moments', 'moments', false, 52428800),
  ('avatars', 'avatars', true, 5242880)
ON CONFLICT (id) DO NOTHING;

-- Moments storage policy
CREATE POLICY "Couple members can upload moments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'moments' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Couple members can read moments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'moments' AND
    auth.uid() IS NOT NULL
  );

-- Avatars storage policy
CREATE POLICY "Users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Public avatar read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
