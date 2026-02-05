"use server";

import { getGeminiClient, GEMINI_MODEL } from "@/lib/gemini";

interface List {
    id: number;
    name: string;
}

interface Label {
    id: number;
    name: string;
}

interface SuggestionResult {
    listId: number | null;
    labelIds: number[];
}

export async function suggestMetadata(
    taskTitle: string,
    availableLists: List[],
    availableLabels: Label[]
): Promise<SuggestionResult> {
    // Skip AI suggestions in E2E test mode for speed and reliability
    if (process.env.E2E_TEST_MODE === 'true') {
        return { listId: null, labelIds: [] };
    }

    const client = getGeminiClient();
    if (!client) return { listId: null, labelIds: [] };

    try {
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
        const text = response.text().replace(/```json|```/g, "").trim();

        const data = JSON.parse(text);

        return {
            listId: typeof data.listId === 'number' ? data.listId : null,
            labelIds: Array.isArray(data.labelIds) ? data.labelIds : []
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
