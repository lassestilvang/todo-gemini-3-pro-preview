export interface PendingAction {
    id: string; // UUID for the action record
    type: string; // e.g., "createTask"
    payload: any; // Arguments for the action
    timestamp: number;
    tempId?: number; // If this action creates an entity, this is the temp ID
    status: 'pending' | 'processing' | 'failed';
    retryCount: number;
    error?: string;
}

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'error';
