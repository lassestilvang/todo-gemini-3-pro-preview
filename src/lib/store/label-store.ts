import { create } from 'zustand';
import { getCachedLabels, saveLabelToCache, saveLabelsToCache, deleteLabelFromCache } from '@/lib/sync/db';

type Label = {
    id: number;
    name: string;
    color: string | null;
    icon: string | null;
    position?: number;
};

interface LabelState {
    labels: Record<number, Label>;
    isInitialized: boolean;
    initialize: () => Promise<void>;
    setLabels: (labels: Label[]) => void;
    upsertLabels: (labels: Label[]) => void;
    upsertLabel: (label: Label) => void;
    deleteLabels: (ids: number[]) => void;
    deleteLabel: (id: number) => void;
}

export const useLabelStore = create<LabelState>((set, get) => ({
    labels: {},
    isInitialized: false,

    initialize: async () => {
        if (get().isInitialized) return;

        try {
            const cached = await getCachedLabels();
            const cachedMap: Record<number, Label> = {};
            cached.forEach((item: Label) => {
                cachedMap[item.id] = item;
            });

            set(state => ({
                labels: { ...cachedMap, ...state.labels },
                isInitialized: true,
            }));
        } catch (e) {
            console.error("Failed to load labels from cache", e);
            set({ isInitialized: true });
        }
    },

    setLabels: (newLabels: Label[]) => {
        set(state => {
            const updatedLabels = { ...state.labels };
            newLabels.forEach(item => {
                updatedLabels[item.id] = item;
            });
            return { labels: updatedLabels };
        });

        saveLabelsToCache(newLabels).catch(console.error);
    },

    upsertLabels: (labels: Label[]) => {
        if (labels.length === 0) return;
        // Perf: batch upserts to reduce Zustand set() calls during sync drains.
        set(state => {
            const updatedLabels = { ...state.labels };
            labels.forEach(item => {
                updatedLabels[item.id] = item;
            });
            return { labels: updatedLabels };
        });
        saveLabelsToCache(labels).catch(console.error);
    },

    upsertLabel: (label: Label) => {
        set(state => ({
            labels: { ...state.labels, [label.id]: label }
        }));
        saveLabelToCache(label).catch(console.error);
    },

    deleteLabels: (ids: number[]) => {
        if (ids.length === 0) return;
        // Perf: batch deletes to reduce Zustand set() calls during sync drains.
        set(state => {
            const newLabels = { ...state.labels };
            ids.forEach(id => {
                delete newLabels[id];
            });
            return { labels: newLabels };
        });
        Promise.all(ids.map(id => deleteLabelFromCache(id))).catch(console.error);
    },

    deleteLabel: (id: number) => {
        set(state => {
            const newLabels = { ...state.labels };
            delete newLabels[id];
            return { labels: newLabels };
        });
        deleteLabelFromCache(id).catch(console.error);
    }
}));
