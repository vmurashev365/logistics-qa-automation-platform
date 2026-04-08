/**
 * Offline sync polling types.
 */

export type LoadSyncStatus = 'pending' | 'queued' | 'syncing' | 'synced' | 'failed' | 'unknown';

export interface LoadStatusResponse {
  load_id: string;
  synced: boolean;
  status?: LoadSyncStatus | string;
  /** Optional additional diagnostic fields */
  last_updated_at?: string;
  error?: string;
}
