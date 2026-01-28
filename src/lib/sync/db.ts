import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { PendingAction } from './types';

const DB_NAME = 'todo-gemini-sync';
const DB_VERSION = 3;

interface SyncDB extends DBSchema {
    queue: {
        key: string;
        value: PendingAction;
        indexes: { 'by-timestamp': number };
    };
    tasks: {
        key: number;
        value: any;
    };
    lists: {
        key: number;
        value: any;
    };
    labels: {
        key: number;
        value: any;
    };
}

let dbPromise: Promise<IDBPDatabase<SyncDB>> | null = null;

export function getDB() {
    if (!dbPromise) {
        dbPromise = openDB<SyncDB>(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion, newVersion, transaction) {
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
    return db.getAll('tasks');
}

export async function addToQueue(action: PendingAction) {
    const db = await getDB();
    await db.put('queue', action);
}

export async function removeFromQueue(id: string) {
    const db = await getDB();
    await db.delete('queue', id);
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
    return db.getAll('lists');
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
    return db.getAll('labels');
}
