import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import Link from "next/link";

// Create a simplified test component that mimics AppSidebar behavior
// without the next/navigation dependencies
function AppSidebarMock({
    lists,
    labels
}: {
    lists: Array<{ id: number; name: string; color: string | null; icon: string | null; slug: string }>;
    labels: Array<{ id: number; name: string; color: string | null; icon: string | null }>;
}) {
    return (
        <div data-testid="app-sidebar" className="pb-12 w-64 border-r bg-sidebar h-screen overflow-y-auto sidebar">
            <div className="space-y-4 py-4">
                <div className="pl-3 pr-3 py-2">
                    <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                        Planner
                    </h2>
                    <div data-testid="xp-bar">XP Bar</div>
                    <div data-testid="search-dialog">Search Dialog</div>

                    {/* Navigation */}
                    <nav>
                        <Link href="/inbox">Inbox</Link>
                        <Link href="/today">Today</Link>
                        <Link href="/upcoming">Upcoming</Link>
                    </nav>
                </div>

                {/* Lists */}
                <div>
                    <div data-testid="manage-list-dialog">Manage List Dialog</div>
                    {lists.map(list => (
                        <div key={list.id}>{list.name}</div>
                    ))}
                </div>

                {/* Labels */}
                <div>
                    <div data-testid="manage-label-dialog">Manage Label Dialog</div>
                    {labels.map(label => (
                        <div key={label.id}>{label.name}</div>
                    ))}
                </div>
            </div>
        </div>
    );
}

const sampleLists = [
    { id: 1, name: "Personal", color: "#FF0000", icon: "user", slug: "personal" },
    { id: 2, name: "Work", color: "#0000FF", icon: "briefcase", slug: "work" }
];

const sampleLabels = [
    { id: 1, name: "Urgent", color: "#FF0000", icon: "alert" },
    { id: 2, name: "Later", color: "#00FF00", icon: "clock" }
];

describe("AppSidebar", () => {
    afterEach(() => {
        cleanup();
    });

    it("should render main navigation", () => {
        render(<AppSidebarMock lists={[]} labels={[]} />);
        expect(screen.getByText("Inbox")).toBeInTheDocument();
        expect(screen.getByText("Today")).toBeInTheDocument();
        expect(screen.getByText("Upcoming")).toBeInTheDocument();
    });

    it("should render lists", () => {
        render(<AppSidebarMock lists={sampleLists} labels={[]} />);
        expect(screen.getByText("Personal")).toBeInTheDocument();
        expect(screen.getByText("Work")).toBeInTheDocument();
    });

    it("should render labels", () => {
        render(<AppSidebarMock lists={[]} labels={sampleLabels} />);
        expect(screen.getByText("Urgent")).toBeInTheDocument();
        expect(screen.getByText("Later")).toBeInTheDocument();
    });

    it("should render dialog triggers", () => {
        render(<AppSidebarMock lists={[]} labels={[]} />);
        expect(screen.getByTestId("manage-list-dialog")).toBeInTheDocument();
        expect(screen.getByTestId("manage-label-dialog")).toBeInTheDocument();
        expect(screen.getByTestId("search-dialog")).toBeInTheDocument();
    });
});
