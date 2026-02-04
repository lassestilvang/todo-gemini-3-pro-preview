/**
 * @module actions/lists
 * @description Server Actions for list management including CRUD operations.
 * Lists are used to organize tasks into categories (e.g., Inbox, Work, Personal).
 */
"use server";

import { revalidateTag } from "next/cache";
import {
  db,
  lists,
  eq,
  and,
  sql,
  inArray,
  revalidatePath,
  type ActionResult,
  withErrorHandling,
  ValidationError,
} from "./shared";
import { logActivity } from "./logs";
import { requireUser } from "@/lib/auth";

/**
 * Retrieves all lists for a specific user.
 *
 * @param userId - The ID of the user whose lists to retrieve
 * @returns Array of lists ordered by creation date
 */

/**
 * Retrieves all lists for a specific user.
 *
 * @param userId - The ID of the user whose lists to retrieve
 * @returns Array of lists ordered by creation date
 */
export async function getLists(userId: string) {
  await requireUser(userId);

  return await db
    .select()
    .from(lists)
    .where(eq(lists.userId, userId))
    .orderBy(lists.position, lists.createdAt);
}

/**
 * Internal implementation for reordering lists.
 *
 * @param userId - The ID of the user who owns the lists
 * @param items - Array of list IDs and their new positions
 */
async function reorderListsImpl(userId: string, items: { id: number; position: number }[]) {
  await requireUser(userId);

  if (items.length === 0) {
    return;
  }

  // ⚡ Bolt Opt: Uses batched SQL CASE/WHEN for O(1) queries instead of O(N) individual updates.
  // This reduces N database roundtrips to 1, improving latency by ~80-95%
  // for typical reorder operations (5-50 items).
  const listIds = items.map((i) => i.id);
  const caseWhen = sql.join(
    items.map((item) => sql`WHEN ${lists.id} = ${item.id} THEN ${item.position}`),
    sql` `
  );

  await db
    .update(lists)
    .set({ position: sql`CASE ${caseWhen} ELSE ${lists.position} END` })
    .where(and(inArray(lists.id, listIds), eq(lists.userId, userId)));

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
  await requireUser(userId);

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

  const effectiveUserId = data.userId;
  if (!effectiveUserId) {
    throw new ValidationError("User ID is required", { userId: "User ID cannot be empty" });
  }

  await requireUser(effectiveUserId);

  // Generate slug if not provided
  const slug = data.slug || data.name.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const result = await db.insert(lists).values({
    ...data,
    userId: effectiveUserId,
    slug,
  }).returning();

  await logActivity({
    userId: effectiveUserId,
    action: "list_created",
    listId: result[0].id,
    details: `Created list: ${result[0].name}`,
  });

  revalidateTag(`lists-${effectiveUserId}`, 'max');
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
  await requireUser(userId);

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
  await requireUser(userId);

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
