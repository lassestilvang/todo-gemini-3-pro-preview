import { describe, it, expect, mock, beforeEach, afterEach, beforeAll } from "bun:test";
import { suggestMetadata } from "./smart-tags";

// Mock gemini client
const mockGenerateContent = mock(() => Promise.resolve({
    response: {
        text: () => JSON.stringify({ listId: 1, labelIds: [2] })
    }
}));

const mockGetGenerativeModel = mock(() => ({
    generateContent: mockGenerateContent
}));

const mockGetGeminiClient = mock(() => ({
    getGenerativeModel: mockGetGenerativeModel
}));

describe("Smart Tags", () => {
    const originalError = console.error;

    beforeAll(() => {
        mock.module("@/lib/gemini", () => ({
            getGeminiClient: mockGetGeminiClient,
            GEMINI_MODEL: "gemini-pro"
        }));
    });

    beforeEach(() => {
        mockGenerateContent.mockClear();
        mockGetGeminiClient.mockClear();
        console.error = mock(() => { });
    });

    afterEach(() => {
        console.error = originalError;
    });

    it("should return suggestions from Gemini", async () => {
        const result = await suggestMetadata(
            "Buy milk",
            [{ id: 1, name: "Groceries" }],
            [{ id: 2, name: "Food" }]
        );

        expect(result).toEqual({ listId: 1, labelIds: [2] });
        expect(mockGenerateContent).toHaveBeenCalled();
    });

    it("should handle empty response or error gracefully", async () => {
        mockGenerateContent.mockImplementationOnce(() => Promise.reject("API Error"));

        const result = await suggestMetadata(
            "Buy milk",
            [],
            []
        );

        expect(result).toEqual({ listId: null, labelIds: [] });
    });

    it("should handle invalid JSON response", async () => {
        mockGenerateContent.mockImplementationOnce(() => Promise.resolve({
            response: {
                text: () => "Not JSON"
            }
        }));

        const result = await suggestMetadata(
            "Buy milk",
            [],
            []
        );

        expect(result).toEqual({ listId: null, labelIds: [] });
    });

    it("should return null/empty if client is not available", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockGetGeminiClient.mockReturnValueOnce(null as any);

        const result = await suggestMetadata(
            "Buy milk",
            [],
            []
        );

        expect(result).toEqual({ listId: null, labelIds: [] });
    });
});
