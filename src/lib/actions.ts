// This file re-exports all Server Actions from domain modules
// Each domain module has its own "use server" directive

// Re-export all domain module functions
// Lists
export {
  getLists,
  getList,
  createList,
  updateList,
  deleteList,
} from "./actions/lists";

// Labels
export {
  getLabels,
  getLabel,
  createLabel,
  updateLabel,
  deleteLabel,
} from "./actions/labels";

// Reminders
export {
  getReminders,
  createReminder,
  deleteReminder,
} from "./actions/reminders";

// Dependencies
export {
  addDependency,
  removeDependency,
  getBlockers,
  getBlockedTasks,
} from "./actions/dependencies";

// Logs
export { getTaskLogs, getActivityLog } from "./actions/logs";

// View Settings
export {
  getViewSettings,
  saveViewSettings,
  resetViewSettings,
} from "./actions/view-settings";

// Templates
export {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  instantiateTemplate,
} from "./actions/templates";

// Gamification
export {
  getUserStats,
  addXP,
  checkAchievements,
  getAchievements,
  getUserAchievements,
} from "./actions/gamification";

// Tasks
export {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskCompletion,
  updateStreak,
  getSubtasks,
  createSubtask,
  updateSubtask,
  deleteSubtask,
  searchTasks,
} from "./actions/tasks";

// Safe aliases for backward compatibility
export { createList as createListSafe } from "./actions/lists";
export { updateList as updateListSafe } from "./actions/lists";
export { deleteList as deleteListSafe } from "./actions/lists";
export { createLabel as createLabelSafe } from "./actions/labels";
export { updateLabel as updateLabelSafe } from "./actions/labels";
export { deleteLabel as deleteLabelSafe } from "./actions/labels";
export * from "./actions/views";
export * from "./action-result";

// Task Safe functions with custom validation (re-exported from task-safe module)
export {
  createTaskSafe,
  updateTaskSafe,
  deleteTaskSafe,
  toggleTaskCompletionSafe,
} from "./actions/task-safe";
