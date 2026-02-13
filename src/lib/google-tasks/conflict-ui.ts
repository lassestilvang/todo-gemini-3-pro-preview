export function formatGoogleTasksConflictPayload(payload: string | null) {
    if (!payload) {
        return { title: "", description: "" };
    }

    try {
        const parsed = JSON.parse(payload) as { title?: string; notes?: string; description?: string };
        return {
            title: parsed.title ?? "",
            description: parsed.notes ?? parsed.description ?? "",
        };
    } catch {
        return { title: "", description: "" };
    }
}
