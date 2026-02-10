/**
 * Template Form Utilities
 * Provides interfaces and functions for form-based template creation/editing
 */

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Form data for a subtask within a template
 */
export interface SubtaskFormData {
  id: string; // Client-side ID for React key
  title: string;
  description: string;
}

/**
 * Form data for the template form
 */
export interface TemplateFormData {
  name: string;
  title: string;
  description: string;
  priority: "none" | "low" | "medium" | "high";
  dueDateType: "none" | "today" | "tomorrow" | "next_week" | "custom";
  dueDateDays?: number; // For custom relative days
  dueDatePrecision?: "day" | "week" | "month" | "year";
  energyLevel: "none" | "low" | "medium" | "high";
  context: "none" | "computer" | "phone" | "errands" | "meeting" | "home" | "anywhere";
  estimateMinutes?: number;
  subtasks: SubtaskFormData[];
}

/**
 * Validation errors for the template form
 */
export interface ValidationErrors {
  name?: string;
  title?: string;
  [key: string]: string | undefined;
}

/**
 * JSON content structure stored in the database
 */
export interface TemplateContent {
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high";
  dueDate?: string; // Variable like "{date}" or "{tomorrow}" or "+Nd"
  dueDatePrecision?: "day" | "week" | "month" | "year";
  energyLevel?: "low" | "medium" | "high";
  context?: "computer" | "phone" | "errands" | "meeting" | "home" | "anywhere";
  estimateMinutes?: number;
  subtasks?: Array<{
    title: string;
    description?: string;
  }>;
}


// ============================================================================
// Serialization Functions
// ============================================================================

/**
 * Serialize form data to JSON string for database storage
 * Handles due date type conversion to variables ({date}, {tomorrow}, {next_week})
 * Includes subtasks in output
 */
export function serializeFormToJson(data: TemplateFormData): string {
  const content: TemplateContent = {
    title: data.title,
  };

  if (data.description) {
    content.description = data.description;
  }

  if (data.priority !== "none") {
    content.priority = data.priority;
  }

  if (data.energyLevel !== "none") {
    content.energyLevel = data.energyLevel;
  }

  if (data.context !== "none") {
    content.context = data.context;
  }

  if (data.estimateMinutes !== undefined && data.estimateMinutes > 0) {
    content.estimateMinutes = data.estimateMinutes;
  }

  // Handle due date type conversion to variables
  switch (data.dueDateType) {
    case "today":
      content.dueDate = "{date}";
      break;
    case "tomorrow":
      content.dueDate = "{tomorrow}";
      break;
    case "next_week":
      content.dueDate = "{next_week}";
      break;
    case "custom":
      if (data.dueDateDays !== undefined && data.dueDateDays > 0) {
        content.dueDate = `+${data.dueDateDays}d`;
      }
      break;
  }

  if (data.dueDateType !== "none" && data.dueDatePrecision && data.dueDatePrecision !== "day") {
    content.dueDatePrecision = data.dueDatePrecision;
  }

  // Include subtasks with non-empty titles
  if (data.subtasks.length > 0) {
    const validSubtasks = data.subtasks
      .filter((s) => s.title.trim())
      .map((s) => ({
        title: s.title,
        ...(s.description && { description: s.description }),
      }));

    if (validSubtasks.length > 0) {
      content.subtasks = validSubtasks;
    }
  }

  return JSON.stringify(content);
}


/**
 * Deserialize JSON content to form data structure
 * Handles variable placeholders in due date
 * Returns null for malformed JSON
 */
export function deserializeJsonToForm(json: string): Omit<TemplateFormData, "name"> | null {
  try {
    const content = JSON.parse(json) as TemplateContent;

    // Validate required field
    if (!content.title || typeof content.title !== "string") {
      return null;
    }

    let dueDateType: TemplateFormData["dueDateType"] = "none";
    let dueDateDays: number | undefined;

    if (content.dueDate) {
      if (content.dueDate === "{date}") {
        dueDateType = "today";
      } else if (content.dueDate === "{tomorrow}") {
        dueDateType = "tomorrow";
      } else if (content.dueDate === "{next_week}") {
        dueDateType = "next_week";
      } else if (content.dueDate.startsWith("+") && content.dueDate.endsWith("d")) {
        dueDateType = "custom";
        const days = parseInt(content.dueDate.slice(1, -1), 10);
        if (!isNaN(days) && days > 0) {
          dueDateDays = days;
        }
      }
    }

    return {
      title: content.title,
      description: content.description || "",
      priority: content.priority || "none",
      dueDateType,
      dueDateDays,
      dueDatePrecision: content.dueDatePrecision || "day",
      energyLevel: content.energyLevel || "none",
      context: content.context || "none",
      estimateMinutes: content.estimateMinutes,
      subtasks: (content.subtasks || []).map((s, i) => ({
        id: `subtask-${i}`,
        title: s.title,
        description: s.description || "",
      })),
    };
  } catch {
    return null;
  }
}


// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate template form data
 * Returns ValidationErrors object with error messages for invalid fields
 */
export function validateTemplateForm(data: TemplateFormData): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!data.name.trim()) {
    errors.name = "Template name is required";
  }

  if (!data.title.trim()) {
    errors.title = "Task title is required";
  }

  return errors;
}

/**
 * Check if validation errors object has any errors
 */
export function hasValidationErrors(errors: ValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Create an empty form data object with default values
 */
export function createEmptyFormData(): TemplateFormData {
  return {
    name: "",
    title: "",
    description: "",
    priority: "none",
    dueDateType: "none",
    dueDateDays: undefined,
    dueDatePrecision: "day",
    energyLevel: "none",
    context: "none",
    estimateMinutes: undefined,
    subtasks: [],
  };
}
