// src/screens/MomentsScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Dimensions,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useMoments } from '../hooks/useMoments';
import { useAuthStore } from '../store/useAuthStore';
import { COLORS, SPACING, RADIUS, FONT_SIZE, SHADOWS } from '../lib/theme';
import dayjs from 'dayjs';
import type { Moment } from '../types/database';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 2;
const COLUMNS = 3;
const TILE_SIZE = (SCREEN_WIDTH - GRID_GAP * (COLUMNS + 1)) / COLUMNS;

export default function MomentsScreen() {
  const {
    moments,
    isLoading,
    isUploading,
    uploadProgress,
    pickAndUpload,
    takePhotoAndUpload,
    deleteMoment,
    loadMore,
    refresh,
  } = useMoments();
  const { user } = useAuthStore();
  const [selectedMoment, setSelectedMoment] = useState<Moment | null>(null);

  const handleDelete = useCallback(
    (momentId: string) => {
      Alert.alert(
        'Usuń moment',
        'Na pewno chcesz usunąć to wspomnienie?',
        [
          { text: 'Anuluj', style: 'cancel' },
          {
            text: 'Usuń',
            style: 'destructive',
            onPress: () => {
              deleteMoment(momentId);
              setSelectedMoment(null);
            },
          },
        ]
      );
    },
    [deleteMoment]
  );

  const renderTile = useCallback(
    ({ item }: { item: Moment }) => (
      <TouchableOpacity
        style={styles.tile}
        onPress={() => setSelectedMoment(item)}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: item.thumbnail_url ?? item.media_url }}
          style={styles.tileImage}
          resizeMode="cover"
        />
        {item.media_type === 'video' && (
          <View style={styles.videoBadge}>
            <Text style={styles.videoBadgeText}>▶</Text>
          </View>
        )}
        {item.media_type === 'gif' && (
          <View style={styles.gifBadge}>
            <Text style={styles.gifBadgeText}>GIF</Text>
          </View>
        )}
      </TouchableOpacity>
    ),
    []
  );

  return (
    <View style={styles.container}>
      {/* Upload bar */}
      <View style={styles.uploadBar}>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={pickAndUpload}
          disabled={isUploading}
        >
          <Text style={styles.uploadButtonText}>📷 Galeria</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={takePhotoAndUpload}
          disabled={isUploading}
        >
          <Text style={styles.uploadButtonText}>📸 Zdjęcie</Text>
        </TouchableOpacity>
      </View>

      {isUploading && (
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${uploadProgress * 100}%` }]} />
          <Text style={styles.progressText}>
            Wysyłanie... {Math.round(uploadProgress * 100)}%
          </Text>
        </View>
      )}

      {/* Grid */}
      <FlatList
        data={moments}
        renderItem={renderTile}
        keyExtractor={(item) => item.id}
        numColumns={COLUMNS}
        contentContainerStyle={styles.grid}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        onRefresh={refresh}
        refreshing={isLoading}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📸</Text>
            <Text style={styles.emptyTitle}>Brak wspomnień</Text>
            <Text style={styles.emptyText}>
              Zróbcie pierwsze wspólne zdjęcie!
            </Text>
          </View>
        }
      />

      {/* Full-screen modal */}
      <Modal visible={!!selectedMoment} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setSelectedMoment(null)}
          >
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>

          {selectedMoment && (
            <View style={styles.modalContent}>
              <Image
                source={{ uri: selectedMoment.media_url }}
                style={styles.modalImage}
                resizeMode="contain"
              />
              <View style={styles.modalInfo}>
                <Text style={styles.modalDate}>
                  {dayjs(selectedMoment.created_at).format('D MMMM YYYY, HH:mm')}
                </Text>
                {selectedMoment.caption ? (
                  <Text style={styles.modalCaption}>{selectedMoment.caption}</Text>
                ) : null}
                {selectedMoment.author_id === user?.id && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(selectedMoment.id)}
                  >
                    <Text style={styles.deleteButtonText}>🗑 Usuń</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  uploadBar: {
    flexDirection: 'row',
    padding: SPACING.sm,
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    ...SHADOWS.sm,
  },
  uploadButton: {
    flex: 1,
    backgroundColor: COLORS.primaryFaded,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    alignItems: 'center',
  },
  uploadButtonText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  progressBar: {
    height: 24,
    backgroundColor: COLORS.surfaceElevated,
    marginHorizontal: SPACING.sm,
    marginTop: SPACING.xs,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
  },
  progressText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: '600',
  },
  grid: {
    padding: GRID_GAP,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    margin: GRID_GAP / 2,
  },
  tileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 2,
    backgroundColor: COLORS.surfaceElevated,
  },
  videoBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.overlay,
    borderRadius: RADIUS.sm,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBadgeText: {
    color: COLORS.textOnPrimary,
    fontSize: 12,
  },
  gifBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  gifBadgeText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptyText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  modalContent: {
    flex: 1,
    justifyContent: 'center',
  },
  modalImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.2,
  },
  modalInfo: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  modalDate: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FONT_SIZE.sm,
  },
  modalCaption: {
    color: '#fff',
    fontSize: FONT_SIZE.md,
    marginTop: SPACING.sm,
  },
  deleteButton: {
    marginTop: SPACING.md,
    backgroundColor: 'rgba(239,83,80,0.3)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  deleteButtonText: {
    color: COLORS.error,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
});
