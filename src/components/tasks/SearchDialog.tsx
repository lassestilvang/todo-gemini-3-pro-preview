"use client";

import * as React from "react";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { searchTasks } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

type SearchResult = {
    id: number;
    title: string;
    description: string | null;
};

export function SearchDialog() {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const [results, setResults] = React.useState<SearchResult[]>([]);
    const router = useRouter();

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
            if (e.key === "/" && !open) {
                const target = e.target as HTMLElement;
                if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
                    return;
                }
                e.preventDefault();
                setOpen(true);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, [open]);

    React.useEffect(() => {
        const search = async () => {
            if (query.trim().length > 0) {
                const data = await searchTasks(query);
                setResults(data);
            } else {
                setResults([]);
            }
        };
        const debounce = setTimeout(search, 300);
        return () => clearTimeout(debounce);
    }, [query]);

    const handleSelect = (taskId: number) => {
        setOpen(false);
        router.push(`?taskId=${taskId}`);
    };

    return (
        <>
            <Button
                variant="outline"
                className="w-full justify-start text-muted-foreground relative h-9 sm:pr-12"
                onClick={() => setOpen(true)}
            >
                <Search className="mr-2 h-4 w-4" />
                <span className="hidden lg:inline-flex">Search tasks...</span>
                <span className="inline-flex lg:hidden">Search...</span>
                <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </Button>
            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput
                    placeholder="Type a command or search..."
                    value={query}
                    onValueChange={setQuery}
                />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup heading="Commands">
                        <CommandItem onSelect={() => {
                            setOpen(false);
                            router.push("/");
                        }}>
                            <div className="flex items-center gap-2">
                                <span className="font-medium">Go to Inbox</span>
                            </div>
                        </CommandItem>
                        <CommandItem onSelect={() => {
                            setOpen(false);
                            // Focus the main input if possible, or just go to home
                            router.push("/");
                            setTimeout(() => {
                                (document.querySelector('input[placeholder*="Add a task"]') as HTMLInputElement)?.focus();
                            }, 100);
                        }}>
                            <div className="flex items-center gap-2">
                                <span className="font-medium">Create New Task</span>
                            </div>
                        </CommandItem>
                    </CommandGroup>
                    {results.length > 0 && (
                        <CommandGroup heading="Tasks">
                            {results.map((task) => (
                                <CommandItem
                                    key={task.id}
                                    value={`${task.title} ${task.description}`}
                                    onSelect={() => handleSelect(task.id)}
                                >
                                    <div className="flex flex-col">
                                        <span>{task.title}</span>
                                        {task.description && (
                                            <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                                                {task.description}
                                            </span>
                                        )}
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}
                </CommandList>
            </CommandDialog>
        </>
    );
}
