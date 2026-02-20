
import { IconPickerState, IconPickerAction } from "./types";

export function iconPickerReducer(state: IconPickerState, action: IconPickerAction): IconPickerState {
    switch (action.type) {
        case 'SET_OPEN': return { ...state, open: action.payload };
        case 'SET_SEARCH_QUERY': return { ...state, searchQuery: action.payload };
        case 'SET_ACTIVE_TAB': return { ...state, activeTab: action.payload };
        case 'SET_SELECTED_COLOR': return { ...state, selectedColor: action.payload };
        case 'SET_CUSTOM_ICONS': return { ...state, customIcons: action.payload };
        case 'ADD_CUSTOM_ICON': return { ...state, customIcons: [...state.customIcons, action.payload] };
        case 'SET_UPLOAD_NAME': return { ...state, uploadName: action.payload };
        case 'SET_UPLOAD_URL': return { ...state, uploadUrl: action.payload };
        case 'SET_IS_UPLOADING': return { ...state, isUploading: action.payload };
        case 'SET_IS_LOADING': return { ...state, isLoading: action.payload };
        case 'SET_RECENT_ICONS': return { ...state, recentIcons: action.payload };
        case 'SET_IS_DRAGGING': return { ...state, isDragging: action.payload };
        case 'RESET_UPLOAD': return { ...state, uploadName: "", uploadUrl: "" };
        default: return state;
    }
}
