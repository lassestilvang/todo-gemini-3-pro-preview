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
    upsertLabel: (label: Label) => void;
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
            cached.forEach((item: any) => {
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

    upsertLabel: (label: Label) => {
        set(state => ({
            labels: { ...state.labels, [label.id]: label }
        }));
        saveLabelToCache(label).catch(console.error);
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
