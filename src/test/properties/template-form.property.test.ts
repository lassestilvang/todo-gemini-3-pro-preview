import { describe, it, expect } from "bun:test";
import * as fc from "fast-check";
import {
  serializeFormToJson,
  deserializeJsonToForm,
  validateTemplateForm,
  type TemplateFormData,
  type SubtaskFormData,
} from "@/lib/template-form-utils";

// Configure fast-check for reproducibility in CI
const FAST_CHECK_SEED = process.env.FAST_CHECK_SEED
  ? parseInt(process.env.FAST_CHECK_SEED, 10)
  : undefined;

fc.configureGlobal({
  numRuns: 100,
  verbose: false,
  seed: FAST_CHECK_SEED,
});

// Arbitrary for priority values
const priorityArb = fc.constantFrom<TemplateFormData["priority"]>(
  "none",
  "low",
  "medium",
  "high"
);

// Arbitrary for due date type values
const dueDateTypeArb = fc.constantFrom<TemplateFormData["dueDateType"]>(
  "none",
  "today",
  "tomorrow",
  "next_week",
  "custom"
);

// Arbitrary for energy level values
const energyLevelArb = fc.constantFrom<TemplateFormData["energyLevel"]>(
  "none",
  "low",
  "medium",
  "high"
);

// Arbitrary for context values
const contextArb = fc.constantFrom<TemplateFormData["context"]>(
  "none",
  "computer",
  "phone",
  "errands",
  "meeting",
  "home",
  "anywhere"
);

// Arbitrary for subtask form data
const subtaskFormDataArb: fc.Arbitrary<SubtaskFormData> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ minLength: 0, maxLength: 200 }),
});

// Arbitrary for template form data (excluding name since it's not serialized)
const templateFormDataArb: fc.Arbitrary<TemplateFormData> = fc
  .record({
    name: fc.string({ minLength: 1, maxLength: 50 }),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    description: fc.string({ minLength: 0, maxLength: 500 }),
    priority: priorityArb,
    dueDateType: dueDateTypeArb,
    energyLevel: energyLevelArb,
    context: contextArb,
    estimateMinutes: fc.option(fc.integer({ min: 1, max: 480 }), { nil: undefined }),
    subtasks: fc.array(subtaskFormDataArb, { minLength: 0, maxLength: 5 }),
  })
  .chain((data) => {
    // Generate dueDateDays only when dueDateType is "custom"
    if (data.dueDateType === "custom") {
      return fc.integer({ min: 1, max: 365 }).map((days) => ({
        ...data,
        dueDateDays: days,
      }));
    }
    return fc.constant({ ...data, dueDateDays: undefined });
  });

describe("Property Tests: Template Form Utilities", () => {
  /**
   * **Feature: template-form-interface, Property 1: Serialization Round-Trip**
   * **Validates: Requirements 1.3, 2.6, 3.2, 4.2**
   *
   * For any valid TemplateFormData (including subtasks and variable placeholders),
   * serializing to JSON and then deserializing back to form data SHALL produce
   * an equivalent TemplateFormData object.
   */
  describe("Property 1: Serialization Round-Trip", () => {
    it("serialize then deserialize produces equivalent form data", () => {
      fc.assert(
        fc.property(templateFormDataArb, (formData) => {
          // Serialize to JSON
          const json = serializeFormToJson(formData);

          // Deserialize back to form data
          const deserialized = deserializeJsonToForm(json);

          // Should not return null for valid input
          expect(deserialized).not.toBeNull();

          if (deserialized) {
            // Title should match
            expect(deserialized.title).toBe(formData.title);

            // Description should match
            expect(deserialized.description).toBe(formData.description || "");

            // Priority should match (none becomes undefined in JSON, then back to none)
            if (formData.priority === "none") {
              expect(deserialized.priority).toBe("none");
            } else {
              expect(deserialized.priority).toBe(formData.priority);
            }

            // Due date type should match
            expect(deserialized.dueDateType).toBe(formData.dueDateType);

            // Due date days should match for custom type
            if (formData.dueDateType === "custom" && formData.dueDateDays) {
              expect(deserialized.dueDateDays).toBe(formData.dueDateDays);
            }

            // Energy level should match
            if (formData.energyLevel === "none") {
              expect(deserialized.energyLevel).toBe("none");
            } else {
              expect(deserialized.energyLevel).toBe(formData.energyLevel);
            }

            // Context should match
            if (formData.context === "none") {
              expect(deserialized.context).toBe("none");
            } else {
              expect(deserialized.context).toBe(formData.context);
            }

            // Estimate minutes should match
            if (formData.estimateMinutes && formData.estimateMinutes > 0) {
              expect(deserialized.estimateMinutes).toBe(formData.estimateMinutes);
            }

            // Subtasks with non-empty titles should be preserved
            const validSubtasks = formData.subtasks.filter((s) => s.title.trim());
            expect(deserialized.subtasks.length).toBe(validSubtasks.length);

            // Each subtask title and description should match
            validSubtasks.forEach((original, i) => {
              expect(deserialized.subtasks[i].title).toBe(original.title);
              expect(deserialized.subtasks[i].description).toBe(original.description || "");
            });
          }
        })
      );
    });

    it("due date variables are correctly serialized and deserialized", () => {
      fc.assert(
        fc.property(
          fc.constantFrom<TemplateFormData["dueDateType"]>("today", "tomorrow", "next_week"),
          (dueDateType) => {
            const formData: TemplateFormData = {
              name: "Test Template",
              title: "Test Task",
              description: "",
              priority: "none",
              dueDateType,
              energyLevel: "none",
              context: "none",
              subtasks: [],
            };

            const json = serializeFormToJson(formData);
            const parsed = JSON.parse(json);

            // Check the variable is correctly set
            const expectedVariable =
              dueDateType === "today"
                ? "{date}"
                : dueDateType === "tomorrow"
                  ? "{tomorrow}"
                  : "{next_week}";
            expect(parsed.dueDate).toBe(expectedVariable);

            // Deserialize and verify
            const deserialized = deserializeJsonToForm(json);
            expect(deserialized?.dueDateType).toBe(dueDateType);
          }
        )
      );
    });

    it("custom due date days are correctly serialized and deserialized", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 365 }), (days) => {
          const formData: TemplateFormData = {
            name: "Test Template",
            title: "Test Task",
            description: "",
            priority: "none",
            dueDateType: "custom",
            dueDateDays: days,
            energyLevel: "none",
            context: "none",
            subtasks: [],
          };

          const json = serializeFormToJson(formData);
          const parsed = JSON.parse(json);

          // Check the format is correct
          expect(parsed.dueDate).toBe(`+${days}d`);

          // Deserialize and verify
          const deserialized = deserializeJsonToForm(json);
          expect(deserialized?.dueDateType).toBe("custom");
          expect(deserialized?.dueDateDays).toBe(days);
        })
      );
    });
  });


  /**
   * **Feature: template-form-interface, Property 2: Name Validation**
   * **Validates: Requirements 1.2, 6.1**
   *
   * For any string input as template name, the validation function SHALL return
   * an error if and only if the trimmed string is empty.
   */
  describe("Property 2: Name Validation", () => {
    it("empty or whitespace-only names produce validation error", () => {
      // Generate whitespace-only strings
      const whitespaceArb = fc
        .array(fc.constantFrom(" ", "\t", "\n", "\r"), { minLength: 0, maxLength: 10 })
        .map((chars) => chars.join(""));

      fc.assert(
        fc.property(whitespaceArb, (whitespaceString: string) => {
          const formData: TemplateFormData = {
            name: whitespaceString,
            title: "Valid Title",
            description: "",
            priority: "none",
            dueDateType: "none",
            energyLevel: "none",
            context: "none",
            subtasks: [],
          };

          const errors = validateTemplateForm(formData);

          // Should have name error
          expect(errors.name).toBeDefined();
          expect(errors.name).toBe("Template name is required");
        })
      );
    });

    it("non-empty trimmed names do not produce validation error", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
          (validName) => {
            const formData: TemplateFormData = {
              name: validName,
              title: "Valid Title",
              description: "",
              priority: "none",
              dueDateType: "none",
              energyLevel: "none",
              context: "none",
              subtasks: [],
            };

            const errors = validateTemplateForm(formData);

            // Should NOT have name error
            expect(errors.name).toBeUndefined();
          }
        )
      );
    });
  });

  /**
   * **Feature: template-form-interface, Property 3: Title Validation**
   * **Validates: Requirements 6.2**
   *
   * For any string input as task title, the validation function SHALL return
   * an error if and only if the trimmed string is empty.
   */
  describe("Property 3: Title Validation", () => {
    it("empty or whitespace-only titles produce validation error", () => {
      // Generate whitespace-only strings
      const whitespaceArb = fc
        .array(fc.constantFrom(" ", "\t", "\n", "\r"), { minLength: 0, maxLength: 10 })
        .map((chars) => chars.join(""));

      fc.assert(
        fc.property(whitespaceArb, (whitespaceString: string) => {
          const formData: TemplateFormData = {
            name: "Valid Name",
            title: whitespaceString,
            description: "",
            priority: "none",
            dueDateType: "none",
            energyLevel: "none",
            context: "none",
            subtasks: [],
          };

          const errors = validateTemplateForm(formData);

          // Should have title error
          expect(errors.title).toBeDefined();
          expect(errors.title).toBe("Task title is required");
        })
      );
    });

    it("non-empty trimmed titles do not produce validation error", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
          (validTitle) => {
            const formData: TemplateFormData = {
              name: "Valid Name",
              title: validTitle,
              description: "",
              priority: "none",
              dueDateType: "none",
              energyLevel: "none",
              context: "none",
              subtasks: [],
            };

            const errors = validateTemplateForm(formData);

            // Should NOT have title error
            expect(errors.title).toBeUndefined();
          }
        )
      );
    });
  });
});
