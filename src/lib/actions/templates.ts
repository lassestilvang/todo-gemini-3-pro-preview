/**
 * @module actions/templates
 * @description Server Actions for task template management.
 * Templates allow users to create reusable task structures with variable substitution.
 */
"use server";

import {
  db,
  templates,
  eq,
  and,
  desc,
  addDays,
  revalidatePath,
  type ActionResult,
  withErrorHandling,
  ValidationError,
  NotFoundError,
} from "./shared";

import { requireUser } from "@/lib/auth";

// Import createTask for template instantiation
import { createTask } from "./tasks";

/**
 * Retrieves all templates for a specific user.
 *
 * @param userId - The ID of the user whose templates to retrieve
 * @returns Array of templates ordered by creation date (newest first)
 */
export async function getTemplates(userId: string) {
  // Validate that the requester is the same as the requested userId
  await requireUser(userId);

  return await db
    .select()
    .from(templates)
    .where(eq(templates.userId, userId))
    .orderBy(desc(templates.createdAt));
}

/**
 * Internal implementation for creating a new template.
 *
 * @param userId - The ID of the user creating the template
 * @param name - The name of the template
 * @param content - The JSON content of the template
 * @throws {ValidationError} When required fields are missing
 */
async function createTemplateImpl(userId: string, name: string, content: string) {
  // Validate that the requester is the same as the userId passed in
  await requireUser(userId);

  if (!userId) {
    throw new ValidationError("User ID is required", { userId: "User ID cannot be empty" });
  }
  if (!name || name.trim().length === 0) {
    throw new ValidationError("Template name is required", { name: "Name cannot be empty" });
  }
  if (!content) {
    throw new ValidationError("Template content is required", { content: "Content cannot be empty" });
  }

  await db.insert(templates).values({
    userId,
    name,
    content,
  });
  revalidatePath("/");
}

/**
 * Creates a new template.
 *
 * @param userId - The ID of the user creating the template
 * @param name - The name of the template
 * @param content - The JSON content of the template
 * @returns ActionResult with void on success or error
 * @throws {VALIDATION_ERROR} When required fields are missing
 * @throws {DATABASE_ERROR} When database operation fails
 */
export const createTemplate: (
  userId: string,
  name: string,
  content: string
) => Promise<ActionResult<void>> = withErrorHandling(createTemplateImpl);

/**
 * Internal implementation for deleting a template.
 *
 * @param id - The template ID to delete
 * @param userId - The ID of the user who owns the template
 */
async function deleteTemplateImpl(id: number, userId: string) {
  // Validate that the requester is the same as the userId passed in
  await requireUser(userId);
  await db.delete(templates).where(and(eq(templates.id, id), eq(templates.userId, userId)));
  revalidatePath("/");
}

/**
 * Deletes a template.
 *
 * @param id - The template ID to delete
 * @param userId - The ID of the user who owns the template
 * @returns ActionResult with void on success or error
 * @throws {DATABASE_ERROR} When database operation fails
 */
export const deleteTemplate: (
  id: number,
  userId: string
) => Promise<ActionResult<void>> = withErrorHandling(deleteTemplateImpl);

/**
 * Internal implementation for updating a template.
 *
 * @param id - The template ID to update
 * @param userId - The ID of the user who owns the template
 * @param name - The new name of the template
 * @param content - The new JSON content of the template
 * @throws {ValidationError} When required fields are missing
 * @throws {NotFoundError} When template is not found or user doesn't own it
 */
async function updateTemplateImpl(id: number, userId: string, name: string, content: string) {
  // Validate that the requester is the same as the userId passed in
  await requireUser(userId);

  if (!userId) {
    throw new ValidationError("User ID is required", { userId: "User ID cannot be empty" });
  }
  if (!name || name.trim().length === 0) {
    throw new ValidationError("Template name is required", { name: "Name cannot be empty" });
  }
  if (!content) {
    throw new ValidationError("Template content is required", { content: "Content cannot be empty" });
  }

  // First verify the template exists and belongs to the user
  const existing = await db
    .select()
    .from(templates)
    .where(and(eq(templates.id, id), eq(templates.userId, userId)))
    .limit(1);

  if (existing.length === 0) {
    // If it doesn't exist for this user, it's either not found or not owned by them
    // For security, we just say not found (or forbidden if we checked ownership separately)
    // But since the query filters by userId, we can just say NotFound.
    // However, if we wanted to be strict about IDOR, we could check if it exists at all.
    // But standard practice is usually to filter by owner.
    throw new NotFoundError("Template not found");
  }

  await db
    .update(templates)
    .set({
      name,
      content,
    })
    .where(and(eq(templates.id, id), eq(templates.userId, userId)));

  revalidatePath("/");
}

/**
 * Updates an existing template.
 *
 * @param id - The template ID to update
 * @param userId - The ID of the user who owns the template
 * @param name - The new name of the template
 * @param content - The new JSON content of the template
 * @returns ActionResult with void on success or error
 * @throws {VALIDATION_ERROR} When required fields are missing
 * @throws {NOT_FOUND} When template is not found or user doesn't own it
 * @throws {DATABASE_ERROR} When database operation fails
 */
export const updateTemplate: (
  id: number,
  userId: string,
  name: string,
  content: string
) => Promise<ActionResult<void>> = withErrorHandling(updateTemplateImpl);

/**
 * Helper to replace variables in strings.
 *
 * @param str - The string to process
 * @returns The string with variables replaced
 */
function replaceVariables(str: string): string {
  if (typeof str !== "string") return str;
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const tomorrow = addDays(now, 1).toISOString().split("T")[0];
  const nextWeek = addDays(now, 7).toISOString().split("T")[0];

  return str
    .replace(/{date}/g, today)
    .replace(/{tomorrow}/g, tomorrow)
    .replace(/{next_week}/g, nextWeek);
}

/**
 * Internal implementation for instantiating a template.
 *
 * @param userId - The ID of the user instantiating the template
 * @param templateId - The ID of the template to instantiate
 * @param listId - Optional list ID to assign to created tasks
 * @throws {NotFoundError} When template is not found
 */
async function instantiateTemplateImpl(
  userId: string,
  templateId: number,
  listId: number | null = null
) {
  // Validate that the requester is the same as the userId passed in
  await requireUser(userId);

  const template = await db
    .select()
    .from(templates)
    .where(and(eq(templates.id, templateId), eq(templates.userId, userId)))
    .limit(1);

  if (template.length === 0) {
    throw new NotFoundError("Template not found");
  }

  const data = JSON.parse(template[0].content);

  // Helper to recursively create tasks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function createRecursive(taskData: any, parentId: number | null = null) {
    const { subtasks, ...rest } = taskData;

    // Process string fields for variables
    const processedData = { ...rest };
    if (processedData.title) processedData.title = replaceVariables(processedData.title);
    if (processedData.description)
      processedData.description = replaceVariables(processedData.description);

    // Clean up data for insertion
    const insertData = {
      ...processedData,
      userId,
      listId: parentId ? null : listId || processedData.listId, // Only top-level tasks get the listId override
      parentId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Remove fields that shouldn't be directly inserted
    delete insertData.id;
    delete insertData.subtasks;
    delete insertData.isCompleted;
    delete insertData.completedAt;

    // Handle dates if they are strings after substitution
    if (typeof insertData.dueDate === "string") {
      insertData.dueDate = new Date(insertData.dueDate);
    }
    if (typeof insertData.deadline === "string") {
      insertData.deadline = new Date(insertData.deadline);
    }

    const createResult = await createTask(insertData);
    if (!createResult.success) {
      if (createResult.error.code === "VALIDATION_ERROR") {
        throw new ValidationError(
          createResult.error.message,
          createResult.error.details ?? {}
        );
      }
      if (createResult.error.code === "NOT_FOUND") {
        throw new NotFoundError(createResult.error.message);
      }
      throw new Error(createResult.error.message);
    }
    const newTask = createResult.data;

    if (subtasks && Array.isArray(subtasks)) {
      // ⚡ Bolt Opt: Create sibling subtasks in parallel to reduce template instantiation latency.
      await Promise.all(subtasks.map((sub) => createRecursive(sub, newTask.id)));
    }
    return newTask;
  }

  await createRecursive(data);
  revalidatePath("/");
}

/**
 * Instantiates a template, creating tasks from its content.
 *
 * @param userId - The ID of the user instantiating the template
 * @param templateId - The ID of the template to instantiate
 * @param listId - Optional list ID to assign to created tasks
 * @returns ActionResult with void on success or error
 * @throws {NOT_FOUND} When template is not found
 * @throws {DATABASE_ERROR} When database operation fails
 */
export const instantiateTemplate: (
  userId: string,
  templateId: number,
  listId?: number | null
) => Promise<ActionResult<void>> = withErrorHandling(instantiateTemplateImpl);
