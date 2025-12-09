import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import { Progress } from "./progress";
import React from "react";

describe("Progress", () => {
    afterEach(() => {
        cleanup();
    });

    it("should render correctly", () => {
        render(<Progress value={50} />);
        const progress = screen.getByRole("progressbar");
        expect(progress).toBeInTheDocument();
    });

    it("should display correct value via indicator transform", () => {
        render(<Progress value={75} />);
        const indicator = document.querySelector('[data-slot="progress-indicator"]');
        expect(indicator).toBeInTheDocument();
        // The indicator uses translateX to show progress
        expect(indicator?.getAttribute("style")).toContain("translateX(-25%)");
    });

    it("should handle 0 value", () => {
        render(<Progress value={0} />);
        const indicator = document.querySelector('[data-slot="progress-indicator"]');
        expect(indicator?.getAttribute("style")).toContain("translateX(-100%)");
    });

    it("should handle 100 value", () => {
        render(<Progress value={100} />);
        const indicator = document.querySelector('[data-slot="progress-indicator"]');
        expect(indicator?.getAttribute("style")).toContain("translateX(-0%)");
    });

    it("should apply custom className", () => {
        render(<Progress value={50} className="custom-class" />);
        const progress = screen.getByRole("progressbar");
        expect(progress.className).toContain("custom-class");
    });

    it("should apply custom indicator className", () => {
        render(<Progress value={50} indicatorClassName="custom-indicator" />);
        const indicator = document.querySelector('[data-slot="progress-indicator"]');
        expect(indicator?.className).toContain("custom-indicator");
    });
});
