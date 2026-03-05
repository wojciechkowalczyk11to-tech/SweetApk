// src/lib/monetization.ts
// Konfiguracja monetyzacji SweetSync
// Przygotowana do integracji z expo-in-app-purchases / react-native-iap

/**
 * Identyfikatory produktów In-App Purchase
 * Używane w Google Play Console → Monetization → Products
 */
export const IAP_PRODUCTS = {
  // Jednorazowe paczki buziaków
  KISS_PACK_SMALL: 'com.sweetsync.kisses.small',
  KISS_PACK_MEDIUM: 'com.sweetsync.kisses.medium',
  KISS_PACK_LARGE: 'com.sweetsync.kisses.large',

  // Ekskluzywne stroje premium (jednorazowy zakup)
  PREMIUM_OUTFIT_UNICORN: 'com.sweetsync.outfit.unicorn',
  PREMIUM_OUTFIT_DRAGON: 'com.sweetsync.outfit.dragon',

  // Subskrypcja
  PREMIUM_MONTHLY: 'com.sweetsync.premium.monthly',
} as const;

export type IAPProductId = (typeof IAP_PRODUCTS)[keyof typeof IAP_PRODUCTS];

/**
 * Katalog produktów z cenami (do synchronizacji z Google Play Console)
 */
export const PRODUCT_CATALOG = [
  {
    id: IAP_PRODUCTS.KISS_PACK_SMALL,
    name: 'Mała paczka buziaków',
    description: '50 buziaków 💋',
    kissAmount: 50,
    type: 'consumable' as const,
    priceUSD: 0.99,
  },
  {
    id: IAP_PRODUCTS.KISS_PACK_MEDIUM,
    name: 'Średnia paczka buziaków',
    description: '150 buziaków 💋💋',
    kissAmount: 150,
    type: 'consumable' as const,
    priceUSD: 2.49,
  },
  {
    id: IAP_PRODUCTS.KISS_PACK_LARGE,
    name: 'Duża paczka buziaków',
    description: '500 buziaków 💋💋💋',
    kissAmount: 500,
    type: 'consumable' as const,
    priceUSD: 4.99,
  },
  {
    id: IAP_PRODUCTS.PREMIUM_OUTFIT_UNICORN,
    name: 'Strój Jednorożca',
    description: 'Legendarny strój dla pieska 🦄',
    kissAmount: 0,
    type: 'non-consumable' as const,
    priceUSD: 1.99,
  },
  {
    id: IAP_PRODUCTS.PREMIUM_OUTFIT_DRAGON,
    name: 'Strój Smoka',
    description: 'Legendarny strój dla pieska 🐉',
    kissAmount: 0,
    type: 'non-consumable' as const,
    priceUSD: 1.99,
  },
  {
    id: IAP_PRODUCTS.PREMIUM_MONTHLY,
    name: 'SweetSync Premium',
    description: 'Wszystkie premium stroje + 100 buziaków/mies. + brak reklam',
    kissAmount: 100,
    type: 'subscription' as const,
    priceUSD: 1.99,
  },
] as const;

/**
 * Konfiguracja reklam (opcjonalna – do integracji z Google AdMob)
 * Reklamy wyświetlane TYLKO w darmowej wersji
 */
export const AD_CONFIG = {
  // Identyfikatory jednostek reklamowych – każda placement wymaga UNIKALNEGO ID z AdMob Console
  // Zastąp poniższe placeholder'y właściwymi ID przed release'em
  BANNER_HOME: 'ca-app-pub-XXXXXXXXXXXXXXXX/BANNER_ID',
  INTERSTITIAL_MOMENTS: 'ca-app-pub-XXXXXXXXXXXXXXXX/INTERSTITIAL_ID',
  REWARDED_KISSES: 'ca-app-pub-XXXXXXXXXXXXXXXX/REWARDED_ID',

  // Testowe ID (używać podczas developmentu)
  TEST_BANNER: 'ca-app-pub-3940256099942544/6300978111',
  TEST_INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712',
  TEST_REWARDED: 'ca-app-pub-3940256099942544/5224354917',

  // Konfiguracja wyświetlania reklam
  settings: {
    showBannerOnHome: false, // Banner na ekranie głównym
    showInterstitialAfterMoments: false, // Interstitial po przesłaniu zdjęcia
    showRewardedForKisses: true, // Rewarded video za buziaki (opt-in)
    rewardedKissAmount: 5, // Buziaki za obejrzenie reklamy
    interstitialFrequencyMinutes: 15, // Min. czas między interstitialami
  },
} as const;

/**
 * Sprawdza czy użytkownik ma subskrypcję Premium
 * (Placeholder - do implementacji po integracji z IAP)
 */
export function isPremiumUser(): boolean {
  // TODO: Sprawdź status subskrypcji z react-native-iap
  return false;
}

/**
 * Sprawdza czy reklamy powinny być wyświetlane
 */
export function shouldShowAds(): boolean {
  return !isPremiumUser() && AD_CONFIG.settings.showBannerOnHome;
}
