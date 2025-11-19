import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { DatePicker } from "./date-picker";
import React from "react";

describe("DatePicker", () => {
    afterEach(() => {
        cleanup();
        document.body.innerHTML = "";
    });

    it("should render trigger", () => {
        render(<DatePicker />);
        expect(screen.getByText("Pick a date")).toBeInTheDocument();
    });

    it("should open calendar when clicked", async () => {
        render(<DatePicker />);
        fireEvent.click(screen.getByText("Pick a date"));

        await waitFor(() => {
            expect(screen.getByRole("grid")).toBeInTheDocument();
        });
    });
});
