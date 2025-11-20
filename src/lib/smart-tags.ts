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
        console.error("Error suggesting metadata:", error);
        return { listId: null, labelIds: [] };
    }
}
