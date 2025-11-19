import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import { Avatar, AvatarImage, AvatarFallback } from "./avatar";
import React from "react";

describe("Avatar", () => {
    afterEach(() => {
        cleanup();
    });

    it("should render fallback when image is missing", () => {
        render(
            <Avatar>
                <AvatarFallback>JD</AvatarFallback>
            </Avatar>
        );
        expect(screen.getByText("JD")).toBeInTheDocument();
    });

    it("should render image when src is provided", async () => {
        // Mock Image to simulate loading
        const originalImage = window.Image;
        // @ts-expect-error - Testing invalid variant
        window.Image = class {
            onload: () => void = () => { };
            src: string = "";
            addEventListener(event: string, callback: () => void) {
                if (event === 'load') {
                    this.onload = callback;
                }
            }
            removeEventListener() { }
            constructor() {
                setTimeout(() => {
                    this.onload();
                }, 50);
            }
        };

        render(
            <Avatar>
                <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                <AvatarFallback>CN</AvatarFallback>
            </Avatar>
        );

        // Wait for image to appear
        const img = await screen.findByAltText("@shadcn");
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute("src", "https://github.com/shadcn.png");

        // Restore Image
        window.Image = originalImage;
    });
});
