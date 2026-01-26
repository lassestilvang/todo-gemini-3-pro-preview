/**
 * @module actions/lists
 * @description Server Actions for list management including CRUD operations.
 * Lists are used to organize tasks into categories (e.g., Inbox, Work, Personal).
 */
"use server";

import {
  db,
  lists,
  eq,
  and,
  revalidatePath,
  type ActionResult,
  withErrorHandling,
  ValidationError,
} from "./shared";
import { logActivity } from "./logs";
import { getCurrentUser } from "@/lib/auth";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth-errors";

/**
 * Retrieves all lists for a specific user.
 *
 * @param userId - The ID of the user whose lists to retrieve
 * @returns Array of lists ordered by creation date
 */
import { cache } from "react";
import { unstable_cache, revalidateTag } from "next/cache";

/**
 * Retrieves all lists for a specific user.
 *
 * @param userId - The ID of the user whose lists to retrieve
 * @returns Array of lists ordered by creation date
 */
export const getLists = cache(async function getLists(userId: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError();
  }
  if (user.id !== userId) {
    throw new ForbiddenError("You are not authorized to access this user's data");
  }

  const fn = unstable_cache(
    async (id: string) => {
      return await db
        .select()
        .from(lists)
        .where(eq(lists.userId, id))
        .orderBy(lists.position, lists.createdAt);
    },
    ["lists"],
    { tags: [`lists-${userId}`] }
  );
  return fn(userId);
});

/**
 * Internal implementation for reordering lists.
 *
 * @param userId - The ID of the user who owns the lists
 * @param items - Array of list IDs and their new positions
 */
async function reorderListsImpl(userId: string, items: { id: number; position: number }[]) {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError();
  }
  if (user.id !== userId) {
    throw new ForbiddenError("You are not authorized to access this user's data");
  }

  // Update updates in a transaction or batch would be ideal, 
  // but for now we'll do promise.all since Drizzle standard batching varies by driver
  // and Neon driver supports valid connection pooling.
  await Promise.all(
    items.map((item) =>
      db
        .update(lists)
        .set({ position: item.position })
        .where(and(eq(lists.id, item.id), eq(lists.userId, userId)))
    )
  );

  await logActivity({
    userId,
    action: "list_updated",
    details: `Reordered ${items.length} lists`,
  });
  revalidateTag(`lists-${userId}`, 'max');
  // Also revalidate path to ensure client router cache is updated for side effects
  revalidatePath("/", "layout");
}

/**
 * Reorders lists.
 *
 * @param userId - The ID of the user who owns the lists
 * @param items - Array of list IDs and their new positions
 * @returns ActionResult with void on success or error
 */
export const reorderLists: (
  userId: string,
  items: { id: number; position: number }[]
) => Promise<ActionResult<void>> = withErrorHandling(reorderListsImpl);

/**
 * Retrieves a single list by ID for a specific user.
 *
 * @param id - The list ID
 * @param userId - The ID of the user who owns the list
 * @returns The list if found, undefined otherwise
 */
export async function getList(id: number, userId: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError();
  }
  if (user.id !== userId) {
    throw new ForbiddenError("You are not authorized to access this user's data");
  }

  const result = await db
    .select()
    .from(lists)
    .where(and(eq(lists.id, id), eq(lists.userId, userId)));
  return result[0];
}

/**
 * Internal implementation for creating a new list.
 *
 * @param data - The list data to insert
 * @returns The created list
 * @throws {ValidationError} When required fields are missing
 */
async function createListImpl(data: typeof lists.$inferInsert) {
  if (!data.name || data.name.trim().length === 0) {
    throw new ValidationError("List name is required", { name: "Name cannot be empty" });
  }
  if (!data.userId) {
    throw new ValidationError("User ID is required", { userId: "User ID cannot be empty" });
  }

  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError();
  }
  if (user.id !== data.userId) {
    throw new ForbiddenError("You are not authorized to access this user's data");
  }

  const result = await db.insert(lists).values(data).returning();

  await logActivity({
    userId: data.userId,
    action: "list_created",
    listId: result[0].id,
    details: `Created list: ${result[0].name}`,
  });

  revalidateTag(`lists-${data.userId}`, 'max');
  revalidatePath("/", "layout");
  return result[0];
}

/**
 * Creates a new list.
 *
 * @param data - The list data including name, color, icon, and userId
 * @returns ActionResult with created list or error
 * @throws {VALIDATION_ERROR} When name is empty or userId is missing
 * @throws {DATABASE_ERROR} When database operation fails
 */
export const createList: (
  data: typeof lists.$inferInsert
) => Promise<ActionResult<typeof lists.$inferSelect>> = withErrorHandling(createListImpl);

/**
 * Internal implementation for updating an existing list.
 *
 * @param id - The list ID to update
 * @param userId - The ID of the user who owns the list
 * @param data - The partial list data to update
 */
async function updateListImpl(
  id: number,
  userId: string,
  data: Partial<Omit<typeof lists.$inferInsert, "userId">>
) {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError();
  }
  if (user.id !== userId) {
    throw new ForbiddenError("You are not authorized to access this user's data");
  }

  if (data.name !== undefined && data.name.trim().length === 0) {
    throw new ValidationError("List name cannot be empty", { name: "Name cannot be empty" });
  }

  // Get current list state for logging
  const currentList = await getList(id, userId);

  await db
    .update(lists)
    .set(data)
    .where(and(eq(lists.id, id), eq(lists.userId, userId)));

  if (currentList) {
    await logActivity({
      userId,
      action: "list_updated",
      listId: id,
      details: `Updated list: ${currentList.name}${data.name && data.name !== currentList.name ? ` to ${data.name}` : ""}`,
    });
  }

  revalidateTag(`lists-${userId}`, 'max');
  revalidatePath("/", "layout");
}

/**
 * Updates an existing list.
 *
 * @param id - The list ID to update
 * @param userId - The ID of the user who owns the list
 * @param data - The partial list data to update (name, color, icon)
 * @returns ActionResult with void on success or error
 * @throws {VALIDATION_ERROR} When name is empty
 * @throws {DATABASE_ERROR} When database operation fails
 */
export const updateList: (
  id: number,
  userId: string,
  data: Partial<Omit<typeof lists.$inferInsert, "userId">>
) => Promise<ActionResult<void>> = withErrorHandling(updateListImpl);

/**
 * Internal implementation for deleting a list.
 *
 * @param id - The list ID to delete
 * @param userId - The ID of the user who owns the list
 */
async function deleteListImpl(id: number, userId: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError();
  }
  if (user.id !== userId) {
    throw new ForbiddenError("You are not authorized to access this user's data");
  }

  const currentList = await getList(id, userId);

  await db.delete(lists).where(and(eq(lists.id, id), eq(lists.userId, userId)));

  if (currentList) {
    await logActivity({
      userId,
      action: "list_deleted",
      details: `Deleted list: ${currentList.name}`,
    });
  }

  revalidateTag(`lists-${userId}`, 'max');
  revalidatePath("/", "layout");
}

/**
 * Deletes a list.
 *
 * @param id - The list ID to delete
 * @param userId - The ID of the user who owns the list
 * @returns ActionResult with void on success or error
 * @throws {DATABASE_ERROR} When database operation fails
 */
export const deleteList: (
  id: number,
  userId: string
) => Promise<ActionResult<void>> = withErrorHandling(deleteListImpl);
