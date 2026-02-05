import { z } from "zod";

export const createManualTimeEntrySchema = z.object({
    taskId: z.number().int().positive(),
    userId: z.string().uuid(),
    durationMinutes: z.number().min(1, "Duration must be at least 1 minute"),
    date: z.coerce.date().optional(),
    notes: z.string().optional(),
});

export const updateTimeEntrySchema = z.object({
    durationMinutes: z.number().min(1).optional(),
    notes: z.string().optional(),
    startedAt: z.coerce.date().optional(),
    endedAt: z.coerce.date().optional(),
});

export const getTimeStatsSchema = z.object({
    userId: z.string().uuid(),
    dateRange: z.object({
        from: z.coerce.date(),
        to: z.coerce.date(),
    }).optional(),
});
