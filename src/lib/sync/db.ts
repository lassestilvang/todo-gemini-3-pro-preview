import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { PendingAction } from './types';

interface SyncDB extends DBSchema {
    queue: {
        key: string;
        value: PendingAction;
        indexes: { 'by-timestamp': number };
    };
}

const DB_NAME = 'todo-gemini-sync';
const DB_VERSION = 2;

interface SyncDB extends DBSchema {
    queue: {
        key: string;
        value: PendingAction;
        indexes: { 'by-timestamp': number };
    };
    tasks: {
        key: number;
        value: any; // Storing Task object
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
