// src/screens/HomeScreen.tsx
import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useCoupleStore } from '../store/useCoupleStore';
import { useNudges } from '../hooks/useNudges';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOWS } from '../lib/theme';
import { PET_MOOD } from '../types/database';
import dayjs from 'dayjs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Pet emoji based on mood and outfit
function getPetDisplay(happiness: number, outfitId: string): { emoji: string; mood: string; color: string } {
  const outfitEmojis: Record<string, string> = {
    default: '🐕',
    sailor: '⛵🐕',
    princess: '👑🐕',
    hoodie_pink: '🐕',
    hoodie_blue: '🐕',
    santa: '🎅🐕',
    bunny: '🐰🐕',
    tuxedo: '🤵🐕',
    crown: '👑🐕',
    superhero: '🦸🐕',
  };

  const emoji = outfitEmojis[outfitId] ?? '🐕';

  if (happiness >= PET_MOOD.ECSTATIC) return { emoji, mood: 'Ekstatyczny!', color: COLORS.petEcstatic };
  if (happiness >= PET_MOOD.HAPPY) return { emoji, mood: 'Szczęśliwy', color: COLORS.petHappy };
  if (happiness >= PET_MOOD.CONTENT) return { emoji, mood: 'Zadowolony', color: COLORS.petContent };
  if (happiness >= PET_MOOD.SAD) return { emoji, mood: 'Smutny', color: COLORS.petSad };
  return { emoji, mood: 'Nieszczęśliwy', color: COLORS.petMiserable };
}

interface HomeScreenProps {
  navigation: NativeStackNavigationProp<Record<string, undefined>>;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { user, couple, profile, partnerProfile } = useAuthStore();
  const {
    pet,
    wallet,
    streak,
    daysTogetherCount,
    feedPet,
    petThePet,
    loadCoupleData,
    calculateDaysTogether,
    updateStreak,
    subscribeToPetChanges,
  } = useCoupleStore();
  const { sendNudge, unreadNudges } = useNudges();

  const coupleId = couple?.id;
  const userId = user?.id;

  // Load couple data on mount
  useEffect(() => {
    if (coupleId) {
      loadCoupleData(coupleId);
      const unsub = subscribeToPetChanges(coupleId);
      return unsub;
    }
    return undefined;
  }, [coupleId, loadCoupleData, subscribeToPetChanges]);

  // Calculate days together
  useEffect(() => {
    if (couple?.anniversary_date) {
      calculateDaysTogether(couple.anniversary_date);
    }
  }, [couple?.anniversary_date, calculateDaysTogether]);

  // Update streak on app open
  useEffect(() => {
    if (coupleId) {
      updateStreak(coupleId);
    }
  }, [coupleId, updateStreak]);

  const petDisplay = useMemo(
    () => getPetDisplay(pet?.happiness ?? 50, pet?.outfit_id ?? 'default'),
    [pet?.happiness, pet?.outfit_id]
  );

  const canFeed = pet
    ? dayjs().diff(dayjs(pet.last_fed_at), 'minute') >= 30
    : false;

  const canPet = pet
    ? dayjs().diff(dayjs(pet.last_pet_at), 'minute') >= 5
    : false;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Couple Header Widget */}
      <View style={styles.coupleWidget}>
        <View style={styles.coupleAvatars}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>
              {profile?.avatar_url ? '📸' : '🙋'}
            </Text>
          </View>
          <View style={styles.heartBridge}>
            <Text style={styles.heartEmoji}>💕</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>
              {partnerProfile?.avatar_url ? '📸' : '🙋‍♀️'}
            </Text>
          </View>
        </View>

        <Text style={styles.coupleNames}>
          {profile?.display_name ?? 'Ty'} & {partnerProfile?.display_name ?? '...'}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{daysTogetherCount}</Text>
            <Text style={styles.statLabel}>dni razem</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{streak?.current_streak ?? 0}🔥</Text>
            <Text style={styles.statLabel}>seria</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{wallet?.balance ?? 0}💋</Text>
            <Text style={styles.statLabel}>buziaki</Text>
          </View>
        </View>
      </View>

      {/* Pet Section */}
      <View style={styles.petCard}>
        <View style={styles.petHeader}>
          <Text style={styles.petName}>{pet?.name ?? 'Puszek'}</Text>
          <View style={[styles.moodBadge, { backgroundColor: petDisplay.color }]}>
            <Text style={styles.moodText}>{petDisplay.mood}</Text>
          </View>
        </View>

        <View style={styles.petBody}>
          <Text style={styles.petEmoji}>{petDisplay.emoji}</Text>

          <View style={styles.petBars}>
            <View style={styles.barRow}>
              <Text style={styles.barLabel}>Szczęście</Text>
              <View style={styles.barBg}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${pet?.happiness ?? 50}%`,
                      backgroundColor: petDisplay.color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barValue}>{pet?.happiness ?? 50}%</Text>
            </View>
            <View style={styles.barRow}>
              <Text style={styles.barLabel}>Głód</Text>
              <View style={styles.barBg}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${pet?.hunger ?? 50}%`,
                      backgroundColor: (pet?.hunger ?? 50) > 70 ? COLORS.error : COLORS.warning,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barValue}>{pet?.hunger ?? 50}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.petActions}>
          <TouchableOpacity
            style={[styles.petButton, !canFeed && styles.petButtonDisabled]}
            onPress={() => coupleId && userId && feedPet(coupleId, userId)}
            disabled={!canFeed}
          >
            <Text style={styles.petButtonEmoji}>🍖</Text>
            <Text style={styles.petButtonText}>Nakarm</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.petButton, !canPet && styles.petButtonDisabled]}
            onPress={() => coupleId && userId && petThePet(coupleId, userId)}
            disabled={!canPet}
          >
            <Text style={styles.petButtonEmoji}>🤗</Text>
            <Text style={styles.petButtonText}>Pogłaszcz</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.petButton}
            onPress={() => navigation.navigate('PetShop' as never)}
          >
            <Text style={styles.petButtonEmoji}>👗</Text>
            <Text style={styles.petButtonText}>Ubranko</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Szybkie akcje</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => sendNudge('kiss')}
          activeOpacity={0.7}
        >
          <Text style={styles.actionEmoji}>💋</Text>
          <Text style={styles.actionText}>Wyślij buziaka</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => sendNudge('heartbeat')}
          activeOpacity={0.7}
        >
          <Text style={styles.actionEmoji}>💓</Text>
          <Text style={styles.actionText}>Bicie serca</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => sendNudge('hug')}
          activeOpacity={0.7}
        >
          <Text style={styles.actionEmoji}>🤗</Text>
          <Text style={styles.actionText}>Przytulas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, unreadNudges.length > 0 && styles.actionCardHighlight]}
          onPress={() => navigation.navigate('Nudge' as never)}
          activeOpacity={0.7}
        >
          <Text style={styles.actionEmoji}>📳</Text>
          <Text style={styles.actionText}>
            Wibracje {unreadNudges.length > 0 ? `(${unreadNudges.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Anniversary countdown */}
      {couple?.anniversary_date && (
        <View style={styles.anniversaryCard}>
          <Text style={styles.anniversaryEmoji}>🎂</Text>
          <Text style={styles.anniversaryText}>
            Rocznica: {dayjs(couple.anniversary_date).format('D MMMM')}
          </Text>
          <Text style={styles.anniversaryDays}>
            {(() => {
              const next = dayjs(couple.anniversary_date).year(dayjs().year());
              const adjusted = next.isBefore(dayjs()) ? next.add(1, 'year') : next;
              const diff = adjusted.diff(dayjs(), 'day');
              return diff === 0 ? 'Dziś! 🎉' : `za ${diff} dni`;
            })()}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  // Couple Widget
  coupleWidget: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.md,
    marginBottom: SPACING.md,
  },
  coupleAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarEmoji: {
    fontSize: 28,
  },
  heartBridge: {
    marginHorizontal: SPACING.sm,
  },
  heartEmoji: {
    fontSize: 24,
  },
  coupleNames: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
  },
  // Pet Card
  petCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.md,
    marginBottom: SPACING.md,
  },
  petHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  petName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: COLORS.text,
  },
  moodBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  moodText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: COLORS.text,
  },
  petBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  petEmoji: {
    fontSize: 72,
    marginRight: SPACING.md,
  },
  petBars: {
    flex: 1,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  barLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    width: 65,
  },
  barBg: {
    flex: 1,
    height: 10,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 5,
    overflow: 'hidden',
    marginHorizontal: SPACING.xs,
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  barValue: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    color: COLORS.text,
    width: 32,
    textAlign: 'right',
  },
  petActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  petButton: {
    flex: 1,
    backgroundColor: COLORS.primaryFaded,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
  },
  petButtonDisabled: {
    opacity: 0.4,
  },
  petButtonEmoji: {
    fontSize: 24,
  },
  petButtonText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 2,
  },
  // Quick Actions
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  actionCard: {
    width: (SCREEN_WIDTH - SPACING.md * 2 - SPACING.sm) / 2 - 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  actionCardHighlight: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  actionEmoji: {
    fontSize: 32,
    marginBottom: SPACING.xs,
  },
  actionText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  // Anniversary
  anniversaryCard: {
    backgroundColor: COLORS.primaryFaded,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  anniversaryEmoji: {
    fontSize: 32,
    marginBottom: SPACING.xs,
  },
  anniversaryText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    fontWeight: '600',
  },
  anniversaryDays: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: SPACING.xs,
  },
});
