import { describe, it, expect, mock, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { LabelSelector } from "./LabelSelector";
import React from "react";

// Mock UI components are now handled globally in src/test/setup.tsx via src/test/mocks-ui.tsx

describe("LabelSelector", () => {
    const mockLabels = [
        { id: 1, name: "Label 1", color: "#ff0000", icon: "tag" },
        { id: 2, name: "Label 2", color: "#00ff00", icon: "star" },
    ];

    const mockToggle = mock(() => { });

    afterEach(() => {
        cleanup();
        mockToggle.mockClear();
    });

    it("should render all labels", () => {
        render(<LabelSelector labels={mockLabels} selectedLabelIds={[]} onToggle={mockToggle} />);
        expect(screen.getByText("Label 1")).toBeDefined();
        expect(screen.getByText("Label 2")).toBeDefined();
    });

    it("should show checked state for selected labels", () => {
        render(<LabelSelector labels={mockLabels} selectedLabelIds={[1]} onToggle={mockToggle} />);
        const [checkbox1, checkbox2] = screen.getAllByRole("checkbox");

        expect(checkbox1).toHaveAttribute("aria-checked", "true");
        expect(checkbox2).toHaveAttribute("aria-checked", "false");
    });

    it("should call onToggle when clicked", () => {
        render(<LabelSelector labels={mockLabels} selectedLabelIds={[]} onToggle={mockToggle} />);
        const [checkbox1] = screen.getAllByRole("checkbox");
        fireEvent.click(checkbox1);
        expect(mockToggle).toHaveBeenCalledWith(1);
    });

    it("should display empty message when no labels", () => {
        render(<LabelSelector labels={[]} selectedLabelIds={[]} onToggle={mockToggle} />);
        expect(screen.getByText("No labels available")).toBeDefined();
    });
});
