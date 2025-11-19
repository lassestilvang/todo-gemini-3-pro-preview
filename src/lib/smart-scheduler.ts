"use server";

import { getGeminiClient, GEMINI_MODEL } from "@/lib/gemini";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq, and, isNull, not } from "drizzle-orm";
import { addDays, format, startOfDay, endOfDay, isWeekend } from "date-fns";

// Types for AI suggestions
export interface ScheduleSuggestion {
    taskId: number;
    taskTitle: string;
    suggestedDate: Date;
    reason: string;
    confidence: number; // 0-1
}

export interface DeadlineExtraction {
    date: Date | null;
    confidence: number;
    reason: string;
}

// Extract deadline from text using Gemini
export async function extractDeadline(text: string): Promise<DeadlineExtraction | null> {
    const client = getGeminiClient();
    if (!client) return null;

    try {
        const model = client.getGenerativeModel({ model: GEMINI_MODEL });

        const prompt = `
            Extract the deadline from this task description: "${text}".
            Return a JSON object with:
            - "date": ISO 8601 date string (YYYY-MM-DDTHH:mm:ss) or null if no deadline found
            - "confidence": number between 0 and 1
            - "reason": brief explanation
            
            Assume current date is ${new Date().toISOString()}.
            Handle relative dates like "next friday", "tomorrow", "in 3 days".
            Return ONLY raw JSON, no markdown formatting.
        `;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const textResponse = response.text().replace(/```json|```/g, "").trim();

        const data = JSON.parse(textResponse);

        return {
            date: data.date ? new Date(data.date) : null,
            confidence: data.confidence,
            reason: data.reason
        };
    } catch (error) {
        console.error("Error extracting deadline:", error);
        return null;
    }
}

// Generate smart schedule suggestions for unscheduled tasks
export async function generateSmartSchedule(): Promise<ScheduleSuggestion[]> {
    const client = getGeminiClient();
    if (!client) return [];

    try {
        // 1. Fetch unscheduled tasks (no due date, not completed)
        const unscheduledTasks = await db.select().from(tasks).where(
            and(
                isNull(tasks.dueDate),
                eq(tasks.isCompleted, false)
            )
        );

        if (unscheduledTasks.length === 0) return [];

        // 2. Fetch existing schedule for context (tasks due in next 7 days)
        const today = startOfDay(new Date());
        const nextWeek = addDays(today, 7);

        // Simplified context: just counts of tasks per day
        // In a real app, we'd fetch actual tasks to check for load balancing

        // 3. Prepare prompt for Gemini
        const tasksList = unscheduledTasks.map(t => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
            energy: t.energyLevel,
            context: t.context,
            estimate: t.estimateMinutes
        }));

        const prompt = `
            I have ${unscheduledTasks.length} unscheduled tasks. Suggest a schedule for the next 5 days starting ${format(today, "yyyy-MM-dd")}.
            
            Tasks:
            ${JSON.stringify(tasksList, null, 2)}
            
            Rules:
            1. Distribute tasks evenly.
            2. High priority tasks should be sooner.
            3. High energy tasks should be in the morning (assume morning slots available).
            4. Don't schedule more than 3 high priority tasks per day.
            5. Suggest specific dates and times (e.g., 09:00, 14:00).
            
            Return a JSON array of objects with:
            - "taskId": number
            - "suggestedDate": ISO 8601 date string
            - "reason": string (why this time?)
            - "confidence": number (0-1)
            
            Return ONLY raw JSON.
        `;

        const model = client.getGenerativeModel({ model: GEMINI_MODEL });
        const result = await model.generateContent(prompt);
        const response = result.response;
        const textResponse = response.text().replace(/```json|```/g, "").trim();

        const suggestions = JSON.parse(textResponse);

        // Map back to our interface and ensure dates are Date objects
        return suggestions.map((s: any) => {
            const task = unscheduledTasks.find(t => t.id === s.taskId);
            return {
                taskId: s.taskId,
                taskTitle: task?.title || "Unknown Task",
                suggestedDate: new Date(s.suggestedDate),
                reason: s.reason,
                confidence: s.confidence
            };
        });

    } catch (error) {
        console.error("Error generating smart schedule:", error);
        return [];
    }
}

// Apply a suggestion (update task due date)
export async function applyScheduleSuggestion(taskId: number, date: Date) {
    await db.update(tasks)
        .set({ dueDate: date })
        .where(eq(tasks.id, taskId));
}
