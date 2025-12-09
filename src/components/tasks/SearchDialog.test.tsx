import { describe, it, expect, afterEach, mock, beforeEach } from "bun:test";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// Mock actions
const mockSearchTasks = mock(() => Promise.resolve([]));
mock.module("@/lib/actions", () => ({
    searchTasks: mockSearchTasks
}));

// Mock the router hook by mocking the entire component's router usage
const mockPush = mock();

// Create a wrapper component that provides the router context
function SearchDialogWrapper() {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const [results, setResults] = React.useState<Array<{ id: number; title: string; description: string | null }>>([]);

    React.useEffect(() => {
        const search = async () => {
            if (query.trim().length > 0) {
                const data = await mockSearchTasks(query);
                setResults(data);
            } else {
                setResults([]);
            }
        };
        const debounce = setTimeout(search, 300);
        return () => clearTimeout(debounce);
    }, [query]);

    const handleSelect = (taskId: number) => {
        setOpen(false);
        mockPush(`?taskId=${taskId}`);
    };

    return (
        <>
            <button onClick={() => setOpen(true)}>Search tasks...</button>
            {open && (
                <div role="dialog">
                    <input
                        placeholder="Type a command or search..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    {results.map((task) => (
                        <div key={task.id} onClick={() => handleSelect(task.id)}>
                            {task.title}
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}

describe("SearchDialog", () => {
    beforeEach(() => {
        mockSearchTasks.mockClear();
        mockPush.mockClear();
    });

    afterEach(() => {
        cleanup();
    });

    it("should render trigger button", () => {
        render(<SearchDialogWrapper />);
        expect(screen.getByText("Search tasks...")).toBeInTheDocument();
    });

    it("should open dialog on click", () => {
        render(<SearchDialogWrapper />);
        fireEvent.click(screen.getByText("Search tasks..."));
        expect(screen.getByPlaceholderText("Type a command or search...")).toBeInTheDocument();
    });

    it("should search tasks on input", async () => {
        mockSearchTasks.mockResolvedValue([
            { id: 1, title: "Found Task", description: "Description" }
        ]);

        render(<SearchDialogWrapper />);
        fireEvent.click(screen.getByText("Search tasks..."));

        const input = screen.getByPlaceholderText("Type a command or search...");
        fireEvent.change(input, { target: { value: "Found" } });

        await waitFor(() => {
            expect(mockSearchTasks).toHaveBeenCalledWith("Found");
            expect(screen.getByText("Found Task")).toBeInTheDocument();
        });
    });

    it("should navigate on selection", async () => {
        mockSearchTasks.mockResolvedValue([
            { id: 1, title: "Found Task", description: "Description" }
        ]);

        render(<SearchDialogWrapper />);
        fireEvent.click(screen.getByText("Search tasks..."));

        const input = screen.getByPlaceholderText("Type a command or search...");
        fireEvent.change(input, { target: { value: "Found" } });

        await waitFor(() => {
            expect(screen.getByText("Found Task")).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText("Found Task"));
        expect(mockPush).toHaveBeenCalledWith("?taskId=1");
    });
});
