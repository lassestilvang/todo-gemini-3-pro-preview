
import { describe, it, expect, afterEach, mock } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import { IconPickerIconsTab } from "./icon-picker/IconsTab";
import { COMMON_COLORS } from "./icon-picker/types";
import { Tabs } from "./tabs";
import React from "react";

// Mock ResolvedIcon is now handled globally in src/test/setup.tsx via src/test/mocks-ui.tsx

describe("IconPickerIconsTab", () => {
    afterEach(() => {
        cleanup();
    });

    const mockDispatch = mock(() => {});
    const mockHandleSelectIcon = mock(() => {});
    const mockState = {
        selectedColor: null,
        open: true,
        searchQuery: "",
        activeTab: "icons" as const,
        customIcons: [],
        uploadName: "",
        uploadUrl: "",
        isUploading: false,
        isLoading: false,
        recentIcons: [],
        isDragging: false,
    };

    const filteredStandardIcons = [
        { name: "activity", tags: ["pulse", "health", "action", "motion"] },
        { name: "airplay", tags: ["stream", "cast", "mirroring", "tv"] },
    ];

    it("renders color selection buttons with accessible labels", () => {
        render(
            <Tabs defaultValue="icons">
                <IconPickerIconsTab
                    state={mockState}
                    dispatch={mockDispatch}
                    filteredStandardIcons={filteredStandardIcons}
                    handleSelectIcon={mockHandleSelectIcon}
                />
            </Tabs>
        );

        // Check color buttons
        COMMON_COLORS.forEach((color) => {
            const button = screen.getByLabelText(`Select ${color} color`);
            expect(button).toBeInTheDocument();
            expect(button.getAttribute("aria-pressed")).toBe("false");
        });

        // Check "None" button
        const noneButton = screen.getByLabelText("Clear color selection");
        expect(noneButton).toBeInTheDocument();
        expect(noneButton.getAttribute("aria-pressed")).toBe("true"); // selectedColor is null
    });

    it("renders icon buttons with accessible labels", () => {
        render(
             <Tabs defaultValue="icons">
                <IconPickerIconsTab
                    state={mockState}
                    dispatch={mockDispatch}
                    filteredStandardIcons={filteredStandardIcons}
                    handleSelectIcon={mockHandleSelectIcon}
                />
            </Tabs>
        );

        filteredStandardIcons.forEach((icon) => {
            const button = screen.getByLabelText(`Select ${icon.name} icon`);
            expect(button).toBeInTheDocument();
        });
    });

    it("updates aria-pressed when a color is selected", () => {
        const selectedColor = COMMON_COLORS[0];
        const stateWithColor = { ...mockState, selectedColor };

        render(
             <Tabs defaultValue="icons">
                <IconPickerIconsTab
                    state={stateWithColor}
                    dispatch={mockDispatch}
                    filteredStandardIcons={filteredStandardIcons}
                    handleSelectIcon={mockHandleSelectIcon}
                />
            </Tabs>
        );

        const selectedButton = screen.getByLabelText(`Select ${selectedColor} color`);
        expect(selectedButton.getAttribute("aria-pressed")).toBe("true");

        const noneButton = screen.getByLabelText("Clear color selection");
        expect(noneButton.getAttribute("aria-pressed")).toBe("false");
    });
});
