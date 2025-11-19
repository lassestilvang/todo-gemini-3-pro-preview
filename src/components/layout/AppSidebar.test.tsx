import { describe, it, expect, afterEach, mock } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import { AppSidebar } from "./AppSidebar";
import React from "react";

// Mock dependencies
mock.module("next/navigation", () => ({
    usePathname: () => "/inbox",
    useRouter: () => ({ push: mock() })
}));

mock.module("@/components/tasks/ManageListDialog", () => ({
    ManageListDialog: () => <div data-testid="manage-list-dialog">Manage List Dialog</div>
}));

mock.module("@/components/tasks/ManageLabelDialog", () => ({
    ManageLabelDialog: () => <div data-testid="manage-label-dialog">Manage Label Dialog</div>
}));

mock.module("@/components/tasks/SearchDialog", () => ({
    SearchDialog: () => <div data-testid="search-dialog">Search Dialog</div>
}));

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
        render(<AppSidebar lists={[]} labels={[]} />);
        expect(screen.getByText("Inbox")).toBeInTheDocument();
        expect(screen.getByText("Today")).toBeInTheDocument();
        expect(screen.getByText("Upcoming")).toBeInTheDocument();
    });

    it("should render lists", () => {
        render(<AppSidebar lists={sampleLists} labels={[]} />);
        expect(screen.getByText("Personal")).toBeInTheDocument();
        expect(screen.getByText("Work")).toBeInTheDocument();
    });

    it("should render labels", () => {
        render(<AppSidebar lists={[]} labels={sampleLabels} />);
        expect(screen.getByText("Urgent")).toBeInTheDocument();
        expect(screen.getByText("Later")).toBeInTheDocument();
    });

    it("should render dialog triggers", () => {
        render(<AppSidebar lists={[]} labels={[]} />);
        expect(screen.getByTestId("manage-list-dialog")).toBeInTheDocument();
        expect(screen.getByTestId("manage-label-dialog")).toBeInTheDocument();
        expect(screen.getByTestId("search-dialog")).toBeInTheDocument();
    });
});
