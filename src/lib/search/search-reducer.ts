
import { SearchAllResponse } from "@/lib/actions/search";
import { Task } from "@/lib/types";
import { SearchFilters } from "@/components/search/SearchFiltersPanel";

export type SearchState = {
    query: string;
    results: SearchAllResponse | null;
    taskResults: SearchAllResponse["tasks"];
    cursor: number | null;
    hasMore: boolean;
    isLoadingMore: boolean;
    showFilters: boolean;
    filters: SearchFilters;
    editingTask: Task | null;
    prevInitialQuery: string;
    prevInitialResults: SearchAllResponse | null;
};

export type SearchAction =
    | { type: 'SET_QUERY'; payload: string }
    | { type: 'SYNC_PROPS'; query: string; results: SearchAllResponse | null }
    | { type: 'LOAD_MORE_START' }
    | { type: 'LOAD_MORE_SUCCESS'; payload: { tasks: SearchAllResponse["tasks"]; nextCursor: number | null; hasMore: boolean } }
    | { type: 'LOAD_MORE_ERROR' }
    | { type: 'TOGGLE_FILTERS' }
    | { type: 'SET_EDITING_TASK'; payload: Task | null };

export function searchReducer(state: SearchState, action: SearchAction): SearchState {
    switch (action.type) {
        case 'SET_QUERY': return { ...state, query: action.payload };
        case 'SYNC_PROPS': return {
            ...state,
            prevInitialQuery: action.query,
            query: state.prevInitialQuery !== action.query ? action.query : state.query,
            prevInitialResults: action.results,
            results: action.results,
            taskResults: action.results?.tasks ?? [],
            cursor: action.results?.nextCursor ?? null,
            hasMore: action.results?.hasMore ?? false,
        };
        case 'LOAD_MORE_START': return { ...state, isLoadingMore: true };
        case 'LOAD_MORE_SUCCESS': return {
            ...state,
            taskResults: [...state.taskResults, ...action.payload.tasks],
            cursor: action.payload.nextCursor,
            hasMore: action.payload.hasMore,
            isLoadingMore: false,
        };
        case 'LOAD_MORE_ERROR': return { ...state, isLoadingMore: false };
        case 'TOGGLE_FILTERS': return { ...state, showFilters: !state.showFilters };
        case 'SET_EDITING_TASK': return { ...state, editingTask: action.payload };
        default: return state;
    }
}
