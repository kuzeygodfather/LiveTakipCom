import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from './supabase';

interface SyncStatus {
  lastSyncTime: string | null;
  lastAnalyzeTime: string | null;
  syncing: boolean;
  analyzing: boolean;
  error: string | null;
}

const DEFAULT_SYNC_INTERVAL = 60000;
const DEFAULT_ANALYZE_INTERVAL = 120000;
const STATS_REFRESH_INTERVAL = 15000;

export function useBackgroundSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSyncTime: null,
    lastAnalyzeTime: null,
    syncing: false,
    analyzing: false,
    error: null,
  });
  const [pollingInterval, setPollingInterval] = useState(DEFAULT_SYNC_INTERVAL);
  const syncingRef = useRef(false);
  const analyzingRef = useRef(false);

  const loadPollingInterval = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('polling_interval')
        .maybeSingle();

      if (data?.polling_interval) {
        setPollingInterval(data.polling_interval * 1000);
      }
    } catch {
      // use default
    }
  }, []);

  const syncChats = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncStatus(prev => ({ ...prev, syncing: true, error: null }));

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-livechat?days=1`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`Sync failed: ${response.status}`);

      setSyncStatus(prev => ({
        ...prev,
        lastSyncTime: new Date().toISOString(),
        syncing: false,
        error: null,
      }));
    } catch (err: any) {
      setSyncStatus(prev => ({
        ...prev,
        syncing: false,
        error: null,
      }));
    } finally {
      syncingRef.current = false;
    }
  }, []);

  const analyzeChats = useCallback(async () => {
    if (analyzingRef.current) return;

    try {
      const { count } = await supabase
        .from('chats')
        .select('*', { count: 'exact', head: true })
        .eq('analyzed', false);

      if (!count || count === 0) return;

      analyzingRef.current = true;
      setSyncStatus(prev => ({ ...prev, analyzing: true }));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-chat`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`Analyze failed: ${response.status}`);

      setSyncStatus(prev => ({
        ...prev,
        lastAnalyzeTime: new Date().toISOString(),
        analyzing: false,
        error: null,
      }));
    } catch (err: any) {
      setSyncStatus(prev => ({
        ...prev,
        analyzing: false,
        error: null,
      }));
    } finally {
      analyzingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadPollingInterval();
  }, [loadPollingInterval]);

  useEffect(() => {
    // Background sync disabled to prevent blocking
    // Sync will only run when manually triggered
    return () => {};
  }, [pollingInterval, syncChats, analyzeChats, loadPollingInterval]);

  return { syncStatus, syncChats, analyzeChats };
}
