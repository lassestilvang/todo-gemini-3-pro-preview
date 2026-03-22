export function replaceIdsInPayload(
  payload: unknown,
  oldId: number,
  newId: number,
): unknown {
  if (payload === oldId) return newId;
  if (Array.isArray(payload)) {
    let changed = false;
    const newArr = new Array(payload.length);
    for (let i = 0; i < payload.length; i++) {
      const item = payload[i];
      const newItem = replaceIdsInPayload(item, oldId, newId);
      if (newItem !== item) changed = true;
      newArr[i] = newItem;
    }
    return changed ? newArr : payload;
  }
  if (typeof payload === "object" && payload !== null) {
    const obj = payload as Record<string, unknown>;
    let changed = false;
    const newObj: Record<string, unknown> = {};
    for (const key in obj) {
      const val = obj[key];
      const newVal = replaceIdsInPayload(val, oldId, newId);
      if (newVal !== val) changed = true;
      newObj[key] = newVal;
    }
    return changed ? newObj : payload;
  }
  return payload;
}
