/**
 * @module actions/view-settings
 * @description Server Actions for view settings management.
 * View settings store user preferences for how tasks are displayed in different views.
 */
"use server";

import {
  db,
  viewSettings,
  eq,
  and,
  revalidatePath,
  type ActionResult,
  withErrorHandling,
  ValidationError,
} from "./shared";

/**
 * View settings configuration type.
 */
export type ViewSettingsConfig = {
  layout?: "list" | "board" | "calendar";
  showCompleted?: boolean;
  groupBy?: "none" | "dueDate" | "priority" | "label";
  sortBy?: "manual" | "dueDate" | "priority" | "name";
  sortOrder?: "asc" | "desc";
  filterDate?: "all" | "hasDate" | "noDate";
  filterPriority?: string | null;
  filterLabelId?: number | null;
};

/**
 * Retrieves view settings for a specific user and view.
 *
 * @param userId - The ID of the user
 * @param viewId - The ID of the view (e.g., "inbox", "today", "upcoming")
 * @returns The view settings if found, null otherwise
 */
export async function getViewSettings(userId: string, viewId: string) {
  const result = await db
    .select()
    .from(viewSettings)
    .where(and(eq(viewSettings.userId, userId), eq(viewSettings.viewId, viewId)));
  return result[0] || null;
}

/**
 * Internal implementation for saving view settings.
 *
 * @param userId - The ID of the user
 * @param viewId - The ID of the view
 * @param settings - The settings to save
 * @throws {ValidationError} When required fields are missing
 */
async function saveViewSettingsImpl(userId: string, viewId: string, settings: ViewSettingsConfig) {
  if (!userId) {
    throw new ValidationError("User ID is required", { userId: "User ID cannot be empty" });
  }
  if (!viewId) {
    throw new ValidationError("View ID is required", { viewId: "View ID cannot be empty" });
  }

  const existing = await getViewSettings(userId, viewId);

  if (existing) {
    await db
      .update(viewSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(and(eq(viewSettings.userId, userId), eq(viewSettings.viewId, viewId)));
  } else {
    await db.insert(viewSettings).values({
      userId,
      viewId,
      ...settings,
    });
  }

  revalidatePath("/");
}

/**
 * Saves view settings for a specific user and view.
 *
 * @param userId - The ID of the user
 * @param viewId - The ID of the view (e.g., "inbox", "today", "upcoming")
 * @param settings - The settings to save
 * @returns ActionResult with void on success or error
 * @throws {VALIDATION_ERROR} When required fields are missing
 * @throws {DATABASE_ERROR} When database operation fails
 */
export const saveViewSettings: (
  userId: string,
  viewId: string,
  settings: ViewSettingsConfig
) => Promise<ActionResult<void>> = withErrorHandling(saveViewSettingsImpl);

/**
 * Internal implementation for resetting view settings.
 *
 * @param userId - The ID of the user
 * @param viewId - The ID of the view
 */
async function resetViewSettingsImpl(userId: string, viewId: string) {
  await db
    .delete(viewSettings)
    .where(and(eq(viewSettings.userId, userId), eq(viewSettings.viewId, viewId)));
  revalidatePath("/");
}

/**
 * Resets view settings to defaults by deleting the stored settings.
 *
 * @param userId - The ID of the user
 * @param viewId - The ID of the view (e.g., "inbox", "today", "upcoming")
 * @returns ActionResult with void on success or error
 * @throws {DATABASE_ERROR} When database operation fails
 */
export const resetViewSettings: (
  userId: string,
  viewId: string
) => Promise<ActionResult<void>> = withErrorHandling(resetViewSettingsImpl);
