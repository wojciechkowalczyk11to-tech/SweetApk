// src/screens/PetShopScreen.tsx
import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useCoupleStore } from '../store/useCoupleStore';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOWS } from '../lib/theme';
import type { PetOutfit } from '../types/database';

const OUTFIT_EMOJIS: Record<string, string> = {
  outfit_default: '🐕',
  outfit_sailor: '⛵',
  outfit_princess: '👸',
  outfit_hoodie_pink: '🩷',
  outfit_hoodie_blue: '💙',
  outfit_santa: '🎅',
  outfit_bunny: '🐰',
  outfit_tuxedo: '🤵',
  outfit_crown: '👑',
  outfit_superhero: '🦸',
};

const RARITY_LABELS: Record<string, string> = {
  common: '⚪ Zwykły',
  rare: '🟣 Rzadki',
  legendary: '🟡 Legendarny',
};

export default function PetShopScreen() {
  const { user, couple } = useAuthStore();
  const { pet, wallet, outfitsShop, ownedOutfits, purchaseOutfit, changePetOutfit } =
    useCoupleStore();

  const coupleId = couple?.id;
  const userId = user?.id;

  const isOwned = useCallback(
    (outfitId: string) => ownedOutfits.some((o) => o.outfit_id === outfitId),
    [ownedOutfits]
  );

  const isEquipped = useCallback(
    (outfitId: string) => pet?.outfit_id === outfitId,
    [pet?.outfit_id]
  );

  const handlePress = useCallback(
    async (outfit: PetOutfit) => {
      if (!coupleId || !userId) return;

      if (isEquipped(outfit.id)) return;

      if (isOwned(outfit.id)) {
        await changePetOutfit(coupleId, outfit.id);
        return;
      }

      if ((wallet?.balance ?? 0) < outfit.price) {
        Alert.alert(
          'Za mało buziaków! 💋',
          `Potrzebujesz ${outfit.price} buziaków. Masz: ${wallet?.balance ?? 0}.\nWysyłaj buziaki, dodawaj zdjęcia i karm pieska, żeby zarobić więcej!`
        );
        return;
      }

      Alert.alert(
        `Kup "${outfit.name}"?`,
        `Cena: ${outfit.price} 💋\nPo zakupie: ${(wallet?.balance ?? 0) - outfit.price} 💋`,
        [
          { text: 'Anuluj', style: 'cancel' },
          {
            text: 'Kup! 🛍',
            onPress: async () => {
              const success = await purchaseOutfit(coupleId, userId, outfit.id);
              if (success) {
                Alert.alert('Kupione! 🎉', `${pet?.name ?? 'Puszek'} wygląda teraz świetnie!`);
                await changePetOutfit(coupleId, outfit.id);
              }
            },
          },
        ]
      );
    },
    [coupleId, userId, wallet, pet, isOwned, isEquipped, purchaseOutfit, changePetOutfit]
  );

  const renderOutfit = useCallback(
    ({ item }: { item: PetOutfit }) => {
      const owned = isOwned(item.id);
      const equipped = isEquipped(item.id);

      return (
        <TouchableOpacity
          style={[
            styles.outfitCard,
            owned && styles.outfitOwned,
            equipped && styles.outfitEquipped,
          ]}
          onPress={() => handlePress(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.outfitEmoji}>
            {OUTFIT_EMOJIS[item.image_key] ?? '👕'}
          </Text>
          <Text style={styles.outfitName}>{item.name}</Text>
          <Text style={styles.outfitRarity}>
            {RARITY_LABELS[item.rarity] ?? item.rarity}
          </Text>

          {equipped ? (
            <View style={styles.equippedBadge}>
              <Text style={styles.equippedText}>✅ Założone</Text>
            </View>
          ) : owned ? (
            <View style={styles.ownedBadge}>
              <Text style={styles.ownedText}>Posiadane</Text>
            </View>
          ) : (
            <View style={styles.priceBadge}>
              <Text style={styles.priceText}>{item.price} 💋</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [isOwned, isEquipped, handlePress]
  );

  return (
    <View style={styles.container}>
      {/* Wallet header */}
      <View style={styles.walletBar}>
        <Text style={styles.walletLabel}>Portfel buziaków:</Text>
        <Text style={styles.walletBalance}>{wallet?.balance ?? 0} 💋</Text>
      </View>

      {/* Current pet preview */}
      <View style={styles.petPreview}>
        <Text style={styles.petEmoji}>
          {OUTFIT_EMOJIS[`outfit_${pet?.outfit_id ?? 'default'}`] ?? '🐕'} 🐕
        </Text>
        <Text style={styles.petLabel}>
          {pet?.name ?? 'Puszek'} nosi: {outfitsShop.find((o) => o.id === pet?.outfit_id)?.name ?? 'Naturalny'}
        </Text>
      </View>

      {/* Outfits grid */}
      <FlatList
        data={outfitsShop}
        renderItem={renderOutfit}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  walletBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  walletLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  walletBalance: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '900',
    color: COLORS.text,
  },
  petPreview: {
    alignItems: 'center',
    padding: SPACING.md,
  },
  petEmoji: {
    fontSize: 48,
  },
  petLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  grid: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  gridRow: {
    gap: SPACING.sm,
  },
  outfitCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
    borderWidth: 2,
    borderColor: COLORS.transparent,
  },
  outfitOwned: {
    borderColor: COLORS.success,
    backgroundColor: 'rgba(102, 187, 106, 0.05)',
  },
  outfitEquipped: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryFaded,
  },
  outfitEmoji: {
    fontSize: 40,
    marginBottom: SPACING.xs,
  },
  outfitName: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  outfitRarity: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  priceBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    marginTop: SPACING.sm,
  },
  priceText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '800',
    color: COLORS.text,
  },
  ownedBadge: {
    backgroundColor: 'rgba(102, 187, 106, 0.2)',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    marginTop: SPACING.sm,
  },
  ownedText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    color: COLORS.success,
  },
  equippedBadge: {
    backgroundColor: COLORS.primaryFaded,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    marginTop: SPACING.sm,
  },
  equippedText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
