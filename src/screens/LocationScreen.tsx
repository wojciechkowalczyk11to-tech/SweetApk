// src/screens/LocationScreen.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useLocationRealtime } from '../hooks/useLocationRealtime';
import { useAuthStore } from '../store/useAuthStore';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOWS } from '../lib/theme';
import dayjs from 'dayjs';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function LocationScreen() {
  const { myLocation, partnerLocation, isSharing, permissionGranted, toggleSharing, refreshLocation, distanceKm } =
    useLocationRealtime();
  const { profile, partnerProfile } = useAuthStore();

  if (!permissionGranted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permEmoji}>📍</Text>
        <Text style={styles.permTitle}>Lokalizacja wyłączona</Text>
        <Text style={styles.permText}>
          Włącz uprawnienie lokalizacji w ustawieniach telefonu, żeby widzieć się nawzajem na mapie.
        </Text>
      </View>
    );
  }

  const initialRegion = myLocation
    ? {
        latitude: myLocation.latitude,
        longitude: myLocation.longitude,
        latitudeDelta: distanceKm && distanceKm > 10 ? distanceKm / 50 : 0.05,
        longitudeDelta: distanceKm && distanceKm > 10 ? distanceKm / 50 : 0.05,
      }
    : {
        latitude: 52.2297,
        longitude: 21.0122,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        {myLocation && (
          <Marker
            coordinate={{
              latitude: myLocation.latitude,
              longitude: myLocation.longitude,
            }}
            title={profile?.display_name ?? 'Ty'}
            description={`Ostatnia aktualizacja: ${dayjs(myLocation.updated_at).format('HH:mm')}`}
          >
            <View style={styles.markerContainer}>
              <Text style={styles.markerEmoji}>💙</Text>
            </View>
          </Marker>
        )}

        {partnerLocation && partnerLocation.is_sharing && (
          <Marker
            coordinate={{
              latitude: partnerLocation.latitude,
              longitude: partnerLocation.longitude,
            }}
            title={partnerProfile?.display_name ?? 'Partner/ka'}
            description={`Ostatnia aktualizacja: ${dayjs(partnerLocation.updated_at).format('HH:mm')}`}
          >
            <View style={styles.markerContainer}>
              <Text style={styles.markerEmoji}>💖</Text>
            </View>
          </Marker>
        )}
      </MapView>

      {/* Info overlay */}
      <View style={styles.infoOverlay}>
        {distanceKm !== null && (
          <View style={styles.distanceCard}>
            <Text style={styles.distanceValue}>
              {distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm}km`}
            </Text>
            <Text style={styles.distanceLabel}>między Wami</Text>
          </View>
        )}

        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, !isSharing && styles.controlButtonOff]}
            onPress={toggleSharing}
          >
            <Text style={styles.controlText}>
              {isSharing ? '📡 Udostępniam' : '🔒 Ukryta'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton} onPress={refreshLocation}>
            <Text style={styles.controlText}>🔄 Odśwież</Text>
          </TouchableOpacity>
        </View>

        {partnerLocation && !partnerLocation.is_sharing && (
          <View style={styles.partnerHiddenBadge}>
            <Text style={styles.partnerHiddenText}>
              {partnerProfile?.display_name ?? 'Partner/ka'} ukrywa lokalizację
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.background,
  },
  permEmoji: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  permTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  permText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerEmoji: {
    fontSize: 32,
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 100,
    left: SPACING.md,
    right: SPACING.md,
  },
  distanceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.sm,
    ...SHADOWS.lg,
  },
  distanceValue: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '900',
    color: COLORS.primary,
  },
  distanceLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  controls: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  controlButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  controlButtonOff: {
    backgroundColor: COLORS.surfaceElevated,
    opacity: 0.8,
  },
  controlText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  partnerHiddenBadge: {
    backgroundColor: 'rgba(255, 167, 38, 0.2)',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
    alignItems: 'center',
  },
  partnerHiddenText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.warning,
    fontWeight: '600',
  },
});
