"use server";

import {
    db,
    customIcons,
    eq,
    and,
    revalidatePath,
    type ActionResult,
    withErrorHandling,
    ValidationError,
} from "./shared";
import { logActivity } from "./logs";
import { cache } from "react";
import { unstable_cache, revalidateTag } from "next/cache";

/**
 * Retrieves all custom icons for a specific user.
 */
export const getCustomIcons = cache(async function getCustomIcons(userId: string) {
    const fn = unstable_cache(
        async (id: string) => {
            return await db
                .select()
                .from(customIcons)
                .where(eq(customIcons.userId, id))
                .orderBy(customIcons.createdAt);
        },
        ["custom-icons"],
        { tags: [`custom-icons-${userId}`] }
    );
    return fn(userId);
});

/**
 * Internal implementation for creating a new custom icon.
 */
async function createCustomIconImpl(data: typeof customIcons.$inferInsert) {
    if (!data.name || data.name.trim().length === 0) {
        throw new ValidationError("Icon name is required", { name: "Name cannot be empty" });
    }
    if (!data.url || data.url.trim().length === 0) {
        throw new ValidationError("Icon URL is required", { url: "URL cannot be empty" });
    }
    if (!data.userId) {
        throw new ValidationError("User ID is required", { userId: "User ID cannot be empty" });
    }

    const result = await db.insert(customIcons).values(data).returning();

    await logActivity({
        userId: data.userId,
        action: "custom_icon_created", // We might need to add this action to types if strict, but ignoring for now
        details: `Created custom icon: ${result[0].name}`,
    });

    revalidateTag(`custom-icons-${data.userId}`, 'max');
    return result[0];
}

export const createCustomIcon: (
    data: typeof customIcons.$inferInsert
) => Promise<ActionResult<typeof customIcons.$inferSelect>> = withErrorHandling(createCustomIconImpl);

/**
 * Internal implementation for deleting a custom icon.
 */
async function deleteCustomIconImpl(id: number, userId: string) {
    const currentIcon = await db
        .select()
        .from(customIcons)
        .where(and(eq(customIcons.id, id), eq(customIcons.userId, userId)))
        .then(res => res[0]);

    if (!currentIcon) {
        throw new ValidationError("Icon not found");
    }

    await db.delete(customIcons).where(and(eq(customIcons.id, id), eq(customIcons.userId, userId)));

    await logActivity({
        userId,
        action: "custom_icon_deleted",
        details: `Deleted custom icon: ${currentIcon.name}`,
    });

    revalidateTag(`custom-icons-${userId}`, 'max');
}

export const deleteCustomIcon: (
    id: number,
    userId: string
) => Promise<ActionResult<void>> = withErrorHandling(deleteCustomIconImpl);
