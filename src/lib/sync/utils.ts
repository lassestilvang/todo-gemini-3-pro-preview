
export function replaceIdsInPayload(payload: unknown, oldId: number, newId: number): unknown {
    if (payload === oldId) return newId;
    if (Array.isArray(payload)) return payload.map(item => replaceIdsInPayload(item, oldId, newId));
    if (typeof payload === 'object' && payload !== null) {
        const obj = payload as Record<string, unknown>;
        const newObj: Record<string, unknown> = {};
        for (const key in obj) {
            newObj[key] = replaceIdsInPayload(obj[key], oldId, newId);
        }
        return newObj;
    }
    return payload;
}
