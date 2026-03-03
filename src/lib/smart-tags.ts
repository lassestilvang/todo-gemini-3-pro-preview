"use server";

import { getGeminiClient, GEMINI_MODEL } from "@/lib/gemini";
import { db, lists, labels } from "@/db";
import { eq } from "drizzle-orm";

interface SuggestionResult {
    listId: number | null;
    labelIds: number[];
}

// Optimized signature: Accept userId instead of full lists/labels to control fetching
export async function suggestMetadata(
    taskTitle: string,
    userId: string
): Promise<SuggestionResult> {
    // 1. Check environment & client availability FIRST to avoid any DB calls if feature is disabled
    if (process.env.E2E_TEST_MODE === 'true') {
        return { listId: null, labelIds: [] };
    }

    const client = getGeminiClient();
    if (!client) return { listId: null, labelIds: [] };

    try {
        // 2. Fetch MINIMAL data (ID & Name only)
        // This replaces the previous behavior where the caller fetched full objects (including unrelated fields)
        const [availableLists, availableLabels] = await Promise.all([
            db.select({ id: lists.id, name: lists.name })
              .from(lists)
              .where(eq(lists.userId, userId)),
            db.select({ id: labels.id, name: labels.name })
              .from(labels)
              .where(eq(labels.userId, userId))
        ]);

        const model = client.getGenerativeModel({ model: GEMINI_MODEL });

        const prompt = `
            Analyze the task: "${taskTitle}"
            
            Available Lists:
            ${JSON.stringify(availableLists)}
            
            Available Labels:
            ${JSON.stringify(availableLabels)}
            
            Task: Assign the most appropriate List ID (or null) and Label IDs (array) based on the task content.
            - If the task clearly belongs to a list (e.g. "Buy milk" -> "Groceries"), assign it.
            - If the task fits one or more labels, assign them.
            - Be conservative. If unsure, return null/empty.
            
            Respond ONLY with a JSON object:
            {
                "listId": number | null,
                "labelIds": number[]
            }
        `;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text().replace(/\`\`\`json|\`\`\`/g, "").trim();

        const data = JSON.parse(text);

        const suggestedListId = typeof data.listId === 'number' ? data.listId : null;
        const suggestedLabelIds = Array.isArray(data.labelIds) ? data.labelIds : [];

        // 3. Security Validation: Ensure suggested IDs actually belong to the user
        // Since we just fetched the valid IDs, we can check against them in memory
        // This prevents the LLM from hallucinating IDs or a malicious prompt injection suggesting other users' IDs

        let validListId: number | null = null;
        if (suggestedListId !== null) {
            const listExists = availableLists.some(l => l.id === suggestedListId);
            if (listExists) {
                validListId = suggestedListId;
            } else {
                console.warn(`[SECURITY] Smart tagging suggested invalid listId (${suggestedListId}) for user ${userId}`);
            }
        }

        const validLabelIds = suggestedLabelIds.filter((id: number) =>
            availableLabels.some(l => l.id === id)
        );

        return {
            listId: validListId,
            labelIds: validLabelIds
        };

    } catch (error) {
        // Suppress 404 errors from Gemini (model not available/found) to avoid log spam
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes("404") || msg.includes("not found")) {
            console.warn("Gemini model not found or API error (skipping smart tags):", msg);
        } else {
            console.error("Error suggesting metadata:", error);
        }
        return { listId: null, labelIds: [] };
    }
}
