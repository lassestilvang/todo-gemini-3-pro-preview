/**
 * @module actions/views
 * @description Server Actions for managing saved views (filter presets).
 */
"use server";

import {
    db,
    savedViews,
    eq,
    and,
    revalidatePath,
    type ActionResult,
    withErrorHandling,
    ValidationError,
} from "./shared";

/**
 * Retrieves all saved views for a specific user.
 */
export async function getSavedViews(userId: string) {
    return await db
        .select()
        .from(savedViews)
        .where(eq(savedViews.userId, userId))
        .orderBy(savedViews.createdAt);
}

/**
 * Creates a new saved view.
 */
async function createSavedViewImpl(data: {
    userId: string;
    name: string;
    settings: string; // JSON string
    icon?: string;
}) {
    if (!data.name || data.name.trim().length === 0) {
        throw new ValidationError("View name is required");
    }

    const result = await db.insert(savedViews).values(data).returning();
    revalidatePath("/", "layout");
    return result[0];
}

export const createSavedView: (
    data: { userId: string; name: string; settings: string; icon?: string }
) => Promise<ActionResult<typeof savedViews.$inferSelect>> = withErrorHandling(createSavedViewImpl);

/**
 * Deletes a saved view.
 */
async function deleteSavedViewImpl(id: number, userId: string) {
    await db.delete(savedViews).where(and(eq(savedViews.id, id), eq(savedViews.userId, userId)));
    revalidatePath("/", "layout");
}

export const deleteSavedView: (
    id: number,
    userId: string
) => Promise<ActionResult<void>> = withErrorHandling(deleteSavedViewImpl);
