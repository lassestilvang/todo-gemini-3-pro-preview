import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { mockSetTheme } from "../../test/mocks";

describe("ThemeSwitcher", () => {
    afterEach(() => {
        cleanup();
        mockSetTheme.mockClear();
    });

    it("renders all theme options", () => {
        render(<ThemeSwitcher />);

        expect(screen.getByText("Light")).toBeDefined();
        expect(screen.getByText("Dark")).toBeDefined();
        expect(screen.getByText("Glassmorphism")).toBeDefined();
        expect(screen.getByText("Neubrutalism")).toBeDefined();
        expect(screen.getByText("Minimalist")).toBeDefined();
    });

    it("calls setTheme when a theme is clicked", () => {
        render(<ThemeSwitcher />);

        const darkThemeCard = screen.getByText("Dark");
        fireEvent.click(darkThemeCard);
        expect(mockSetTheme).toHaveBeenCalledWith("dark");

        const glassThemeCard = screen.getByText("Glassmorphism");
        fireEvent.click(glassThemeCard);
        expect(mockSetTheme).toHaveBeenCalledWith("glassmorphism");
    });
});
