import api from './api';

export interface QueuedItem {
  id: string;
  type: 'TRIP_START' | 'TRIP_END' | 'INSPECTION';
  payload: any;
  status: 'QUEUED' | 'SYNCING' | 'SYNCED' | 'FAILED';
  retryCount: number;
  lastError?: string;
  timestamp: string;
}

const STORAGE_KEY = 'jk_driver_offline_queue';

export const offlineQueue = {
  getItems(): QueuedItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveItems(items: QueuedItem[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  },

  enqueue(type: QueuedItem['type'], payload: any): QueuedItem {
    const items = this.getItems();
    const newItem: QueuedItem = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      payload,
      status: 'QUEUED',
      retryCount: 0,
      timestamp: new Date().toISOString(),
    };
    items.push(newItem);
    this.saveItems(items);
    return newItem;
  },

  async flush(): Promise<{ synced: number; failed: number }> {
    const items = this.getItems();
    let synced = 0;
    let failed = 0;

    for (const item of items) {
      if (item.status === 'SYNCED') continue;

      item.status = 'SYNCING';
      this.saveItems(items);

      try {
        if (item.type === 'TRIP_START') {
          await api.post('/driver/start-trip', item.payload);
        } else if (item.type === 'TRIP_END') {
          await api.post('/driver/end-trip', item.payload);
        } else if (item.type === 'INSPECTION') {
          await api.post('/inspections', item.payload);
        }
        item.status = 'SYNCED';
        synced++;
      } catch (err: any) {
        item.status = 'FAILED';
        item.retryCount += 1;
        item.lastError = err.response?.data?.error || err.message || 'Network error';
        failed++;
      }
      this.saveItems(items);
    }

    // Keep only recent items
    const filtered = items.filter(i => i.status !== 'SYNCED' || (Date.now() - new Date(i.timestamp).getTime()) < 3600000);
    this.saveItems(filtered);

    return { synced, failed };
  },

  clear() {
    localStorage.removeItem(STORAGE_KEY);
  }
};
