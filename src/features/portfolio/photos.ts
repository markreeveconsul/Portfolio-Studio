import { supabase } from '../../lib/supabase';
import type { Portfolio } from './model';

export const PHOTO_LIMIT = 2 * 1024 * 1024;
const extensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
export function validatePhoto(file: File): string {
  if (!extensions[file.type]) return 'Choose a JPG, PNG, or WebP image.';
  if (!file.size || file.size > PHOTO_LIMIT) return 'Choose a photo smaller than or equal to 2 MB.';
  return '';
}
export interface PhotoService {
  download(path: string): Promise<Blob>;
  save(
    portfolio: Portfolio,
    file: File | null,
  ): Promise<{ photo_path: string | null; updated_at: string; warning: string }>;
}
function client() {
  if (!supabase) throw new Error('Sign in before changing your photo.');
  return supabase;
}
export const photoService: PhotoService = {
  async download(path) {
    const { data, error } = await client().storage.from('profile-photos').download(path);
    if (error || !data) throw new Error('Photo could not be loaded.');
    return data;
  },
  async save(portfolio, file) {
    const storage = client().storage.from('profile-photos');
    let nextPath: string | null = null;
    if (file) {
      const validation = validatePhoto(file);
      if (validation) throw new Error(validation);
      nextPath = `${portfolio.owner_id}/${crypto.randomUUID()}.${extensions[file.type]}`;
      const { error } = await storage.upload(nextPath, file, {
        upsert: false,
        contentType: file.type,
      });
      if (error)
        throw new Error('Photo upload could not be confirmed. Reload before trying again.');
    }
    // Never overwrite an object. A stale tab must not replace a newer photo or text edit.
    const { data, error } = await client()
      .from('portfolios')
      .update({ photo_path: nextPath })
      .eq('id', portfolio.id)
      .eq('owner_id', portfolio.owner_id)
      .eq('updated_at', portfolio.updated_at)
      .select('photo_path,updated_at')
      .maybeSingle();
    if (error) {
      // The response may have been lost after commit. Retain the new object rather
      // than risk deleting a photo now referenced by the database.
      throw new Error(
        'Photo save could not be confirmed. Reload the saved portfolio before retrying. An uploaded file may remain private in storage.',
      );
    }
    if (!data) {
      let retained = false;
      if (nextPath) {
        try {
          retained = Boolean((await storage.remove([nextPath])).error);
        } catch {
          retained = true;
        }
      }
      throw new Error(
        'Your portfolio changed in another session. Reload the saved version before changing the photo.' +
          (retained ? ' An unused upload remains private in storage.' : ''),
      );
    }
    let warning = '';
    if (portfolio.photo_path && portfolio.photo_path !== nextPath) {
      try {
        const { error: cleanupError } = await storage.remove([portfolio.photo_path]);
        if (cleanupError) throw cleanupError;
      } catch {
        warning =
          'Photo updated, but the previous file could not be removed from private storage. Contact your admin for cleanup.';
      }
    }
    return { photo_path: data.photo_path, updated_at: data.updated_at, warning };
  },
};
