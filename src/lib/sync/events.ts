export const DATA_REFRESH_EVENT = "todo-gemini:data-refresh";

export function requestDataRefresh() {
    if (typeof window === "undefined") {
        return;
    }
    window.dispatchEvent(new Event(DATA_REFRESH_EVENT));
}
