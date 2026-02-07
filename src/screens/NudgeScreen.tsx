// src/screens/NudgeScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Vibration,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useNudges } from '../hooks/useNudges';
import { useAuthStore } from '../store/useAuthStore';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOWS } from '../lib/theme';
import dayjs from 'dayjs';
import type { Nudge } from '../types/database';

export default function NudgeScreen() {
  const {
    unreadNudges,
    recentNudges,
    sendNudge,
    sendCustomNudge,
    markAsRead,
    markAllAsRead,
    availablePatterns,
  } = useNudges();
  const { user, partnerProfile } = useAuthStore();

  // Custom pattern builder
  const [customPattern, setCustomPattern] = useState<number[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordStart, setRecordStart] = useState<number>(0);

  const handleTapStart = useCallback(() => {
    if (!isRecording) {
      setIsRecording(true);
      setCustomPattern([]);
      setRecordStart(Date.now());
      return;
    }

    const elapsed = Date.now() - recordStart;
    setCustomPattern((prev) => {
      if (prev.length === 0) {
        return [100]; // First tap = 100ms vibration
      }
      // Alternate: pause since last, then 100ms vibration
      const lastEnd = prev.reduce((sum, v) => sum + v, 0);
      const pause = Math.max(50, elapsed - lastEnd);
      return [...prev, pause, 100];
    });
    setRecordStart(Date.now());

    // Feedback
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Vibration.vibrate(100);
    }
  }, [isRecording, recordStart]);

  const handleStopRecording = useCallback(() => {
    setIsRecording(false);
  }, []);

  const handleSendCustom = useCallback(async () => {
    if (customPattern.length === 0) return;
    await sendCustomNudge(customPattern, 'Własny wzór', '✨');
    setCustomPattern([]);
    setIsRecording(false);
  }, [customPattern, sendCustomNudge]);

  const previewPattern = useCallback((pattern: number[]) => {
    if (Platform.OS === 'android') {
      Vibration.vibrate([0, ...pattern]);
    }
  }, []);

  const patternKeys = Object.keys(availablePatterns).filter((k) => k !== 'custom');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Unread nudges */}
      {unreadNudges.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Nowe zaczepki ({unreadNudges.length})
            </Text>
            <TouchableOpacity onPress={markAllAsRead}>
              <Text style={styles.markAllRead}>Oznacz wszystkie</Text>
            </TouchableOpacity>
          </View>
          {unreadNudges.map((nudge) => (
            <TouchableOpacity
              key={nudge.id}
              style={styles.nudgeCard}
              onPress={() => {
                previewPattern(nudge.pattern);
                markAsRead(nudge.id);
              }}
            >
              <Text style={styles.nudgeEmoji}>{nudge.emoji}</Text>
              <View style={styles.nudgeInfo}>
                <Text style={styles.nudgeName}>{nudge.pattern_name}</Text>
                <Text style={styles.nudgeTime}>
                  {dayjs(nudge.created_at).format('HH:mm')}
                </Text>
              </View>
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NOWE</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Send preset nudges */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Wyślij zaczepkę do {partnerProfile?.display_name ?? 'partnera/ki'} 💕
        </Text>
        <View style={styles.presetsGrid}>
          {patternKeys.map((key) => {
            const preset = availablePatterns[key];
            if (!preset) return null;
            return (
              <TouchableOpacity
                key={key}
                style={styles.presetCard}
                onPress={() => sendNudge(key)}
                onLongPress={() => previewPattern(preset.pattern)}
                activeOpacity={0.7}
              >
                <Text style={styles.presetEmoji}>{preset.emoji}</Text>
                <Text style={styles.presetName}>{preset.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Custom pattern builder */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Zaprojektuj własny wzór ✨</Text>
        <Text style={styles.sectionSubtitle}>
          Stukaj w przycisk, żeby nagrać rytm wibracji
        </Text>

        <View style={styles.recorderArea}>
          <TouchableOpacity
            style={[styles.tapButton, isRecording && styles.tapButtonActive]}
            onPress={handleTapStart}
            activeOpacity={0.5}
          >
            <Text style={styles.tapButtonEmoji}>
              {isRecording ? '🔴' : '⏺'}
            </Text>
            <Text style={styles.tapButtonText}>
              {isRecording
                ? `Stukaj! (${customPattern.length} elementów)`
                : 'Zacznij nagrywanie'}
            </Text>
          </TouchableOpacity>

          {isRecording && (
            <TouchableOpacity style={styles.stopButton} onPress={handleStopRecording}>
              <Text style={styles.stopButtonText}>⏹ Stop</Text>
            </TouchableOpacity>
          )}

          {customPattern.length > 0 && !isRecording && (
            <View style={styles.customActions}>
              <TouchableOpacity
                style={styles.previewButton}
                onPress={() => previewPattern(customPattern)}
              >
                <Text style={styles.previewButtonText}>▶ Podgląd</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sendCustomButton}
                onPress={handleSendCustom}
              >
                <Text style={styles.sendCustomButtonText}>📤 Wyślij</Text>
              </TouchableOpacity>
            </View>
          )}

          {customPattern.length > 0 && (
            <View style={styles.patternViz}>
              {customPattern.map((val, i) => (
                <View
                  key={`${i}-${val}`}
                  style={[
                    styles.patternBar,
                    {
                      width: Math.max(4, Math.min(val / 5, 60)),
                      backgroundColor: i % 2 === 0 ? COLORS.primary : COLORS.border,
                    },
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Recent history */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Historia zaczepek</Text>
        {recentNudges.length === 0 ? (
          <Text style={styles.emptyText}>Jeszcze żadnych zaczepek!</Text>
        ) : (
          recentNudges.slice(0, 20).map((nudge) => (
            <View key={nudge.id} style={styles.historyItem}>
              <Text style={styles.historyEmoji}>{nudge.emoji}</Text>
              <View style={styles.historyInfo}>
                <Text style={styles.historyName}>
                  {nudge.sender_id === user?.id ? 'Ty' : partnerProfile?.display_name ?? 'Partner/ka'}
                  {' → '}
                  {nudge.pattern_name}
                </Text>
                <Text style={styles.historyTime}>
                  {dayjs(nudge.created_at).format('D MMM, HH:mm')}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
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
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  sectionSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  markAllRead: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  // Nudge cards
  nudgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryFaded,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  nudgeEmoji: {
    fontSize: 32,
    marginRight: SPACING.sm,
  },
  nudgeInfo: {
    flex: 1,
  },
  nudgeName: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  nudgeTime: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
  },
  newBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  newBadgeText: {
    color: COLORS.textOnPrimary,
    fontSize: FONT_SIZE.xs,
    fontWeight: '800',
  },
  // Presets grid
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  presetCard: {
    width: '30%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  presetEmoji: {
    fontSize: 32,
    marginBottom: SPACING.xs,
  },
  presetName: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  // Recorder
  recorderArea: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  tapButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.border,
  },
  tapButtonActive: {
    borderColor: COLORS.error,
    backgroundColor: 'rgba(239, 83, 80, 0.1)',
  },
  tapButtonEmoji: {
    fontSize: 36,
  },
  tapButtonText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  stopButton: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  stopButtonText: {
    color: COLORS.textOnPrimary,
    fontWeight: '700',
  },
  customActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  previewButton: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  previewButtonText: {
    color: COLORS.text,
    fontWeight: '600',
  },
  sendCustomButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  sendCustomButtonText: {
    color: COLORS.textOnPrimary,
    fontWeight: '700',
  },
  patternViz: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    marginTop: SPACING.md,
    height: 20,
  },
  patternBar: {
    height: '100%',
    borderRadius: 2,
  },
  // History
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  historyEmoji: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  historyInfo: {
    flex: 1,
  },
  historyName: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text,
  },
  historyTime: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textLight,
  },
  emptyText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textLight,
    textAlign: 'center',
    padding: SPACING.lg,
  },
});
