import { z } from "zod";

export const createReminderSchema = z.object({
    userId: z.string().uuid("Invalid user ID"),
    taskId: z.number().int().positive("Task ID must be a positive integer"),
    remindAt: z.coerce.date(),
});
