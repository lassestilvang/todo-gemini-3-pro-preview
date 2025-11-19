import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./card";
import React from "react";

describe("Card", () => {
    afterEach(() => {
        cleanup();
    });

    it("should render correctly", () => {
        render(
            <Card>
                <CardHeader>
                    <CardTitle>Card Title</CardTitle>
                    <CardDescription>Card Description</CardDescription>
                </CardHeader>
                <CardContent>Card Content</CardContent>
                <CardFooter>Card Footer</CardFooter>
            </Card>
        );

        expect(screen.getByText("Card Title")).toBeInTheDocument();
        expect(screen.getByText("Card Description")).toBeInTheDocument();
        expect(screen.getByText("Card Content")).toBeInTheDocument();
        expect(screen.getByText("Card Footer")).toBeInTheDocument();
    });
});
