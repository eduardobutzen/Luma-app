import { decode } from 'base64-arraybuffer';
// SDK 54: readAsStringAsync / EncodingType live in the legacy FileSystem API.
import * as FileSystem from 'expo-file-system/legacy';

import { supabase } from '@/lib/supabase';

const BUCKET = 'meal-photos';

/**
 * Uploads a local image URI to the meal-photos bucket and returns its public
 * URL, or null on failure. `path` must start with the user's id (e.g.
 * `${userId}/file.jpg`) to satisfy the Storage RLS policy.
 */
export async function uploadPhoto(
  uri: string,
  path: string,
  opts?: { upsert?: boolean },
): Promise<string | null> {
  try {
    const ext = (uri.split('.').pop() ?? 'jpg').toLowerCase();
    const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, decode(base64), {
        contentType,
        upsert: opts?.upsert ?? false,
      });
    if (error) return null;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}
