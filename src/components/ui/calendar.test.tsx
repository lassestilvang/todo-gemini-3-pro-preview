import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import { Calendar } from "./calendar";
import React from "react";

describe("Calendar", () => {
    afterEach(() => {
        cleanup();
    });

    it("should render correctly", () => {
        render(<Calendar mode="single" />);
        // Calendar usually renders a table
        expect(screen.getByRole("grid")).toBeInTheDocument();
    });
});
