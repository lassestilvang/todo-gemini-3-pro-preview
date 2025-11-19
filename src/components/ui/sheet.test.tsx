import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./sheet";
import React from "react";

describe("Sheet", () => {
    afterEach(() => {
        cleanup();
        document.body.innerHTML = "";
    });

    it("should render trigger", () => {
        render(
            <Sheet>
                <SheetTrigger>Open Sheet</SheetTrigger>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Title</SheetTitle>
                        <SheetDescription>Description</SheetDescription>
                    </SheetHeader>
                </SheetContent>
            </Sheet>
        );
        expect(screen.getByText("Open Sheet")).toBeInTheDocument();
    });

    it("should open content when trigger is clicked", async () => {
        render(
            <Sheet>
                <SheetTrigger>Open Sheet</SheetTrigger>
                <SheetContent>
                    <SheetTitle>Sheet Title</SheetTitle>
                    <SheetDescription>Sheet Description</SheetDescription>
                    <div>Sheet Content</div>
                </SheetContent>
            </Sheet>
        );

        fireEvent.click(screen.getByText("Open Sheet"));

        await waitFor(() => {
            expect(screen.getByText("Sheet Content")).toBeInTheDocument();
        });
    });
});
