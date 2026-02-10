"use server";

import { getGeminiClient, GEMINI_MODEL } from "@/lib/gemini";
import { db, tasks } from "@/db";
import { and, eq, lte } from "drizzle-orm";
import { startOfDay, format } from "date-fns";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { formatDuePeriod, isDueOverdue, normalizeDueAnchor, type DuePrecision } from "@/lib/due-utils";

export interface RescheduleSuggestion {
    taskId: number;
    taskTitle: string;
    suggestedDate: string; // ISO date
    reason: string;
    dueDatePrecision?: DuePrecision | null;
}

export interface ParsedVoiceCommand {
    title: string;
    priority?: "low" | "medium" | "high";
    dueDate?: string; // ISO string
    dueTime?: string; // HH:mm
    description?: string;
}

export async function parseVoiceCommand(text: string): Promise<ParsedVoiceCommand | null> {
    const user = await requireAuth();

    // Rate limit: 20 requests per hour
    const limit = await rateLimit(`ai:voice-command:${user.id}`, 20, 3600);
    if (!limit.success) {
        console.warn(`Rate limit exceeded for user ${user.id} on parseVoiceCommand`);
        throw new Error("Rate limit exceeded. Please try again later.");
    }

    const client = getGeminiClient();
    if (!client) return null;

    try {
        const model = client.getGenerativeModel({
            model: GEMINI_MODEL,
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `
            Parse the following voice command into a structured task object: "${text}".
            
            Return a JSON object with:
            - "title": The main task description (remove time/priority keywords).
            - "priority": "low", "medium", or "high" (if mentioned).
            - "dueDate": ISO 8601 date string (YYYY-MM-DD) if a date is mentioned.
            - "dueTime": Time string (HH:mm) if a time is mentioned.
            - "description": Any extra details.

            Assume today is ${new Date().toISOString()}.
            Handle relative dates like "tomorrow", "next friday".
            
            Example: "Buy milk tomorrow at 5pm urgent" ->
            {
                "title": "Buy milk",
                "dueDate": "2023-...",
                "dueTime": "17:00",
                "priority": "high"
            }
        `;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const textResponse = response.text();

        return JSON.parse(textResponse);
    } catch (error) {
        console.error("Error parsing voice command:", error);
        return null;
    }
}

export async function rescheduleOverdueTasks(): Promise<RescheduleSuggestion[]> {
    const user = await requireAuth();

    // Rate limit: 5 requests per hour
    const limit = await rateLimit(`ai:reschedule:${user.id}`, 5, 3600);
    if (!limit.success) {
        console.warn(`Rate limit exceeded for user ${user.id} on rescheduleOverdueTasks`);
        throw new Error("Rate limit exceeded. Please try again later.");
    }

    const client = getGeminiClient();
    if (!client) return [];

    try {
        const today = startOfDay(new Date());

        // Fetch overdue task candidates (period tasks are filtered in-memory)
        const overdueCandidates = await db
            .select({
                id: tasks.id,
                title: tasks.title,
                priority: tasks.priority,
                dueDate: tasks.dueDate,
                dueDatePrecision: tasks.dueDatePrecision,
            })
            .from(tasks)
            .where(
                and(
                    eq(tasks.userId, user.id),
                    lte(tasks.dueDate, today),
                    eq(tasks.isCompleted, false)
                )
            );

        const overdueTasks = overdueCandidates.filter((task) =>
            task.dueDate
            && isDueOverdue(
                { dueDate: task.dueDate, dueDatePrecision: task.dueDatePrecision ?? null },
                today,
                user.weekStartsOnMonday ?? false
            )
        );

        if (overdueTasks.length === 0) return [];

        const taskList = overdueTasks.map(t => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
            originalDueDate: t.dueDate ? format(t.dueDate, "yyyy-MM-dd") : "unknown",
            dueDatePrecision: t.dueDatePrecision ?? "day",
            duePeriodLabel: t.dueDate && t.dueDatePrecision && t.dueDatePrecision !== "day"
                ? formatDuePeriod({ dueDate: t.dueDate, dueDatePrecision: t.dueDatePrecision as DuePrecision })
                : undefined,
        }));

        const model = client.getGenerativeModel({
            model: GEMINI_MODEL,
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `
            I have ${overdueTasks.length} overdue tasks. Help me reschedule them starting from tomorrow (${format(new Date(today.getTime() + 86400000), "yyyy-MM-dd")}).
            
            Tasks:
            ${JSON.stringify(taskList, null, 2)}
            
            Rules:
            1. Spread them out over the next 3-5 days.
            2. High priority tasks should be sooner.
            3. Don't schedule too many per day.
            
            Return a JSON array of objects:
            - "taskId": number
            - "suggestedDate": ISO 8601 date string (YYYY-MM-DD)
            - "reason": brief explanation
        `;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const textResponse = response.text();

        const suggestions = JSON.parse(textResponse);

        return suggestions.map((s: RescheduleSuggestion) => {
            const task = overdueTasks.find(t => t.id === s.taskId);
            const precision = task?.dueDatePrecision ?? null;
            const suggested = new Date(s.suggestedDate);
            const normalizedDate = precision && precision !== "day"
                ? normalizeDueAnchor(suggested, precision as DuePrecision, user.weekStartsOnMonday ?? false)
                : suggested;

            return {
                ...s,
                suggestedDate: normalizedDate.toISOString(),
                dueDatePrecision: precision,
            };
        });

    } catch (error) {
        console.error("Error rescheduling tasks:", error);
        return [];
    }
}
