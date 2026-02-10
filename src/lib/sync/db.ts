/* eslint-disable @typescript-eslint/no-explicit-any */
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { PendingAction } from './types';

const DB_NAME = 'todo-gemini-sync';
const DB_VERSION = 5;

interface MetaValue {
    key: string;
    value: number | string | boolean;
}

interface SyncDB extends DBSchema {
    queue: {
        key: string;
        value: PendingAction;
        indexes: { 'by-timestamp': number };
    };
    tasks: {
        key: number;
        value: Record<string, unknown>;
    };
    lists: {
        key: number;
        value: Record<string, unknown>;
    };
    labels: {
        key: number;
        value: Record<string, unknown>;
    };
    meta: {
        key: string;
        value: MetaValue;
    };
}

let dbPromise: Promise<IDBPDatabase<SyncDB>> | null = null;

export function getDB() {
    if (!dbPromise) {
        dbPromise = openDB<SyncDB>(DB_NAME, DB_VERSION, {
            async upgrade(db, oldVersion, _newVersion, transaction) {
                if (oldVersion < 1) {
                    const store = db.createObjectStore('queue', { keyPath: 'id' });
                    store.createIndex('by-timestamp', 'timestamp');
                }
                if (oldVersion < 2) {
                    db.createObjectStore('tasks', { keyPath: 'id' });
                }
                if (oldVersion < 3) {
                    db.createObjectStore('lists', { keyPath: 'id' });
                    db.createObjectStore('labels', { keyPath: 'id' });
                }
                if (oldVersion < 4) {
                    db.createObjectStore('meta', { keyPath: 'key' });
                }
                if (oldVersion < 5 && db.objectStoreNames.contains('tasks')) {
                    const store = transaction.objectStore('tasks');
                    let cursor = await store.openCursor();
                    while (cursor) {
                        const value = cursor.value as Record<string, unknown>;
                        if (value && !("dueDatePrecision" in value)) {
                            cursor.update({ ...value, dueDatePrecision: null });
                        }
                        cursor = await cursor.continue();
                    }
                }
            },
        });
    }
    return dbPromise;
}

export async function saveTasksToCache(tasks: any[]) {
    const db = await getDB();
    const tx = db.transaction('tasks', 'readwrite');
    await Promise.all([
        ...tasks.map(t => tx.store.put(t)),
        tx.done
    ]);
}

export async function saveTaskToCache(task: any) {
    const db = await getDB();
    await db.put('tasks', task);
}

export async function deleteTaskFromCache(id: number) {
    const db = await getDB();
    await db.delete('tasks', id);
}

export async function getCachedTasks() {
    const db = await getDB();
    return db.getAll('tasks') as Promise<any[]>;
}

export async function addToQueue(action: PendingAction) {
    const db = await getDB();
    await db.put('queue', action);
}

export async function addToQueueBatch(actions: PendingAction[]) {
    if (actions.length === 0) return;
    const db = await getDB();
    const tx = db.transaction('queue', 'readwrite');
    // Perf: batch queue inserts to reduce IndexedDB overhead during rapid dispatch bursts.
    await Promise.all([
        ...actions.map(action => tx.store.put(action)),
        tx.done
    ]);
}

export async function removeFromQueue(id: string) {
    const db = await getDB();
    await db.delete('queue', id);
}

export async function removeFromQueueBatch(ids: string[]) {
    if (ids.length === 0) return;
    const db = await getDB();
    const tx = db.transaction('queue', 'readwrite');
    // Perf: batch deletes in a single transaction to reduce IndexedDB overhead
    // when draining large sync queues.
    await Promise.all([
        ...ids.map(id => tx.store.delete(id)),
        tx.done
    ]);
}

export async function getQueue(): Promise<PendingAction[]> {
    const db = await getDB();
    return db.getAllFromIndex('queue', 'by-timestamp');
}

export async function updateActionStatus(id: string, status: PendingAction['status'], error?: string) {
    const db = await getDB();
    const action = await db.get('queue', id);
    if (action) {
        action.status = status;
        if (error) action.error = error;
        await db.put('queue', action);
    }
}

export async function updateActionStatusBatch(
    updates: Array<{ id: string; status: PendingAction['status']; error?: string }>
) {
    if (updates.length === 0) return;
    const db = await getDB();
    const tx = db.transaction('queue', 'readwrite');
    // Perf: batch status updates to reduce per-action IndexedDB writes during sync.
    await Promise.all([
        ...updates.map(async ({ id, status, error }) => {
            const action = await tx.store.get(id);
            if (action) {
                action.status = status;
                if (error) action.error = error;
                await tx.store.put(action);
            }
        }),
        tx.done
    ]);
}

// Lists cache functions
export async function saveListsToCache(items: any[]) {
    const db = await getDB();
    const tx = db.transaction('lists', 'readwrite');
    await Promise.all([
        ...items.map(item => tx.store.put(item)),
        tx.done
    ]);
}

export async function saveListToCache(item: any) {
    const db = await getDB();
    await db.put('lists', item);
}

export async function deleteListFromCache(id: number) {
    const db = await getDB();
    await db.delete('lists', id);
}

export async function getCachedLists() {
    const db = await getDB();
    return db.getAll('lists') as Promise<any[]>;
}

// Labels cache functions
export async function saveLabelsToCache(items: any[]) {
    const db = await getDB();
    const tx = db.transaction('labels', 'readwrite');
    await Promise.all([
        ...items.map(item => tx.store.put(item)),
        tx.done
    ]);
}

export async function saveLabelToCache(item: any) {
    const db = await getDB();
    await db.put('labels', item);
}

export async function deleteLabelFromCache(id: number) {
    const db = await getDB();
    await db.delete('labels', id);
}

export async function getCachedLabels() {
    const db = await getDB();
    return db.getAll('labels') as Promise<any[]>;
}

// Meta store functions for data freshness tracking
export type EntityType = 'tasks' | 'lists' | 'labels';

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export async function setLastFetched(entity: EntityType): Promise<void> {
    const db = await getDB();
    await db.put('meta', { key: `lastFetched:${entity}`, value: Date.now() });
}

export async function getLastFetched(entity: EntityType): Promise<number | null> {
    const db = await getDB();
    const record = await db.get('meta', `lastFetched:${entity}`);
    return record?.value as number | null ?? null;
}

export async function isDataStale(entity: EntityType, thresholdMs: number = STALE_THRESHOLD_MS): Promise<boolean> {
    const lastFetched = await getLastFetched(entity);
    if (lastFetched === null) return true;
    return Date.now() - lastFetched > thresholdMs;
}

export async function setAllLastFetched(): Promise<void> {
    const db = await getDB();
    const now = Date.now();
    const tx = db.transaction('meta', 'readwrite');
    await Promise.all([
        tx.store.put({ key: 'lastFetched:tasks', value: now }),
        tx.store.put({ key: 'lastFetched:lists', value: now }),
        tx.store.put({ key: 'lastFetched:labels', value: now }),
        tx.done
    ]);
}
