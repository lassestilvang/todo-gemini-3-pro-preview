"use server";

import { getGeminiClient, GEMINI_MODEL } from "@/lib/gemini";
import { db, tasks } from "@/db";
import { eq, and, isNull, sql, asc } from "drizzle-orm";
import { format, startOfDay } from "date-fns";
import { requireAuth } from "@/lib/auth";
import { coerceDuePrecision, normalizeDueAnchor, type DuePrecision } from "@/lib/due-utils";

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

export interface ParsedSubtask {
    title: string;
    estimateMinutes: number;
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
        const textResponse = response.text().replace(/\`\`\`json|\`\`\`/g, "").trim();

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
        const user = await requireAuth();

        // 1. Fetch unscheduled tasks (no due date, not completed)
        // First get total count for context
        const totalCountResult = await db.select({ count: sql<number>`count(*)` })
            .from(tasks)
            .where(
                and(
                    isNull(tasks.dueDate),
                    eq(tasks.isCompleted, false),
                    eq(tasks.userId, user.id)
                )
            );
        const totalUnscheduledCount = Number(totalCountResult[0]?.count || 0);

        if (totalUnscheduledCount === 0) return [];

        // Fetch limited set prioritized by priority and creation date
        const unscheduledTasks = await db.select().from(tasks).where(
            and(
                isNull(tasks.dueDate),
                eq(tasks.isCompleted, false),
                eq(tasks.userId, user.id)
            )
        )
        .orderBy(
            sql`CASE
                WHEN ${tasks.priority} = 'high' THEN 1
                WHEN ${tasks.priority} = 'medium' THEN 2
                WHEN ${tasks.priority} = 'low' THEN 3
                ELSE 4
            END`,
            asc(tasks.createdAt)
        )
        .limit(50);

        // 2. Fetch existing schedule for context (tasks due in next 7 days)
        const today = startOfDay(new Date());

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
            I have ${totalUnscheduledCount} unscheduled tasks (showing top ${unscheduledTasks.length} prioritized by importance). Suggest a schedule for the next 5 days starting ${format(today, "yyyy-MM-dd")}.
            
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
        const textResponse = response.text().replace(/\`\`\`json|\`\`\`/g, "").trim();

        const suggestions = JSON.parse(textResponse);

        // Map back to our interface and ensure dates are Date objects
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
export async function applyScheduleSuggestion(
    taskId: number,
    date: Date,
    precision?: DuePrecision | null
) {
    const user = await requireAuth();
    const [task] = await db
        .select({ dueDatePrecision: tasks.dueDatePrecision })
        .from(tasks)
        .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)))
        .limit(1);

    if (!task) return;

    const effectivePrecision = precision ?? task.dueDatePrecision ?? null;
    const coercedPrecision = coerceDuePrecision(date, effectivePrecision);
    const normalizedDate = coercedPrecision
        ? normalizeDueAnchor(date, coercedPrecision, user.weekStartsOnMonday ?? false)
        : date;

    await db.update(tasks)
        .set({ dueDate: normalizedDate, dueDatePrecision: coercedPrecision })
        .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));
}

// Generate subtasks for a complex task
export async function generateSubtasks(taskTitle: string): Promise<ParsedSubtask[]> {
    const client = getGeminiClient();
    if (!client) return [];

    try {
        const model = client.getGenerativeModel({ model: GEMINI_MODEL });

        const prompt = `
            Break down the following task into 3-5 actionable subtasks: "${taskTitle}".
            For each subtask, estimate the time in minutes (e.g. 15, 30, 60).
            
            Return a JSON array of objects:
            - "title": string (concise, under 10 words)
            - "estimateMinutes": number
            
            Example: [{"title": "Research flights", "estimateMinutes": 30}, ...]
            
            Return ONLY raw JSON.
        `;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const textResponse = response.text().replace(/\`\`\`json|\`\`\`/g, "").trim();

        const subtasks = JSON.parse(textResponse);

        if (Array.isArray(subtasks)) {
            return subtasks;
        }
        return [];

    } catch (error) {
        console.error("Error generating subtasks:", error);
        return [];
    }
}

// Analyze task priorities and suggest changes
export async function analyzePriorities(): Promise<Array<{
    taskId: number;
    taskTitle: string;
    currentPriority: string;
    suggestedPriority: "low" | "medium" | "high";
    reason: string;
}>> {
    const client = getGeminiClient();
    if (!client) return [];

    try {
        const user = await requireAuth();

        // Get incomplete tasks (limited for performance)
        const incompleteTasks = await db
            .select()
            .from(tasks)
            .where(and(
                eq(tasks.isCompleted, false),
                eq(tasks.userId, user.id),
                isNull(tasks.parentId)
            ))
            .limit(100);

        if (incompleteTasks.length === 0) return [];

        // Prepare task data for AI
        const taskData = incompleteTasks.map(t => ({
            id: t.id,
            title: t.title,
            priority: t.priority || "none",
            dueDate: t.dueDate ? format(t.dueDate, "yyyy-MM-dd") : null,
            deadline: t.deadline ? format(t.deadline, "yyyy-MM-dd") : null,
        }));

        const prompt = `You are a productivity assistant. Analyze these tasks and suggest priority changes (low/medium/high) for tasks that need adjustment.

Consider:
- Urgency: tasks with deadlines soon should be high priority
- Keywords: "urgent", "important", "ASAP", "critical" suggest higher priority
- Dates: overdue or due soon = higher priority

Tasks:
${JSON.stringify(taskData, null, 2)}

Respond with ONLY a JSON array of objects with this format:
[
  {
    "taskId": number,
    "suggestedPriority": "low" | "medium" | "high",
    "reason": "brief explanation"
  }
]

Only include tasks that NEED a priority change. If all priorities look good, return an empty array.`;

        const model = client.getGenerativeModel({ model: GEMINI_MODEL });
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Parse JSON from response
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) return [];

        const suggestions = JSON.parse(jsonMatch[0]);

        // Enrich with task titles and current priorities
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return suggestions.map((s: any) => {
            const task = incompleteTasks.find(t => t.id === s.taskId);
            return {
                taskId: s.taskId,
                taskTitle: task?.title || "",
                currentPriority: task?.priority || "none",
                suggestedPriority: s.suggestedPriority,
                reason: s.reason,
            };
        });
    } catch (error) {
        console.error("Error analyzing priorities:", error);
        return [];
    }
}
