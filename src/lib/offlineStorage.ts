'use client';

import { get, update } from 'idb-keyval';
import { Assessment } from '@/types';

export interface OfflineDraft {
  id: string; // local UUID or timestamp string
  payload: Assessment | Record<string, unknown>;
  timestamp: number;
}

const QUEUE_KEY = 'offline_queue';

export async function saveToOfflineQueue(payload: Assessment | Record<string, unknown>) {
  const draft: OfflineDraft = {
    id: `draft_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    payload,
    timestamp: Date.now(),
  };

  await update(QUEUE_KEY, (val) => {
    const queue = (val as OfflineDraft[]) || [];
    return [...queue, draft];
  });
}

export async function getOfflineQueue(): Promise<OfflineDraft[]> {
  const queue = await get(QUEUE_KEY);
  return (queue as OfflineDraft[]) || [];
}

export async function clearOfflineDraft(id: string) {
  await update(QUEUE_KEY, (val) => {
    const queue = (val as OfflineDraft[]) || [];
    return queue.filter((draft) => draft.id !== id);
  });
}

export async function flushOfflineQueue() {
  const queue = await getOfflineQueue();
  if (queue.length === 0) return;

  for (const draft of queue) {
    try {
      const response = await fetch('/api/assess/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft.payload),
      });

      if (response.ok) {
        await clearOfflineDraft(draft.id);
      } else {
        console.error('Failed to sync draft', draft.id);
      }
    } catch (error) {
      console.error('Network error during draft sync', draft.id, error);
      // Keep in queue for next online event
      break; 
    }
  }
}

// Automatically flush when coming online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('App is online. Flushing offline queue...');
    flushOfflineQueue();
  });
}
