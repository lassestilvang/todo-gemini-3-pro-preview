import { describe, it, expect, mock, beforeEach } from "bun:test";
import { generateSubtasks } from "./smart-scheduler";

// Mock the Gemini client
const mockGenerateContent = mock(() => Promise.resolve({
    response: {
        text: () => JSON.stringify(["Subtask 1", "Subtask 2", "Subtask 3"])
    }
}));

const mockGetGenerativeModel = mock(() => ({
    generateContent: mockGenerateContent
}));

const mockGetGeminiClient = mock(() => ({
    getGenerativeModel: mockGetGenerativeModel
}));

// Mock the module
mock.module("./gemini", () => ({
    getGeminiClient: mockGetGeminiClient,
    GEMINI_MODEL: "gemini-pro"
}));

describe("smart-scheduler", () => {
    beforeEach(() => {
        mockGenerateContent.mockClear();
    });

    it("generateSubtasks returns a list of strings", async () => {
        const subtasks = await generateSubtasks("Test Task");
        expect(subtasks).toEqual(["Subtask 1", "Subtask 2", "Subtask 3"]);
        expect(mockGenerateContent).toHaveBeenCalled();
    });

    it("generateSubtasks handles empty response", async () => {
        mockGenerateContent.mockResolvedValueOnce({
            response: {
                text: () => "[]"
            }
        });
        const subtasks = await generateSubtasks("Test Task");
        expect(subtasks).toEqual([]);
    });

    it("generateSubtasks handles error gracefully", async () => {
        mockGenerateContent.mockRejectedValueOnce(new Error("API Error"));
        const subtasks = await generateSubtasks("Test Task");
        expect(subtasks).toEqual([]);
    });
});
