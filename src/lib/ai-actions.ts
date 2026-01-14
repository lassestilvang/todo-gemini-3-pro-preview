"use server";

import { getGeminiClient, GEMINI_MODEL } from "@/lib/gemini";
import { db, tasks } from "@/db";
import { and, eq, lt } from "drizzle-orm";
import { startOfDay, format } from "date-fns";

export interface RescheduleSuggestion {
    taskId: number;
    taskTitle: string;
    suggestedDate: string; // ISO date
    reason: string;
}

export interface ParsedVoiceCommand {
    title: string;
    priority?: "low" | "medium" | "high";
    dueDate?: string; // ISO string
    dueTime?: string; // HH:mm
    description?: string;
}

export async function parseVoiceCommand(text: string): Promise<ParsedVoiceCommand | null> {
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
    const client = getGeminiClient();
    if (!client) return [];

    try {
        const today = startOfDay(new Date());

        // Fetch overdue tasks
        const overdueTasks = await db.select().from(tasks).where(
            and(
                lt(tasks.dueDate, today),
                eq(tasks.isCompleted, false)
            )
        );

        if (overdueTasks.length === 0) return [];

        const taskList = overdueTasks.map(t => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
            originalDueDate: t.dueDate ? format(t.dueDate, "yyyy-MM-dd") : "unknown"
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

        return JSON.parse(textResponse);

    } catch (error) {
        console.error("Error rescheduling tasks:", error);
        return [];
    }
}
