export function formatTodoistConflictPayload(payload: string | null) {
    if (!payload) {
        return { title: "", description: "" };
    }

    try {
        const parsed = JSON.parse(payload) as { title?: string; description?: string };
        return {
            title: parsed.title ?? "",
            description: parsed.description ?? "",
        };
    } catch {
        return { title: "", description: "" };
    }
}
