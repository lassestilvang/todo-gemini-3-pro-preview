import { create } from 'zustand';
import { getCachedLists, saveListToCache, saveListsToCache, deleteListFromCache } from '@/lib/sync/db';

type List = {
    id: number;
    name: string;
    color: string | null;
    icon: string | null;
    slug: string;
    position?: number;
};

interface ListState {
    lists: Record<number, List>;
    isInitialized: boolean;
    initialize: () => Promise<void>;
    setLists: (lists: List[]) => void;
    upsertList: (list: List) => void;
    deleteList: (id: number) => void;
}

export const useListStore = create<ListState>((set, get) => ({
    lists: {},
    isInitialized: false,

    initialize: async () => {
        if (get().isInitialized) return;

        try {
            const cached = await getCachedLists();
            const cachedMap: Record<number, List> = {};
            cached.forEach((item: List) => {
                cachedMap[item.id] = item;
            });

            set(state => ({
                lists: { ...cachedMap, ...state.lists },
                isInitialized: true,
            }));
        } catch (e) {
            console.error("Failed to load lists from cache", e);
            set({ isInitialized: true });
        }
    },

    setLists: (newLists: List[]) => {
        set(state => {
            const updatedLists = { ...state.lists };
            newLists.forEach(item => {
                updatedLists[item.id] = item;
            });
            return { lists: updatedLists };
        });

        saveListsToCache(newLists).catch(console.error);
    },

    upsertList: (list: List) => {
        set(state => ({
            lists: { ...state.lists, [list.id]: list }
        }));
        saveListToCache(list).catch(console.error);
    },

    deleteList: (id: number) => {
        set(state => {
            const newLists = { ...state.lists };
            delete newLists[id];
            return { lists: newLists };
        });
        deleteListFromCache(id).catch(console.error);
    }
}));
