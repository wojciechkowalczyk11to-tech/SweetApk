# SweetSync 💕

Romantyczna aplikacja dla par – Android / Web (Expo/React Native + Supabase).

[![Build Android APK](https://github.com/wojciechkowalczyk11to-tech/SweetApk/actions/workflows/build-apk.yml/badge.svg)](https://github.com/wojciechkowalczyk11to-tech/SweetApk/actions/workflows/build-apk.yml)

## Funkcje

- **Wirtualny piesek** (Maltańczyk) z systemem szczęścia/głodu, strojami i walutą "buziaki"
- **Galeria "Chwile"** – wspólne zdjęcia/wideo (JPG, PNG, GIF, HEIC, RAW, MP4, MOV)
- **Współdzielony kalendarz** z kolorowymi wydarzeniami
- **Udostępnianie lokalizacji** w czasie rzeczywistym na mapie
- **Zaczepki wibracyjne** – gotowe wzory + nagrywanie własnych rytmów
- **Sklep z ubrankami** dla pieska (kupowane za buziaki)
- **Licznik dni razem** + serie logowań
- **System monetyzacji** – in-app purchases, paczki buziaków, stroje premium

## Tech Stack

| Warstwa | Technologia |
|---------|-------------|
| Frontend | Expo 52 + React Native + TypeScript |
| State | Zustand |
| Backend | Supabase (Auth, Database, Storage, Realtime) |
| Maps | react-native-maps |
| Calendar | react-native-calendars |
| Build | EAS Build / GitHub Actions |
| Web Deploy | Vercel (Expo Web) |
| Monetyzacja | In-App Purchases (przygotowane) |

## Required Manual Steps

### 1. EAS Project ID
```bash
npx eas build:configure
# Updates app.json with your project ID
```

### 2. GitHub Secret (for CI/CD)
- Settings → Secrets → Actions
- Add: `EXPO_TOKEN` from https://expo.dev/accounts/settings

### 3. Supabase
- Create project on supabase.com
- Run `supabase/migration_001_init.sql`
- Copy URL + anon key to `.env`

## Setup

### 1. Supabase

1. Utwórz projekt na [supabase.com](https://supabase.com)
2. W SQL Editor uruchom: `supabase/migration_001_init.sql`
3. W Settings → API skopiuj: **Project URL** i **anon/public key**
4. W Authentication → Settings:
   - Włącz Email provider
   - Wyłącz "Confirm email" (dev)
5. W Storage sprawdź że buckety `moments` i `avatars` się utworzyły (migracja je tworzy)

### 2. Projekt

```bash
git clone <repo-url>
cd SweetSync
cp .env.example .env
# Uzupełnij .env wartościami z Supabase:
# EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
# EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...

npm install
```

### 3. Uruchomienie (dev)

```bash
npx expo start
# Skanuj QR code w Expo Go na telefonie
```

### 4. Build APK

**Opcja A – EAS (zalecana):**
```bash
npx eas login
npx eas build:configure
npx eas build --platform android --profile preview
```

**Opcja B – GitHub Actions:**
1. W repo Settings → Secrets dodaj: `EXPO_TOKEN` (z https://expo.dev/accounts/settings)
2. Push na `main` → workflow automatycznie buduje APK
3. APK dostępne w GitHub Actions artifacts

### CI APK build (GitHub Actions)
- Workflow uruchamia się teraz dla `push` na `main` oraz dla `pull_request` do `main`, więc APK check przechodzi przed mergem.
- Artefakt APK znajdziesz w: **GitHub → Actions → Build Android APK → wybrany run → Artifacts**.

**Opcja C – Local Gradle:**
```bash
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

## Struktura projektu

```
SweetSync/
├── App.tsx                          # Root navigator (Auth → Pairing → MainTabs)
├── app.json                         # Expo config + permissions
├── eas.json                         # EAS build profiles
├── package.json
├── babel.config.js
├── tsconfig.json
├── .env.example
├── .github/workflows/build-apk.yml  # CI/CD
├── assets/                          # icon, splash, adaptive-icon
├── supabase/
│   └── migration_001_init.sql       # Pełny schemat DB (14 tabel + RLS + triggers)
└── src/
    ├── lib/
    │   ├── supabase.ts              # Klient Supabase + SecureStore auth
    │   └── theme.ts                 # Kolory, spacing, cienie
    ├── types/
    │   └── database.ts              # Typy TS + stałe (VIBRATION_PATTERNS, KISS_REWARDS, PET_MOOD)
    ├── store/
    │   ├── useAuthStore.ts          # Auth + profil + parowanie par
    │   └── useCoupleStore.ts        # Pet + wallet + streak + outfity
    ├── hooks/
    │   ├── useLocationRealtime.ts   # GPS + Haversine distance + realtime
    │   ├── useNudges.ts             # Wibracje + custom patterns
    │   ├── useMoments.ts            # Upload zdjęć/wideo + galeria
    │   └── useCalendar.ts           # Wspólne wydarzenia
    └── screens/
        ├── AuthScreen.tsx           # Login / Rejestracja
        ├── PairingScreen.tsx        # Twórz parę / Dołącz kodem
        ├── HomeScreen.tsx           # Dashboard + piesek + quick actions
        ├── MomentsScreen.tsx        # Galeria (siatka 3 kolumny)
        ├── CalendarScreen.tsx       # Kalendarz + wydarzenia
        ├── LocationScreen.tsx       # Mapa z pozycjami
        ├── NudgeScreen.tsx          # Presety + custom pattern recorder
        ├── PetShopScreen.tsx        # Sklep z ubrankami
        └── ProfileScreen.tsx        # Ustawienia + stats + wyloguj
```

## Ekonomia buziaków 💋

| Akcja | Buziaki |
|-------|---------|
| Logowanie dzienne | +3 |
| Wysłanie buziaka | +1 |
| Upload zdjęcia | +5 |
| Karmienie pieska | +2 |
| Głaskanie pieska | +1 |
| Bonus za serię (co 7 dni) | +10 |
| Dodanie wydarzenia | +3 |

## GitHub Secrets (wymagane dla CI)

| Secret | Opis |
|--------|------|
| `EXPO_TOKEN` | Token z expo.dev (Settings → Access Tokens) |

## Uwagi dla Jules

1. **Przed buildem** upewnij się, że `app.json` → `expo.extra.eas.projectId` jest ustawione (po `eas build:configure`)
2. **Supabase migration** musi być uruchomiona PRZED pierwszym uruchomieniem apki
3. **Buckety Storage** tworzy migracja automatycznie – nie twórz ręcznie
4. **RLS** jest włączony – bez poprawnego tokena auth żaden request nie przejdzie
5. **Realtime** jest aktywowany na tabelach: `locations`, `nudges`, `moments`, `pets`, `kiss_wallet`

## Wdrożenie (Deployment)

Szczegółowy przewodnik wdrożenia: **[DEPLOYMENT.md](DEPLOYMENT.md)**

### Szybki start – kanały dystrybucji

| Kanał | Komenda | Opis |
|-------|---------|------|
| **Dev** | `npm start` | Expo dev server + QR code |
| **Web** | `npm run build:web` | Eksport web → Vercel |
| **APK** | `npm run build:apk` | APK via EAS Build |
| **Google Play** | `npm run build:aab` | AAB via EAS Build |
| **Release** | `git tag v1.0.0 && git push --tags` | Automatyczny GitHub Release |

### Monetyzacja

Konfiguracja monetyzacji: `src/lib/monetization.ts`
- Paczki buziaków (in-app purchase)
- Stroje premium
- Subskrypcja SweetSync Premium
- Reklamy z nagrodą (opt-in)

### Dokumenty prawne

- [Polityka prywatności](PRIVACY_POLICY.md)
- [Regulamin](TERMS_OF_SERVICE.md)
