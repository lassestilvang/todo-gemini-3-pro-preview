import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import React from "react";

describe("Tabs", () => {
    afterEach(() => {
        cleanup();
    });

    it("should render correctly", () => {
        render(
            <Tabs defaultValue="tab1">
                <TabsList>
                    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
                    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
                </TabsList>
                <TabsContent value="tab1">Content 1</TabsContent>
                <TabsContent value="tab2">Content 2</TabsContent>
            </Tabs>
        );

        expect(screen.getByText("Tab 1")).toBeInTheDocument();
        expect(screen.getByText("Content 1")).toBeInTheDocument();
        expect(screen.queryByText("Content 2")).not.toBeInTheDocument();
    });

    it("should switch tabs", async () => {
        render(
            <Tabs defaultValue="tab1">
                <TabsList>
                    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
                    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
                </TabsList>
                <TabsContent value="tab1">Content 1</TabsContent>
                <TabsContent value="tab2">Content 2</TabsContent>
            </Tabs>
        );

        const tab2 = screen.getByText("Tab 2");
        fireEvent.pointerDown(tab2);
        fireEvent.mouseDown(tab2);
        fireEvent.click(tab2);

        await waitFor(() => {
            expect(screen.getByText("Content 2")).toBeInTheDocument();
        });
        expect(screen.queryByText("Content 1")).not.toBeInTheDocument();
    });
});
