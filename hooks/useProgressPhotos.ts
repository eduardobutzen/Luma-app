import { useCallback, useEffect, useState } from 'react';

import { currentUserId } from '@/lib/session';
import { uploadPhoto } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

export interface ProgressPhoto {
  id: string;
  image_url: string;
  weight_kg: number | null;
  note: string | null;
  taken_at: string;
}

export function useProgressPhotos() {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const uid = await currentUserId();
    if (!uid) {
      setPhotos([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('progress_photos')
      .select('*')
      .eq('user_id', uid)
      .order('taken_at', { ascending: false });
    setPhotos(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const add = useCallback(
    async (
      uri: string,
      extra?: { weight_kg?: number | null; note?: string | null },
    ): Promise<{ ok: boolean; error?: string; photo?: ProgressPhoto }> => {
      const uid = await currentUserId();
      if (!uid) return { ok: false, error: 'Sessão não encontrada. Saia e entre de novo.' };
      const ext = (uri.split('.').pop() ?? 'jpg').toLowerCase();
      const url = await uploadPhoto(uri, `${uid}/progress/${Date.now()}.${ext}`);
      if (!url) {
        return {
          ok: false,
          error: 'Falha ao enviar a imagem para o Storage (bucket meal-photos / policies).',
        };
      }
      const { data, error } = await supabase
        .from('progress_photos')
        .insert({
          user_id: uid,
          image_url: url,
          weight_kg: extra?.weight_kg ?? null,
          note: extra?.note ?? null,
        })
        .select()
        .single();
      if (error) return { ok: false, error: error.message };
      await refetch();
      return { ok: true, photo: data as ProgressPhoto };
    },
    [refetch],
  );

  const remove = useCallback(
    async (id: string) => {
      await supabase.from('progress_photos').delete().eq('id', id);
      await refetch();
    },
    [refetch],
  );

  return { photos, loading, refetch, add, remove };
}
