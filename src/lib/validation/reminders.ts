import { z } from "zod";

export const createReminderSchema = z.object({
    userId: z.string().min(1, "User ID is required"),
    taskId: z.number().int().positive("Task ID must be a positive integer"),
    remindAt: z.coerce.date(),
});
