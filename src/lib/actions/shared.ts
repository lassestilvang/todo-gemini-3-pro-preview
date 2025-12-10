/**
 * @module actions/shared
 * @description Shared utilities, imports, and helpers for Server Action modules.
 * This module centralizes common dependencies to reduce duplication across domain modules.
 */

// Database and schema exports
export {
  db,
  lists,
  tasks,
  labels,
  taskLogs,
  taskLabels,
  reminders,
  taskDependencies,
  templates,
  userStats,
  achievements,
  userAchievements,
  viewSettings,
} from "@/db";

// Drizzle ORM operators
export {
  eq,
  and,
  desc,
  asc,
  gte,
  lte,
  inArray,
  sql,
  isNull,
} from "drizzle-orm";

// Next.js cache utilities
export { revalidatePath } from "next/cache";

// Date utilities
export {
  startOfDay,
  endOfDay,
  addDays,
} from "date-fns";

// Action result types and helpers
export {
  type ActionResult,
  type ActionError,
  type ErrorCode,
  success,
  failure,
  withErrorHandling,
  ValidationError,
  AuthorizationError,
  NotFoundError,
  DatabaseError,
  NetworkError,
  isSuccess,
  isFailure,
  sanitizeError,
  ERROR_CODE_MAP,
} from "../action-result";

// Gamification utilities
export {
  calculateLevel,
  calculateStreakUpdate,
} from "../gamification";

// Smart tagging utilities
export { suggestMetadata } from "../smart-tags";
