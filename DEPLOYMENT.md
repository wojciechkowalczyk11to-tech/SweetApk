# Przewodnik wdrożenia – SweetSync

Kompleksowy przewodnik od developmentu do produkcji.

## Spis treści

1. [Strategia wdrożenia](#strategia-wdrożenia)
2. [Konfiguracja środowiska](#konfiguracja-środowiska)
3. [Google Play Store](#google-play-store)
4. [F-Droid (Open Source)](#f-droid-open-source)
5. [Vercel (wersja webowa)](#vercel-wersja-webowa)
6. [Dystrybucja bezpośrednia (APK)](#dystrybucja-bezpośrednia-apk)
7. [Monetyzacja](#monetyzacja)
8. [CI/CD Pipeline](#cicd-pipeline)
9. [Monitoring i analityka](#monitoring-i-analityka)

---

## Strategia wdrożenia

### Rekomendowana ścieżka wdrożenia

| Kanał | Koszt | Czas | Priorytet | Uzasadnienie |
|-------|-------|------|-----------|--------------|
| **GitHub Releases (APK)** | $0 | Gotowy | 🟢 Teraz | Natychmiastowa dystrybucja dla testerów |
| **Vercel (Web)** | $0 | 1 dzień | 🟢 Teraz | Landing page + wersja webowa |
| **Google Play** | $25 jednorazowo | 1-2 tygodnie | 🟡 Wkrótce | Główny kanał dystrybucji |
| **F-Droid** | $0 | 2-4 tygodnie | 🟡 Opcjonalnie | Społeczność open-source |

---

## Konfiguracja środowiska

### 1. Supabase (Backend)

```bash
# 1. Utwórz projekt na supabase.com
# 2. Uruchom migrację bazy danych
psql -h db.YOUR_PROJECT.supabase.co -U postgres < supabase/migration_001_init.sql

# 3. Skopiuj dane do .env
cp .env.example .env
# Uzupełnij:
# EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
# EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 2. EAS Build (Expo Application Services)

```bash
# Zainstaluj EAS CLI
npm install -g eas-cli

# Zaloguj się
eas login

# Skonfiguruj projekt (ustawia projectId w app.json)
eas build:configure

# Build preview (APK)
eas build --platform android --profile preview

# Build produkcyjny (AAB dla Google Play)
eas build --platform android --profile production
```

### 3. Podpisywanie aplikacji

```bash
# EAS automatycznie zarządza kluczami podpisu
# Aby zarządzać ręcznie:
eas credentials
```

---

## Google Play Store

### Wymagania

- [x] Konto Google Play Developer ($25 jednorazowo)
- [x] Polityka prywatności (PRIVACY_POLICY.md)
- [x] Regulamin (TERMS_OF_SERVICE.md)
- [x] Ikona aplikacji (assets/icon.png)
- [x] Grafika promocyjna (do przygotowania)
- [x] Screenshoty (min. 2)
- [x] Opis aplikacji (fastlane/metadata/)

### Krok po kroku

1. **Zarejestruj się** na [play.google.com/console](https://play.google.com/console)
2. **Utwórz aplikację** → Typ: Aplikacja → Kategoria: Styl życia
3. **Rating**: PEGI 12 (funkcja udostępniania lokalizacji)
4. **Upload AAB**: użyj pliku z `eas build` lub GitHub Release
5. **Metadata**: skopiuj z `fastlane/metadata/android/pl-PL/`
6. **Polityka prywatności**: link do `PRIVACY_POLICY.md` lub hostuj na Vercel
7. **Submit do review** (1-7 dni)

### EAS Submit (automatyczny upload)

```bash
# Konfiguruj w eas.json (sekcja "submit")
eas submit --platform android --profile production
```

---

## F-Droid (Open Source)

### Wymagania

- [x] Kod źródłowy publiczny na GitHub
- [x] Licencja open-source (dodaj jeśli brak)
- [x] Brak proprietary dependencies
- [x] Budowanie z kodu źródłowego

### Plik metadanych F-Droid

Metadata F-Droid znajduje się w `fastlane/metadata/android/pl-PL/`.

### Zgłoszenie do F-Droid

1. Fork repozytorium [fdroiddata](https://gitlab.com/fdroid/fdroiddata)
2. Dodaj plik `metadata/com.sweetsync.app.yml`
3. Wyślij Merge Request
4. Czekaj na review (2-4 tygodnie)

---

## Vercel (wersja webowa)

### Konfiguracja

Plik `vercel.json` jest już skonfigurowany w repozytorium.

### Deployment

```bash
# Opcja 1: Automatyczny (połącz repo z Vercel)
# 1. Wejdź na vercel.com
# 2. Import Git Repository
# 3. Wybierz to repozytorium
# 4. Vercel automatycznie wykryje konfigurację

# Opcja 2: CLI
npm install -g vercel
vercel --prod
```

### Zmienne środowiskowe na Vercel

W panelu Vercel → Settings → Environment Variables dodaj:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

---

## Dystrybucja bezpośrednia (APK)

### GitHub Releases

Workflow `release.yml` automatycznie tworzy release gdy pushujemy tag:

```bash
# Utwórz tag wersji
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions automatycznie:
# 1. Buduje APK i AAB
# 2. Tworzy GitHub Release
# 3. Dołącza pliki do pobrania
```

### Manualne budowanie

```bash
# APK (instalacja bezpośrednia)
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk

# AAB (Google Play)
cd android && ./gradlew bundleRelease
# → android/app/build/outputs/bundle/release/app-release.aab
```

---

## Monetyzacja

### Strategia monetyzacji

SweetSync używa modelu **freemium** z wirtualną walutą:

| Model | Opis | Status |
|-------|------|--------|
| **Darmowa wersja** | Wszystkie podstawowe funkcje | ✅ Gotowy |
| **Waluta wirtualna** | Buziaki za aktywność | ✅ Gotowy |
| **In-App Purchases** | Kupowanie buziaków za pieniądze | 🟡 Przygotowany |
| **Premium outfity** | Ekskluzywne stroje za prawdziwą walutę | 🟡 Przygotowany |
| **Subskrypcja Premium** | Dodatkowe funkcje (np. więcej pamięci) | 🔴 Planowany |

### Implementacja In-App Purchases

Konfiguracja przygotowana w `src/lib/monetization.ts`:

```typescript
// Dostępne produkty
KISS_PACK_SMALL   // 50 buziaków – $0.99
KISS_PACK_MEDIUM  // 150 buziaków – $2.49
KISS_PACK_LARGE   // 500 buziaków – $4.99
PREMIUM_MONTHLY   // Subskrypcja – $1.99/mies.
```

### Dodanie do Google Play

1. W Google Play Console → Monetization → Products
2. Utwórz produkty jednorazowe (kiss packs)
3. Utwórz subskrypcję (premium)
4. Przetestuj z licencjami testowymi

---

## CI/CD Pipeline

### Istniejące workflow

| Workflow | Trigger | Opis |
|----------|---------|------|
| `build-apk.yml` | Push/PR do main | Buduje APK, uploaduje artefakt |
| `release.yml` | Tag `v*` | Buduje APK+AAB, tworzy GitHub Release |

### GitHub Secrets wymagane

| Secret | Opis | Wymagany |
|--------|------|----------|
| `EXPO_TOKEN` | Token z expo.dev | Dla EAS Build |

### Versioning

```bash
# Schematu: MAJOR.MINOR.PATCH
# v1.0.0 – Pierwsza publiczna wersja
# v1.1.0 – Nowe funkcje
# v1.0.1 – Poprawki błędów

# Aktualizuj wersję w app.json i package.json przed tagiem
npm version patch  # lub minor / major
git push && git push --tags
```

---

## Monitoring i analityka

### Rekomendowane narzędzia

| Narzędzie | Cel | Koszt |
|-----------|-----|-------|
| **Sentry** | Crash reporting | Darmowy (5K events/mies.) |
| **Supabase Dashboard** | Monitoring bazy danych | Wliczony |
| **Google Play Console** | Statystyki instalacji | Wliczony |
| **Vercel Analytics** | Statystyki webowe | Darmowy |

---

## Checklist przed premierą

- [x] Kod kompiluje się bez błędów (TypeScript)
- [x] CI/CD pipeline działa
- [x] Polityka prywatności napisana
- [x] Regulamin napisany
- [x] Metadata Google Play przygotowana
- [x] Konfiguracja Vercel dodana
- [x] Release workflow gotowy
- [x] Konfiguracja monetyzacji przygotowana
- [ ] Supabase projekt produkcyjny uruchomiony
- [ ] Konto Google Play Developer utworzone
- [ ] Klucze podpisu aplikacji wygenerowane
- [ ] Screenshoty i grafiki promocyjne przygotowane
- [ ] Beta testy z grupą użytkowników
- [ ] Wysłanie do Google Play Review
