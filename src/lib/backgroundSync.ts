import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from './supabase';

interface SyncStatus {
  lastSyncTime: string | null;
  lastAnalyzeTime: string | null;
  syncing: boolean;
  analyzing: boolean;
  error: string | null;
}

const STATS_REFRESH_INTERVAL = 15000;

export function useBackgroundSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSyncTime: null,
    lastAnalyzeTime: null,
    syncing: false,
    analyzing: false,
    error: null,
  });
  const checkingRef = useRef(false);

  // Check server-side sync status by looking at latest sync jobs
  const checkSyncStatus = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;

    try {
      // Get latest sync job
      const { data: latestSync } = await supabase
        .from('sync_jobs')
        .select('status, completed_at, error')
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get latest synced chat time (more accurate than job completion time)
      const { data: latestChat } = await supabase
        .from('chats')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get unanalyzed count to show analyzing status
      const { count: unanalyzedCount } = await supabase
        .from('chats')
        .select('*', { count: 'exact', head: true })
        .eq('analyzed', false);

      setSyncStatus(prev => ({
        ...prev,
        syncing: latestSync?.status === 'processing',
        analyzing: (unanalyzedCount || 0) > 0,
        lastSyncTime: latestChat?.created_at || prev.lastSyncTime,
        error: latestSync?.status === 'failed' ? latestSync.error : null,
      }));
    } catch (err: any) {
      setSyncStatus(prev => ({
        ...prev,
        error: err.message,
      }));
    } finally {
      checkingRef.current = false;
    }
  }, []);

  // Manual sync trigger (for UI buttons)
  const syncChats = useCallback(async () => {
    setSyncStatus(prev => ({ ...prev, syncing: true, error: null }));

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-livechat`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) throw new Error(`Sync failed: ${response.status}`);

      setSyncStatus(prev => ({
        ...prev,
        lastSyncTime: new Date().toISOString(),
        syncing: false,
      }));
    } catch (err: any) {
      setSyncStatus(prev => ({
        ...prev,
        syncing: false,
        error: err.message,
      }));
    }
  }, []);

  // Manual analyze trigger (for UI buttons)
  const analyzeChats = useCallback(async () => {
    const { count } = await supabase
      .from('chats')
      .select('*', { count: 'exact', head: true })
      .eq('analyzed', false);

    if (!count || count === 0) return;

    setSyncStatus(prev => ({ ...prev, analyzing: true }));

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-chat`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) throw new Error(`Analyze failed: ${response.status}`);

      setSyncStatus(prev => ({
        ...prev,
        lastAnalyzeTime: new Date().toISOString(),
        analyzing: false,
      }));
    } catch (err: any) {
      setSyncStatus(prev => ({
        ...prev,
        analyzing: false,
        error: err.message,
      }));
    }
  }, []);

  // Only check status periodically, don't trigger sync
  // Server-side cron handles automatic syncing
  useEffect(() => {
    checkSyncStatus();
    const statusInterval = setInterval(checkSyncStatus, STATS_REFRESH_INTERVAL);

    return () => {
      clearInterval(statusInterval);
    };
  }, [checkSyncStatus]);

  return { syncStatus, syncChats, analyzeChats };
}
