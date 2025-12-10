/**
 * @module actions
 * @description Barrel export for all Server Actions. This module re-exports
 * all domain-specific Server Actions for backward compatibility.
 *
 * Import from this module to access any Server Action:
 * ```typescript
 * import { createTask, getLists, getLabels } from "@/lib/actions";
 * ```
 */

// Domain-specific modules
export * from "./lists";
export * from "./labels";
export * from "./reminders";
export * from "./dependencies";
export * from "./logs";
export * from "./view-settings";
export * from "./templates";
export * from "./gamification";
export * from "./tasks";

// Re-export Safe versions for backward compatibility
// These are aliases to the domain module functions which already use withErrorHandling
export { createList as createListSafe } from "./lists";
export { updateList as updateListSafe } from "./lists";
export { deleteList as deleteListSafe } from "./lists";
export { createLabel as createLabelSafe } from "./labels";
export { updateLabel as updateLabelSafe } from "./labels";
export { deleteLabel as deleteLabelSafe } from "./labels";

// Re-export task Safe functions (these have custom validation logic)
export {
  createTaskSafe,
  updateTaskSafe,
  deleteTaskSafe,
  toggleTaskCompletionSafe,
} from "./task-safe";
