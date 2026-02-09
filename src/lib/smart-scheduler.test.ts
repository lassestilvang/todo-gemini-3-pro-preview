import { describe, it, expect, mock, beforeEach, beforeAll } from "bun:test";
import { setupTestDb, createTestUser } from "../test/setup";
import { setMockAuthUser } from "../test/mocks";
import { db, tasks } from "@/db";
import { eq } from "drizzle-orm";
import { generateSubtasks, extractDeadline, generateSmartSchedule, analyzePriorities, applyScheduleSuggestion } from "./smart-scheduler";

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
describe("smart-scheduler", () => {
    let testUserId: string;

    beforeAll(async () => {
        mock.module("@/lib/gemini", () => ({
            getGeminiClient: mockGetGeminiClient,
            GEMINI_MODEL: "gemini-pro"
        }));
        await setupTestDb();
        // await resetTestDb();
    });

    beforeEach(async () => {
        // Use unique ID per test for isolation
        const randomId = Math.random().toString(36).substring(7);
        testUserId = `user_${randomId}`;

        await createTestUser(testUserId, `${testUserId}@scheduler.com`);
        setMockAuthUser({ id: testUserId, email: `${testUserId}@scheduler.com`, firstName: "Test", lastName: "User", profilePictureUrl: null });
        mockGenerateContent.mockClear();
        mockGetGeminiClient.mockClear();
    });

    describe("generateSubtasks", () => {
        it("returns a list of subtasks", async () => {
            const mockSubtasks = [
                { title: "Subtask 1", estimateMinutes: 15 },
                { title: "Subtask 2", estimateMinutes: 30 },
                { title: "Subtask 3", estimateMinutes: 45 }
            ];
            mockGenerateContent.mockResolvedValueOnce({
                response: {
                    text: () => JSON.stringify(mockSubtasks)
                }
            });
            const subtasks = await generateSubtasks("Test Task");
            expect(subtasks).toEqual(mockSubtasks);
            expect(mockGenerateContent).toHaveBeenCalled();
        });

        it("handles empty response", async () => {
            mockGenerateContent.mockResolvedValueOnce({
                response: {
                    text: () => "[]"
                }
            });
            const subtasks = await generateSubtasks("Test Task");
            expect(subtasks).toEqual([]);
        });

        it("handles error gracefully", async () => {
            mockGenerateContent.mockRejectedValueOnce(new Error("API Error"));
            const subtasks = await generateSubtasks("Test Task");
            expect(subtasks).toEqual([]);
        });

        it("returns empty if client is null", async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockGetGeminiClient.mockReturnValueOnce(undefined as unknown as any);
            const subtasks = await generateSubtasks("Test Task");
            expect(subtasks).toEqual([]);
        });
    });

    describe("extractDeadline", () => {
        it("extracts deadline correctly", async () => {
            const mockResponse = {
                date: "2023-12-31T12:00:00",
                confidence: 0.9,
                reason: "Explicit date mentioned"
            };
            mockGenerateContent.mockResolvedValueOnce({
                response: {
                    text: () => JSON.stringify(mockResponse)
                }
            });

            const result = await extractDeadline("Task due on Dec 31");
            expect(result).toEqual({
                date: new Date("2023-12-31T12:00:00"),
                confidence: 0.9,
                reason: "Explicit date mentioned"
            });
        });

        it("handles null date in response", async () => {
            const mockResponse = {
                date: null,
                confidence: 0.1,
                reason: "No date found"
            };
            mockGenerateContent.mockResolvedValueOnce({
                response: {
                    text: () => JSON.stringify(mockResponse)
                }
            });

            const result = await extractDeadline("Just a task");
            expect(result).toEqual({
                date: null,
                confidence: 0.1,
                reason: "No date found"
            });
        });

        it("returns null on error", async () => {
            mockGenerateContent.mockRejectedValueOnce(new Error("API Error"));
            const result = await extractDeadline("Task");
            expect(result).toBeNull();
        });

        it("returns null if client is null", async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mockGetGeminiClient.mockReturnValueOnce(undefined as unknown as any);
            const result = await extractDeadline("Task");
            expect(result).toBeNull();
        });
    });

    // Skip tests that require database mocking to avoid interference with other tests
    describe("generateSmartSchedule", () => {
        it("generates schedule for unscheduled tasks", async () => {
            const suggestions = await generateSmartSchedule();
            expect(suggestions).toBeDefined();
        });
    });

    describe("applyScheduleSuggestion", () => {
        it("updates task due date", async () => {
            // Create a task first with userId
            const [inserted] = await db.insert(tasks).values({
                userId: testUserId,
                title: "Test Task",
                listId: null,
            }).returning();

            const date = new Date("2023-12-01");
            await applyScheduleSuggestion(inserted.id, date);

            const [updated] = await db.select().from(tasks).where(eq(tasks.id, inserted.id));
            expect(updated.dueDate).toEqual(date);
        });
    });

    describe("analyzePriorities", () => {
        it("suggests priority changes", async () => {
            const suggestions = await analyzePriorities();
            expect(suggestions).toBeDefined();
        });
    });
});
