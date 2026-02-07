// src/screens/ProfileScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useAuthStore } from '../store/useAuthStore';
import { useCoupleStore } from '../store/useCoupleStore';
import { supabase } from '../lib/supabase';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOWS } from '../lib/theme';

export default function ProfileScreen() {
  const { user, profile, couple, partnerProfile, signOut } = useAuthStore();
  const { pet, wallet, streak, changePetName, daysTogetherCount } = useCoupleStore();
  const [editingName, setEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState(profile?.display_name ?? '');
  const [editingPetName, setEditingPetName] = useState(false);
  const [newPetName, setNewPetName] = useState(pet?.name ?? '');

  const handleUpdateDisplayName = async () => {
    if (!newDisplayName.trim() || !user?.id) return;

    const { error } = await supabase
      .from('profiles')
      .update({ display_name: newDisplayName.trim(), updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (!error) {
      setEditingName(false);
    }
  };

  const handleUpdatePetName = async () => {
    if (!newPetName.trim() || !couple?.id) return;
    await changePetName(couple.id, newPetName.trim());
    setEditingPetName(false);
  };

  const copyPairingCode = async () => {
    if (couple?.pairing_code) {
      await Clipboard.setStringAsync(couple.pairing_code);
      Alert.alert('Skopiowano!', 'Kod parowania skopiowany do schowka.');
    }
  };

  const handleSignOut = () => {
    Alert.alert('Wylogować?', 'Na pewno chcesz się wylogować?', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Wyloguj', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile card */}
      <View style={styles.card}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarEmoji}>🙋</Text>
        </View>

        {editingName ? (
          <View style={styles.editRow}>
            <TextInput
              style={styles.editInput}
              value={newDisplayName}
              onChangeText={setNewDisplayName}
              autoFocus
              maxLength={20}
            />
            <TouchableOpacity style={styles.saveButton} onPress={handleUpdateDisplayName}>
              <Text style={styles.saveButtonText}>✓</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setEditingName(true)}>
            <Text style={styles.displayName}>{profile?.display_name ?? 'Ty'}</Text>
            <Text style={styles.editHint}>Dotknij, żeby zmienić imię</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {/* Couple info */}
      {couple && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Para 💕</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Partner/ka</Text>
            <Text style={styles.infoValue}>
              {partnerProfile?.display_name ?? 'Czeka na dołączenie...'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Razem od</Text>
            <Text style={styles.infoValue}>{couple.anniversary_date}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Dni razem</Text>
            <Text style={styles.infoValue}>{daysTogetherCount} 💕</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Kod parowania</Text>
            <TouchableOpacity onPress={copyPairingCode}>
              <Text style={[styles.infoValue, styles.codeValue]}>
                {couple.pairing_code} 📋
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Pet info */}
      {pet && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Piesek 🐕</Text>

          {editingPetName ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.editInput}
                value={newPetName}
                onChangeText={setNewPetName}
                autoFocus
                maxLength={20}
              />
              <TouchableOpacity style={styles.saveButton} onPress={handleUpdatePetName}>
                <Text style={styles.saveButtonText}>✓</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => {
                setNewPetName(pet.name);
                setEditingPetName(true);
              }}
            >
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Imię</Text>
                <Text style={styles.infoValue}>{pet.name} ✏️</Text>
              </View>
            </TouchableOpacity>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Szczęście</Text>
            <Text style={styles.infoValue}>{pet.happiness}%</Text>
          </View>
        </View>
      )}

      {/* Stats */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Statystyki 📊</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Buziaki (portfel)</Text>
          <Text style={styles.infoValue}>{wallet?.balance ?? 0} 💋</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Buziaki (łącznie)</Text>
          <Text style={styles.infoValue}>{wallet?.total_earned ?? 0} 💋</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Aktualna seria</Text>
          <Text style={styles.infoValue}>{streak?.current_streak ?? 0} 🔥</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Najdłuższa seria</Text>
          <Text style={styles.infoValue}>{streak?.longest_streak ?? 0} 🏆</Text>
        </View>
      </View>

      {/* Actions */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
        <Text style={styles.logoutText}>Wyloguj się</Text>
      </TouchableOpacity>

      <Text style={styles.version}>SweetSync v1.0.0 • Zrobione z 💕</Text>
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
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.sm,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  avatarEmoji: {
    fontSize: 40,
  },
  displayName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  editHint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 2,
  },
  email: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  cardTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  codeValue: {
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  editInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: COLORS.textOnPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 83, 80, 0.1)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  logoutText: {
    color: COLORS.error,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  version: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
});
