import { describe, it, expect, mock, beforeEach, afterEach, beforeAll, afterAll } from "bun:test";
import { suggestMetadata } from "./smart-tags";
import { mockGetGeminiClient } from "@/test/mocks";
import { db } from "@/db";

// Mock gemini client
const mockGenerateContent = mock(() => Promise.resolve({
    response: {
        text: () => JSON.stringify({ listId: 1, labelIds: [2] })
    }
}));

const mockGetGenerativeModel = mock(() => ({
    generateContent: mockGenerateContent
}));

describe("Smart Tags", () => {
    const originalError = console.error;
    const originalDbSelect = db.select;
    let dbSelectSpy: ReturnType<typeof mock>;
    let dbFromSpy: ReturnType<typeof mock>;
    let dbWhereSpy: ReturnType<typeof mock>;

    beforeAll(() => {
        // Since db.select is a property on the db object, let's spy/mock it directly.
        // We need to return a chainable mock object.

        dbWhereSpy = mock(() => Promise.resolve([{ id: 1, name: "Groceries" }, { id: 2, name: "Food" }]));
        dbFromSpy = mock(() => ({ where: dbWhereSpy }));
        dbSelectSpy = mock(() => ({ from: dbFromSpy }));

        // Overwrite db.select for testing purposes since we can't easily mock the import
        // Check if db.select is writable
        try {
            (db as unknown as { select: ReturnType<typeof mock> }).select = dbSelectSpy;
        } catch {
            console.warn("Could not overwrite db.select directly. Tests might fail if not mocked correctly via module.");
        }
    });

    beforeEach(() => {
        mockGenerateContent.mockClear();
        // Configure global mock to return our test client
        mockGetGeminiClient.mockReturnValue({
            getGenerativeModel: mockGetGenerativeModel
        } as unknown);
        console.error = mock(() => { });

        // Reset spies
        dbSelectSpy.mockClear();
        dbFromSpy.mockClear();
        dbWhereSpy.mockClear();

        // Default behavior: return some dummy data
        dbWhereSpy.mockResolvedValue([{ id: 1, name: "Groceries" }, { id: 2, name: "Food" }]);
    });

    afterEach(() => {
        console.error = originalError;
        mockGetGeminiClient.mockRestore();
        (db as unknown as { select: typeof db.select }).select = originalDbSelect;
    });

    afterAll(() => {
        (db as unknown as { select: typeof db.select }).select = originalDbSelect;
    });

    it("should return suggestions from Gemini", async () => {
        const result = await suggestMetadata("Buy milk", "user_1");

        expect(result).toEqual({ listId: 1, labelIds: [2] });
        expect(mockGenerateContent).toHaveBeenCalled();
        expect(dbSelectSpy).toHaveBeenCalledTimes(2); // Lists and Labels
    });

    it("should handle empty response or error gracefully", async () => {
        mockGenerateContent.mockImplementationOnce(() => Promise.reject("API Error"));

        const result = await suggestMetadata("Buy milk", "user_1");

        expect(result).toEqual({ listId: null, labelIds: [] });
    });

    it("should handle invalid JSON response", async () => {
        mockGenerateContent.mockImplementationOnce(() => Promise.resolve({
            response: {
                text: () => "Not JSON"
            }
        }));

        const result = await suggestMetadata("Buy milk", "user_1");

        expect(result).toEqual({ listId: null, labelIds: [] });
    });

    it("should return null/empty if client is not available (Optimized Check)", async () => {
        mockGetGeminiClient.mockReturnValueOnce(null as never);
        dbSelectSpy.mockClear();

        const result = await suggestMetadata("Buy milk", "user_1");

        expect(result).toEqual({ listId: null, labelIds: [] });
        // Crucial: DB should NOT be called if client is null
        expect(dbSelectSpy).not.toHaveBeenCalled();
    });
});
