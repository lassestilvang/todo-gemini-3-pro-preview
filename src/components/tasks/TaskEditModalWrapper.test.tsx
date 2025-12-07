import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { TaskEditModalWrapper } from "./TaskEditModalWrapper";

type PartialTask = { id: number; title: string };

// Mock dependencies
const mockGetTask = mock(() => Promise.resolve(null));
mock.module("@/lib/actions", () => ({
    getTask: mockGetTask
}));

// Mock Next.js navigation
const mockPush = mock();
const mockSearchParams = new URLSearchParams();
mock.module("next/navigation", () => ({
    useRouter: () => ({
        push: mockPush
    }),
    useSearchParams: () => mockSearchParams,
    usePathname: () => "/test",
    useParams: () => ({})
}));

// Mock TaskDialog
mock.module("./TaskDialog", () => ({
    TaskDialog: ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => (
        open ? (
            <div data-testid="task-dialog">
                Task Dialog
                <button onClick={() => onOpenChange(false)}>Close</button>
            </div>
        ) : null
    )
}));

describe("TaskEditModalWrapper", () => {
    beforeEach(() => {
        mockGetTask.mockClear();
        mockPush.mockClear();
        // Reset search params
        mockSearchParams.delete("taskId");
    });

    afterEach(() => {
        cleanup();
    });

    it("should render nothing when no taskId param", () => {
        render(<TaskEditModalWrapper />);
        expect(screen.queryByTestId("task-dialog")).toBeNull();
        expect(mockGetTask).not.toHaveBeenCalled();
    });

    it("should fetch task and render dialog when taskId param is present", async () => {
        mockSearchParams.set("taskId", "123");
        mockGetTask.mockResolvedValueOnce({ id: 123, title: "Test Task" } as PartialTask);

        render(<TaskEditModalWrapper />);

        await waitFor(() => {
            expect(mockGetTask).toHaveBeenCalledWith(123);
        });

        await waitFor(() => {
            expect(screen.getByTestId("task-dialog")).toBeDefined();
        });
    });

    it("should close dialog and update URL when close button clicked", async () => {
        mockSearchParams.set("taskId", "123");
        mockGetTask.mockResolvedValueOnce({ id: 123, title: "Test Task" } as PartialTask);

        render(<TaskEditModalWrapper />);

        await waitFor(() => {
            expect(screen.getByTestId("task-dialog")).toBeDefined();
        });

        screen.getByText("Close").click();

        expect(mockPush).toHaveBeenCalledWith("/test?");
    });

    it("should handle invalid taskId", async () => {
        mockSearchParams.set("taskId", "invalid");
        render(<TaskEditModalWrapper />);

        expect(mockGetTask).not.toHaveBeenCalled();
        expect(screen.queryByTestId("task-dialog")).toBeNull();
    });

    it("should handle task not found", async () => {
        mockSearchParams.set("taskId", "999");
        mockGetTask.mockResolvedValueOnce(null);

        render(<TaskEditModalWrapper />);

        await waitFor(() => {
            expect(mockGetTask).toHaveBeenCalledWith(999);
        });

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith("/test?");
        });
    });
});
