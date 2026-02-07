// src/hooks/useMoments.ts
import { useEffect, useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useCoupleStore } from '../store/useCoupleStore';
import type { Moment } from '../types/database';

interface UseMomentsResult {
  moments: Moment[];
  isLoading: boolean;
  isUploading: boolean;
  uploadProgress: number;
  pickAndUpload: () => Promise<void>;
  takePhotoAndUpload: () => Promise<void>;
  deleteMoment: (momentId: string) => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  hasMore: boolean;
}

const PAGE_SIZE = 20;

// Map file extensions to media types
function getMediaType(uri: string, mimeType: string | null): { mediaType: Moment['media_type']; mime: string } {
  const ext = uri.split('.').pop()?.toLowerCase() ?? '';
  const mime = mimeType ?? 'application/octet-stream';

  if (['gif'].includes(ext) || mime.includes('gif')) {
    return { mediaType: 'gif', mime: mime || 'image/gif' };
  }
  if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext) || mime.startsWith('video/')) {
    return { mediaType: 'video', mime: mime || 'video/mp4' };
  }
  if (['dng', 'arw', 'cr2', 'nef', 'raf', 'raw'].includes(ext)) {
    return { mediaType: 'raw', mime: mime || 'image/x-raw' };
  }
  // Everything else is an image (jpg, png, heic, webp, etc.)
  return { mediaType: 'image', mime: mime || 'image/jpeg' };
}

export function useMoments(): UseMomentsResult {
  const { user, couple } = useAuthStore();
  const { earnKisses } = useCoupleStore();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const userId = user?.id;
  const coupleId = couple?.id;

  const fetchMoments = useCallback(
    async (offset: number = 0) => {
      if (!coupleId) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('moments')
          .select('*')
          .eq('couple_id', coupleId)
          .order('created_at', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);

        if (error) throw error;

        if (offset === 0) {
          setMoments(data ?? []);
        } else {
          setMoments((prev) => [...prev, ...(data ?? [])]);
        }
        setHasMore((data ?? []).length === PAGE_SIZE);
      } catch (error) {
        console.error('Fetch moments error:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [coupleId]
  );

  // Initial load
  useEffect(() => {
    fetchMoments(0);
  }, [fetchMoments]);

  // Realtime subscription for new moments
  useEffect(() => {
    if (!coupleId) return;

    const channel = supabase
      .channel(`moments-${coupleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'moments',
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => {
          const newMoment = payload.new as Moment;
          setMoments((prev) => [newMoment, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'moments',
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => {
          const deleted = payload.old as { id: string };
          setMoments((prev) => prev.filter((m) => m.id !== deleted.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId]);

  const uploadFile = useCallback(
    async (asset: ImagePicker.ImagePickerAsset) => {
      if (!userId || !coupleId) return;

      setIsUploading(true);
      setUploadProgress(0);

      try {
        const uri = asset.uri;
        const fileName = asset.fileName ?? `moment_${Date.now()}`;
        const { mediaType, mime } = getMediaType(uri, asset.mimeType ?? null);

        // Read file as base64
        setUploadProgress(0.2);
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const filePath = `${coupleId}/${userId}/${Date.now()}_${fileName}`;
        setUploadProgress(0.4);

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('moments')
          .upload(filePath, decode(base64), {
            contentType: mime,
            upsert: false,
          });

        if (uploadError) throw uploadError;
        setUploadProgress(0.7);

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('moments')
          .getPublicUrl(uploadData.path);

        // Insert moment record
        const { error: insertError } = await supabase.from('moments').insert({
          couple_id: coupleId,
          author_id: userId,
          media_url: urlData.publicUrl,
          media_type: mediaType,
          mime_type: mime,
          caption: '',
          file_size_bytes: asset.fileSize ?? 0,
          width: asset.width ?? 0,
          height: asset.height ?? 0,
        });

        if (insertError) throw insertError;
        setUploadProgress(1);

        // Earn kisses for uploading
        await earnKisses(coupleId, userId, 'upload_moment');
      } catch (error) {
        console.error('Upload error:', error);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [userId, coupleId, earnKisses]
  );

  const pickAndUpload = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 0.9,
      exif: false,
    });

    if (result.canceled || result.assets.length === 0) return;

    for (const asset of result.assets) {
      await uploadFile(asset);
    }
  }, [uploadFile]);

  const takePhotoAndUpload = useCallback(async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.9,
    });

    if (result.canceled || result.assets.length === 0) return;

    const firstAsset = result.assets[0];
    if (firstAsset) {
      await uploadFile(firstAsset);
    }
  }, [uploadFile]);

  const deleteMoment = useCallback(
    async (momentId: string) => {
      const moment = moments.find((m) => m.id === momentId);
      if (!moment || moment.author_id !== userId) return;

      // Delete from storage
      const pathMatch = moment.media_url.match(/moments\/(.+)$/);
      if (pathMatch?.[1]) {
        await supabase.storage.from('moments').remove([pathMatch[1]]);
      }

      // Delete record
      await supabase.from('moments').delete().eq('id', momentId);
    },
    [moments, userId]
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    await fetchMoments(moments.length);
  }, [hasMore, isLoading, moments.length, fetchMoments]);

  const refresh = useCallback(async () => {
    setHasMore(true);
    await fetchMoments(0);
  }, [fetchMoments]);

  return {
    moments,
    isLoading,
    isUploading,
    uploadProgress,
    pickAndUpload,
    takePhotoAndUpload,
    deleteMoment,
    loadMore,
    refresh,
    hasMore,
  };
}

// Helper: decode base64 to Uint8Array for Supabase upload
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
