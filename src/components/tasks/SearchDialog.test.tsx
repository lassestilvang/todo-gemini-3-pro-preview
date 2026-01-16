import { describe, it, expect, afterEach, mock, beforeEach } from "bun:test";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import Fuse from "fuse.js";

// Mock actions
const mockGetTasksForSearch = mock(() => Promise.resolve([]));
mock.module("@/lib/actions", () => ({
    getTasksForSearch: mockGetTasksForSearch
}));

const mockPush = mock();

// Wrapper replicating the Client-Side Search Logic with Fuse.js
function SearchDialogWrapper() {
    const [fuse, setFuse] = React.useState<Fuse<any> | null>(null);
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const [results, setResults] = React.useState<Array<{ id: number; title: string; description: string | null }>>([]);

    React.useEffect(() => {
        const init = async () => {
            const tasks = await mockGetTasksForSearch("active-user");
            const fuseInstance = new Fuse(tasks, {
                keys: ['title', 'description'],
                threshold: 0.4,
                shouldSort: true,
            });
            setFuse(fuseInstance);
        };
        if (open && !fuse) {
            init();
        }
    }, [open, fuse]);

    React.useEffect(() => {
        if (!fuse) return;
        if (query.trim().length > 0) {
            const searchResults = fuse.search(query).map(result => result.item);
            setResults(searchResults);
        } else {
            setResults([]);
        }
    }, [query, fuse]);

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

describe("SearchDialog (Client-Side Logic)", () => {
    beforeEach(() => {
        mockGetTasksForSearch.mockClear();
        mockPush.mockClear();
    });

    afterEach(() => {
        cleanup();
    });

    it("should fetch tasks and initialize Fuse on open", async () => {
        mockGetTasksForSearch.mockResolvedValue([
            { id: 1, title: "Buy Milk", description: "Groceries" }
        ]);

        render(<SearchDialogWrapper />);
        fireEvent.click(screen.getByText("Search tasks..."));

        await waitFor(() => {
            expect(mockGetTasksForSearch).toHaveBeenCalled();
        });
    });

    it("should fuzzy search tasks locally", async () => {
        mockGetTasksForSearch.mockResolvedValue([
            { id: 1, title: "Buy Milk", description: "Groceries" },
            { id: 2, title: "Walk Dog", description: "Exercise" }
        ]);

        render(<SearchDialogWrapper />);
        fireEvent.click(screen.getByText("Search tasks..."));

        // Wait for fetch
        await waitFor(() => expect(mockGetTasksForSearch).toHaveBeenCalled());

        const input = screen.getByPlaceholderText("Type a command or search...");

        // Exact match
        fireEvent.change(input, { target: { value: "Milk" } });
        await waitFor(() => {
            expect(screen.getByText("Buy Milk")).toBeInTheDocument();
            expect(screen.queryByText("Walk Dog")).not.toBeInTheDocument();
        });

        // Fuzzy match (typo)
        fireEvent.change(input, { target: { value: "Mlk" } });
        await waitFor(() => {
            expect(screen.getByText("Buy Milk")).toBeInTheDocument();
        });
    });
});
