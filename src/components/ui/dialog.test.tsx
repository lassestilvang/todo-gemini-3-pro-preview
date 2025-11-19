import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";
import React from "react";

describe("Dialog", () => {
    afterEach(() => {
        cleanup();
        document.body.innerHTML = "";
    });

    it("should render trigger", () => {
        render(
            <Dialog>
                <DialogTrigger>Open Dialog</DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Title</DialogTitle>
                        <DialogDescription>Description</DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        );
        expect(screen.getByText("Open Dialog")).toBeInTheDocument();
    });

    it("should open content when trigger is clicked", async () => {
        render(
            <Dialog>
                <DialogTrigger>Open Dialog</DialogTrigger>
                <DialogContent>
                    <DialogTitle>Dialog Title</DialogTitle>
                    <DialogDescription>Dialog Description</DialogDescription>
                    <div>Dialog Content</div>
                </DialogContent>
            </Dialog>
        );

        fireEvent.click(screen.getByText("Open Dialog"));

        await waitFor(() => {
            expect(screen.getByText("Dialog Content")).toBeInTheDocument();
        });
    });
});
