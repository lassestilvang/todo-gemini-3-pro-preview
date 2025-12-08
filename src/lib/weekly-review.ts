"use server";

import { db, tasks } from "@/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { getGeminiClient, GEMINI_MODEL } from "@/lib/gemini";

export async function generateWeeklyReport(): Promise<{
    summary: string;
    tasksCompleted: number;
    xpGained: number;
    insights: string[];
} | null> {
    const client = getGeminiClient();
    if (!client) return null;

    try {
        const now = new Date();
        const weekStart = startOfWeek(now);
        const weekEnd = endOfWeek(now);

        // Get completed tasks from this week
        const completedThisWeek = await db
            .select()
            .from(tasks)
            .where(and(
                eq(tasks.isCompleted, true),
                gte(tasks.completedAt, weekStart),
                lte(tasks.completedAt, weekEnd)
            ));

        // Get stats from last week for comparison
        const lastWeekStart = startOfWeek(subWeeks(now, 1));
        const lastWeekEnd = endOfWeek(subWeeks(now, 1));

        const completedLastWeek = await db
            .select()
            .from(tasks)
            .where(and(
                eq(tasks.isCompleted, true),
                gte(tasks.completedAt, lastWeekStart),
                lte(tasks.completedAt, lastWeekEnd)
            ));

        // Calculate XP (using same formula as addXP)
        const xpThisWeek = completedThisWeek.reduce((total, task) => {
            let xp = 10; // base
            if (task.priority === "low") xp += 0;
            if (task.priority === "medium") xp += 5;
            if (task.priority === "high") xp += 10;
            return total + xp;
        }, 0);

        // Prepare data for AI
        const reportData = {
            thisWeek: {
                tasksCompleted: completedThisWeek.length,
                xpGained: xpThisWeek,
                taskTypes: completedThisWeek.map(t => ({
                    title: t.title,
                    priority: t.priority,
                    list: t.listId,
                })),
            },
            lastWeek: {
                tasksCompleted: completedLastWeek.length,
            },
        };

        const prompt = `You are a productivity coach. Generate a brief weekly review based on this data:

${JSON.stringify(reportData, null, 2)}

Provide:
1. A motivational summary (2-3 sentences)
2. Exactly 3 specific insights or recommendations

Respond in this JSON format:
{
  "summary": "motivational summary here",
  "insights": ["insight 1", "insight 2", "insight 3"]
}`;

        const model = client.getGenerativeModel({ model: GEMINI_MODEL });
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;

        const aiResponse = JSON.parse(jsonMatch[0]);

        return {
            summary: aiResponse.summary,
            tasksCompleted: completedThisWeek.length,
            xpGained: xpThisWeek,
            insights: aiResponse.insights,
        };
    } catch (error) {
        console.error("Error generating weekly report:", error);
        return null;
    }
}
