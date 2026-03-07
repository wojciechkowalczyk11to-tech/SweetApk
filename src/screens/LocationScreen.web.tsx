// src/screens/LocationScreen.web.tsx
// Web fallback – react-native-maps is not available on web
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZE } from '../lib/theme';

export default function LocationScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>📍</Text>
      <Text style={styles.title}>Udostępnianie lokalizacji</Text>
      <Text style={styles.subtitle}>
        Funkcja map jest dostępna wyłącznie w aplikacji mobilnej.
      </Text>
      <Text style={styles.hint}>
        Pobierz SweetSync na Android, aby korzystać z map w czasie rzeczywistym.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emoji: {
    fontSize: 64,
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  hint: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textLight,
    textAlign: 'center',
  },
});
