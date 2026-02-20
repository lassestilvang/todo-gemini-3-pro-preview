
import React from "react";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActivityLogEmptyProps {
    searchQuery: string;
    typeFilter: string;
    onClearFilters: () => void;
}

export function ActivityLogEmpty({ searchQuery, typeFilter, onClearFilters }: ActivityLogEmptyProps) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in slide-in-from-bottom-4">
            <div className="h-20 w-20 rounded-full bg-muted/20 flex items-center justify-center mb-4">
                <History className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold">No activity found</h2>
            <p className="text-muted-foreground max-w-xs mx-auto mt-2">
                {searchQuery || typeFilter !== "all"
                    ? "Try adjusting your filters to find what you&apos;re looking for."
                    : "Activities will show up here as you use the app."}
            </p>
            {(searchQuery || typeFilter !== "all") && (
                <Button
                    variant="ghost"
                    className="mt-4"
                    onClick={onClearFilters}
                >
                    Clear all filters
                </Button>
            )}
        </div>
    );
}
