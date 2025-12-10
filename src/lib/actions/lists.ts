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

/**
 * Retrieves all lists for a specific user.
 *
 * @param userId - The ID of the user whose lists to retrieve
 * @returns Array of lists ordered by creation date
 */
export async function getLists(userId: string) {
  return await db
    .select()
    .from(lists)
    .where(eq(lists.userId, userId))
    .orderBy(lists.createdAt);
}

/**
 * Retrieves a single list by ID for a specific user.
 *
 * @param id - The list ID
 * @param userId - The ID of the user who owns the list
 * @returns The list if found, undefined otherwise
 */
export async function getList(id: number, userId: string) {
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

  const result = await db.insert(lists).values(data).returning();
  revalidatePath("/");
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
  if (data.name !== undefined && data.name.trim().length === 0) {
    throw new ValidationError("List name cannot be empty", { name: "Name cannot be empty" });
  }

  await db
    .update(lists)
    .set(data)
    .where(and(eq(lists.id, id), eq(lists.userId, userId)));
  revalidatePath("/");
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
  await db.delete(lists).where(and(eq(lists.id, id), eq(lists.userId, userId)));
  revalidatePath("/");
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
