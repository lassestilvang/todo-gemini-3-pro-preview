import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import { ScrollArea } from "./scroll-area";
import React from "react";

describe("ScrollArea", () => {
    afterEach(() => {
        cleanup();
    });

    it("should render content", () => {
        render(
            <ScrollArea className="h-[200px] w-[350px]">
                <div>Content</div>
            </ScrollArea>
        );
        expect(screen.getByText("Content")).toBeInTheDocument();
    });
});
