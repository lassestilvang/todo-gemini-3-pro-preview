"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { Link, Lock, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

type BlockerType = {
    id: number;
    title: string;
    isCompleted: boolean | null;
};

interface TaskDependenciesTabProps {
    blockers: BlockerType[];
    searchResults: BlockerType[];
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    blockerSearchOpen: boolean;
    setBlockerSearchOpen: (open: boolean) => void;
    handleAddBlocker: (id: number) => void;
    handleRemoveBlocker: (id: number) => void;
}

export function TaskDependenciesTab({
    blockers,
    searchResults,
    searchQuery,
    setSearchQuery,
    blockerSearchOpen,
    setBlockerSearchOpen,
    handleAddBlocker,
    handleRemoveBlocker
}: TaskDependenciesTabProps) {
    return (
        <TabsContent value="dependencies" className="space-y-6">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Blocked By</h3>
                    <Popover open={blockerSearchOpen} onOpenChange={setBlockerSearchOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                                <Link className="h-4 w-4" />
                                Add Blocker
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0" align="end">
                            <Command>
                                <CommandInput
                                    placeholder="Search tasks..."
                                    value={searchQuery}
                                    onValueChange={setSearchQuery}
                                />
                                <CommandList>
                                    <CommandEmpty>No tasks found.</CommandEmpty>
                                    <CommandGroup>
                                        {searchResults.map((result) => (
                                            <CommandItem
                                                key={result.id}
                                                onSelect={() => handleAddBlocker(result.id)}
                                            >
                                                <span className={cn("mr-2", result.isCompleted && "line-through text-muted-foreground")}>
                                                    {result.title}
                                                </span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="space-y-2">
                    {blockers.map(blocker => (
                        <div key={blocker.id} className="flex items-center justify-between border p-3 rounded-md">
                            <div className="flex items-center gap-2">
                                <Lock className="h-4 w-4 text-orange-500" />
                                <span className={cn("text-sm", blocker.isCompleted && "line-through text-muted-foreground")}>
                                    {blocker.title}
                                </span>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveBlocker(blocker.id)}
                                className="h-8 w-8"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                    {blockers.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                            No dependencies. This task is not blocked.
                        </div>
                    )}
                </div>
            </div>
        </TabsContent>
    );
}
