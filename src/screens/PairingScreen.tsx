// src/screens/PairingScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useAuthStore } from '../store/useAuthStore';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOWS } from '../lib/theme';

export default function PairingScreen() {
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [pairingCode, setPairingCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [anniversaryDate, setAnniversaryDate] = useState(
    new Date().toISOString().split('T')[0] ?? ''
  );
  const { createCouple, joinCouple, isLoading, error, clearError, signOut } = useAuthStore();

  const handleCreate = async () => {
    clearError();
    try {
      const code = await createCouple(anniversaryDate);
      setGeneratedCode(code);
    } catch {
      // Error handled in store
    }
  };

  const handleJoin = async () => {
    clearError();
    if (pairingCode.trim().length < 4) {
      Alert.alert('Błąd', 'Wpisz kod parowania od partnera/ki');
      return;
    }
    try {
      await joinCouple(pairingCode.trim());
    } catch {
      // Error handled in store
    }
  };

  const copyCode = async () => {
    if (generatedCode) {
      await Clipboard.setStringAsync(generatedCode);
      Alert.alert('Skopiowano!', 'Wyślij ten kod swojemu partnerowi/ce 💕');
    }
  };

  if (generatedCode) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.emoji}>🎉</Text>
          <Text style={styles.title}>Para utworzona!</Text>
          <Text style={styles.subtitle}>
            Wyślij ten kod swojej drugiej połówce:
          </Text>

          <TouchableOpacity onPress={copyCode} style={styles.codeBox}>
            <Text style={styles.codeText}>{generatedCode}</Text>
            <Text style={styles.copyHint}>Dotknij, żeby skopiować</Text>
          </TouchableOpacity>

          <Text style={styles.waitingText}>
            Czekam aż partner/ka dołączy... 💕
          </Text>
        </View>
      </View>
    );
  }

  if (mode === 'choose') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.emoji}>💑</Text>
          <Text style={styles.title}>Połączcie się!</Text>
          <Text style={styles.subtitle}>
            Jedna osoba tworzy parę, druga dołącza kodem
          </Text>
        </View>

        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => setMode('create')}
          activeOpacity={0.8}
        >
          <Text style={styles.optionEmoji}>✨</Text>
          <Text style={styles.optionTitle}>Stwórz nową parę</Text>
          <Text style={styles.optionDesc}>
            Dostaniesz kod do wysłania partnerowi/ce
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => setMode('join')}
          activeOpacity={0.8}
        >
          <Text style={styles.optionEmoji}>🔗</Text>
          <Text style={styles.optionTitle}>Dołącz do pary</Text>
          <Text style={styles.optionDesc}>
            Masz kod od partnera/ki? Wpisz go tutaj
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={signOut} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Wyloguj się</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => { setMode('choose'); clearError(); }}
        style={styles.backButton}
      >
        <Text style={styles.backText}>← Wróć</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        {mode === 'create' ? (
          <>
            <Text style={styles.emoji}>💍</Text>
            <Text style={styles.title}>Nowa para</Text>
            <Text style={styles.label}>Kiedy zaczęliście być razem?</Text>
            <TextInput
              style={styles.input}
              placeholder="RRRR-MM-DD"
              placeholderTextColor={COLORS.textLight}
              value={anniversaryDate}
              onChangeText={setAnniversaryDate}
              keyboardType="default"
            />
          </>
        ) : (
          <>
            <Text style={styles.emoji}>🔗</Text>
            <Text style={styles.title}>Dołącz do pary</Text>
            <Text style={styles.label}>Kod parowania</Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              placeholder="np. a1b2c3d4"
              placeholderTextColor={COLORS.textLight}
              value={pairingCode}
              onChangeText={setPairingCode}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </>
        )}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={mode === 'create' ? handleCreate : handleJoin}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.textOnPrimary} />
          ) : (
            <Text style={styles.buttonText}>
              {mode === 'create' ? 'Utwórz parę ✨' : 'Dołącz 💕'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  emoji: {
    fontSize: 56,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.md,
    marginBottom: SPACING.md,
  },
  optionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
    borderWidth: 2,
    borderColor: COLORS.primaryFaded,
  },
  optionEmoji: {
    fontSize: 32,
    marginBottom: SPACING.xs,
  },
  optionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  optionDesc: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  codeInput: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 4,
  },
  codeBox: {
    backgroundColor: COLORS.primaryFaded,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginVertical: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  codeText: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 6,
  },
  copyHint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  waitingText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 83, 80, 0.1)',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginTop: SPACING.md,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.lg,
    ...SHADOWS.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.textOnPrimary,
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
  backButton: {
    marginBottom: SPACING.md,
  },
  backText: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  logoutButton: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  logoutText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
  },
});
