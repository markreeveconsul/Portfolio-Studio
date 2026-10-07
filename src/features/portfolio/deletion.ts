import { supabase } from '../../lib/supabase';
import type { Portfolio } from './model';
export interface DeletionService {
  remove(portfolio: Portfolio): Promise<void>;
  pending(): Promise<number>;
  cleanup(): Promise<void>;
}
function client() {
  if (!supabase) throw new Error('Sign in first.');
  return supabase;
}
export const deletionService: DeletionService = {
  async remove(portfolio) {
    const { error } = await client().rpc('delete_own_portfolio', {
      p_id: portfolio.id,
      p_expected_updated_at: portfolio.updated_at,
    });
    if (error) throw error;
  },
  async pending() {
    const { count, error } = await client()
      .from('photo_cleanup_jobs')
      .select('id', { count: 'exact', head: true });
    if (error) throw error;
    return count ?? 0;
  },
  async cleanup() {
    // Bounded batches; remaining work is durable and can be retried.
    const { data, error } = await client()
      .from('photo_cleanup_jobs')
      .select('id,photo_path')
      .order('created_at')
      .limit(50);
    if (error) throw error;
    for (const job of data ?? []) {
      const { error: storageError } = await client()
        .storage.from('profile-photos')
        .remove([job.photo_path]);
      if (storageError) throw storageError;
      const { error: queueError } = await client()
        .from('photo_cleanup_jobs')
        .delete()
        .eq('id', job.id);
      if (queueError) throw queueError;
    }
  },
};
