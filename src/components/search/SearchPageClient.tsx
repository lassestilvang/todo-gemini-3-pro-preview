"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Search,
    X,
    ListTodo,
    Tag,
    Loader2,
    FolderOpen,
    SlidersHorizontal,
    CheckCircle,
    Circle,
    AlertCircle,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { TaskItem } from "@/components/tasks/TaskItem";
import { cn } from "@/lib/utils";
import { searchAll, type SearchAllResponse } from "@/lib/actions/search";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { Task } from "@/lib/types";
import type { TaskType } from "@/components/tasks/hooks/useTaskForm";

const TaskDialog = dynamic(
    () =>
        import("@/components/tasks/TaskDialog").then((mod) => mod.TaskDialog),
    {
        ssr: false,
    }
);

interface SearchFilters {
    listId?: number | null;
    labelId?: number;
    priority?: "none" | "low" | "medium" | "high";
    status?: "all" | "completed" | "active";
    sort?: "relevance" | "created" | "due" | "priority";
    sortOrder?: "asc" | "desc";
}

interface SearchPageClientProps {
    userId: string;
    initialQuery: string;
    initialResults: SearchAllResponse | null;
    allLists: Array<{
        id: number;
        name: string;
        color: string | null;
        icon: string | null;
        slug: string;
    }>;
    allLabels: Array<{
        id: number;
        name: string;
        color: string | null;
        icon: string | null;
    }>;
    initialFilters: SearchFilters;
}

export function SearchPageClient({
    userId,
    initialQuery,
    initialResults,
    allLists,
    allLabels,
    initialFilters,
}: SearchPageClientProps) {
    const router = useRouter();
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<SearchAllResponse | null>(
        initialResults
    );
    const [taskResults, setTaskResults] = useState<
        SearchAllResponse["tasks"]
    >(initialResults?.tasks ?? []);
    const [cursor, setCursor] = useState<number | null>(
        initialResults?.nextCursor ?? null
    );
    const [hasMore, setHasMore] = useState(
        initialResults?.hasMore ?? false
    );
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<SearchFilters>(initialFilters);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        queueMicrotask(() => {
            setQuery(initialQuery);
            if (!initialQuery) {
                inputRef.current?.focus();
            }
        });
    }, [initialQuery]);

    const buildUrl = useCallback((q: string, f: SearchFilters) => {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (f.listId !== undefined && f.listId !== null)
            params.set("listId", String(f.listId));
        if (f.labelId) params.set("labelId", String(f.labelId));
        if (f.priority) params.set("priority", f.priority);
        if (f.status && f.status !== "all") params.set("status", f.status);
        if (f.sort && f.sort !== "relevance") params.set("sort", f.sort);
        if (f.sortOrder && f.sortOrder !== "desc")
            params.set("sortOrder", f.sortOrder);
        return `/search?${params.toString()}`;
    }, []);

    const handleSearch = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            const trimmed = query.trim();
            if (!trimmed) return;
            router.push(buildUrl(trimmed, filters));
        },
        [query, filters, router, buildUrl]
    );

    const updateFilter = useCallback(
        <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
            const newFilters = { ...filters, [key]: value };
            setFilters(newFilters);
            if (query.trim()) {
                router.push(buildUrl(query.trim(), newFilters));
            }
        },
        [filters, query, router, buildUrl]
    );

    const clearFilters = useCallback(() => {
        const cleared: SearchFilters = {};
        setFilters(cleared);
        if (query.trim()) {
            router.push(buildUrl(query.trim(), cleared));
        }
    }, [query, router, buildUrl]);

    useEffect(() => {
        queueMicrotask(() => {
            setResults(initialResults);
            setTaskResults(initialResults?.tasks ?? []);
            setCursor(initialResults?.nextCursor ?? null);
            setHasMore(initialResults?.hasMore ?? false);
        });
    }, [initialResults]);

    const loadMore = useCallback(async () => {
        if (!cursor || isLoadingMore || !query.trim()) return;
        setIsLoadingMore(true);
        const more = await searchAll(userId, query.trim(), {
            ...filters,
            cursor,
        }).catch((error) => {
            console.error("Failed to load more search results:", error);
            return null;
        });

        if (more) {
            setTaskResults((prev) => [...prev, ...more.tasks]);
            setCursor(more.nextCursor);
            setHasMore(more.hasMore);
        }

        setIsLoadingMore(false);
    }, [cursor, isLoadingMore, query, userId, filters]);

    useEffect(() => {
        if (!sentinelRef.current || !hasMore) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) loadMore();
            },
            { rootMargin: "200px" }
        );
        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [hasMore, loadMore]);

    const hasActiveFilters =
        filters.listId !== undefined ||
        filters.labelId !== undefined ||
        filters.priority !== undefined ||
        (filters.status && filters.status !== "all") ||
        (filters.sort && filters.sort !== "relevance");

    const handleEditTask = useCallback((task: Task) => {
        setEditingTask(task);
    }, []);

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Search</h1>
                <p className="text-muted-foreground">
                    Search across tasks, lists, and labels.
                </p>
            </div>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    ref={inputRef}
                    type="text"
                    placeholder="Search tasks, lists, labels..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="h-11 pl-9 pr-10 text-base"
                />
                {query && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => {
                            setQuery("");
                            inputRef.current?.focus();
                        }}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </form>

            {/* Filter toggle + active filter badges */}
            <div className="flex items-center gap-2 flex-wrap">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn(
                        hasActiveFilters && "border-primary text-primary"
                    )}
                >
                    <SlidersHorizontal className="mr-2 h-3.5 w-3.5" />
                    Filters
                    {showFilters ? (
                        <ChevronUp className="ml-1 h-3.5 w-3.5" />
                    ) : (
                        <ChevronDown className="ml-1 h-3.5 w-3.5" />
                    )}
                </Button>
                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="text-muted-foreground"
                    >
                        Clear all
                    </Button>
                )}
                {filters.listId !== undefined && filters.listId !== null && (
                    <Badge variant="secondary" className="gap-1">
                        <FolderOpen className="h-3 w-3" />
                        {allLists.find((l) => l.id === filters.listId)?.name ??
                            "List"}
                        <button
                            onClick={() => updateFilter("listId", undefined)}
                            className="ml-1 hover:text-foreground"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                )}
                {filters.labelId && (
                    <Badge variant="secondary" className="gap-1">
                        <Tag className="h-3 w-3" />
                        {allLabels.find((l) => l.id === filters.labelId)
                            ?.name ?? "Label"}
                        <button
                            onClick={() => updateFilter("labelId", undefined)}
                            className="ml-1 hover:text-foreground"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                )}
                {filters.priority && (
                    <Badge variant="secondary" className="gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {filters.priority}
                        <button
                            onClick={() =>
                                updateFilter("priority", undefined)
                            }
                            className="ml-1 hover:text-foreground"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                )}
                {filters.status && filters.status !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                        {filters.status === "completed" ? (
                            <CheckCircle className="h-3 w-3" />
                        ) : (
                            <Circle className="h-3 w-3" />
                        )}
                        {filters.status}
                        <button
                            onClick={() => updateFilter("status", undefined)}
                            className="ml-1 hover:text-foreground"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                )}
            </div>

            {/* Filters panel */}
            {showFilters && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-lg border bg-card">
                    <div className="space-y-1.5">
                        <label htmlFor="search-filter-list" className="text-xs font-medium text-muted-foreground">
                            List
                        </label>
                        <Select
                            value={
                                filters.listId !== undefined &&
                                filters.listId !== null
                                    ? String(filters.listId)
                                    : "all"
                            }
                            onValueChange={(v) =>
                                updateFilter(
                                    "listId",
                                    v === "all" ? undefined : Number(v)
                                )
                            }
                        >
                            <SelectTrigger id="search-filter-list" className="h-8">
                                <SelectValue placeholder="All lists" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All lists</SelectItem>
                                {allLists.map((l) => (
                                    <SelectItem
                                        key={l.id}
                                        value={String(l.id)}
                                    >
                                        {l.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="search-filter-label" className="text-xs font-medium text-muted-foreground">
                            Label
                        </label>
                        <Select
                            value={
                                filters.labelId
                                    ? String(filters.labelId)
                                    : "all"
                            }
                            onValueChange={(v) =>
                                updateFilter(
                                    "labelId",
                                    v === "all" ? undefined : Number(v)
                                )
                            }
                        >
                            <SelectTrigger id="search-filter-label" className="h-8">
                                <SelectValue placeholder="All labels" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All labels</SelectItem>
                                {allLabels.map((l) => (
                                    <SelectItem
                                        key={l.id}
                                        value={String(l.id)}
                                    >
                                        {l.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="search-filter-priority" className="text-xs font-medium text-muted-foreground">
                            Priority
                        </label>
                        <Select
                            value={filters.priority ?? "all"}
                            onValueChange={(v) =>
                                updateFilter(
                                    "priority",
                                    v === "all"
                                        ? undefined
                                        : (v as SearchFilters["priority"])
                                )
                            }
                        >
                            <SelectTrigger id="search-filter-priority" className="h-8">
                                <SelectValue placeholder="Any priority" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    Any priority
                                </SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="none">None</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="search-filter-status" className="text-xs font-medium text-muted-foreground">
                            Status
                        </label>
                        <Select
                            value={filters.status ?? "all"}
                            onValueChange={(v) =>
                                updateFilter(
                                    "status",
                                    v as SearchFilters["status"]
                                )
                            }
                        >
                            <SelectTrigger id="search-filter-status" className="h-8">
                                <SelectValue placeholder="Any status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="completed">
                                    Completed
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="search-filter-sort" className="text-xs font-medium text-muted-foreground">
                            Sort by
                        </label>
                        <Select
                            value={filters.sort ?? "relevance"}
                            onValueChange={(v) =>
                                updateFilter(
                                    "sort",
                                    v as SearchFilters["sort"]
                                )
                            }
                        >
                            <SelectTrigger id="search-filter-sort" className="h-8">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="relevance">
                                    Relevance
                                </SelectItem>
                                <SelectItem value="created">
                                    Created date
                                </SelectItem>
                                <SelectItem value="due">Due date</SelectItem>
                                <SelectItem value="priority">
                                    Priority
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="search-filter-order" className="text-xs font-medium text-muted-foreground">
                            Order
                        </label>
                        <Select
                            value={filters.sortOrder ?? "desc"}
                            onValueChange={(v) =>
                                updateFilter(
                                    "sortOrder",
                                    v as SearchFilters["sortOrder"]
                                )
                            }
                        >
                            <SelectTrigger id="search-filter-order" className="h-8">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="desc">
                                    Newest first
                                </SelectItem>
                                <SelectItem value="asc">
                                    Oldest first
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

            {/* Empty state */}
            {!initialQuery && !results && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Search className="h-12 w-12 mb-4 opacity-20" />
                    <p className="text-lg font-medium">Search your tasks</p>
                    <p className="text-sm">
                        Find tasks, lists, and labels by name or description.
                    </p>
                    <p className="text-xs mt-2">
                        Tip: Use{" "}
                        <kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px] font-mono">
                            ⌘K
                        </kbd>{" "}
                        for quick command palette
                    </p>
                </div>
            )}

            {/* Results */}
            {results && initialQuery && (
                <div className="flex flex-col gap-8">
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight">
                            Results for &ldquo;<span className="text-primary">{initialQuery}</span>&rdquo;
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {results.totalTasks} task{results.totalTasks !== 1 ? "s" : ""}
                            {" · "}{results.lists.length} list{results.lists.length !== 1 ? "s" : ""}
                            {" · "}{results.labels.length} label{results.labels.length !== 1 ? "s" : ""}
                        </p>
                    </div>

                    {/* Lists section */}
                    {results.lists.length > 0 && (
                        <section>
                            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                <FolderOpen className="h-4 w-4" />
                                Lists ({results.lists.length})
                            </h2>
                            <div className="grid gap-2">
                                {results.lists.map((list) => (
                                    <Link
                                        key={list.id}
                                        href={`/lists/${list.id}`}
                                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                                    >
                                        <div
                                            className="h-3 w-3 rounded-full shrink-0"
                                            style={{
                                                backgroundColor:
                                                    list.color ?? "#000",
                                            }}
                                        />
                                        <div className="min-w-0">
                                            <p className="font-medium truncate">
                                                {list.name}
                                            </p>
                                            {list.description && (
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {list.description}
                                                </p>
                                            )}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Labels section */}
                    {results.labels.length > 0 && (
                        <section>
                            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Tag className="h-4 w-4" />
                                Labels ({results.labels.length})
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                {results.labels.map((label) => (
                                    <Link
                                        key={label.id}
                                        href={`/labels/${label.id}`}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-card hover:bg-accent transition-colors text-sm"
                                    >
                                        <div
                                            className="h-2.5 w-2.5 rounded-full shrink-0"
                                            style={{
                                                backgroundColor:
                                                    label.color ?? "#000",
                                            }}
                                        />
                                        {label.name}
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Tasks section */}
                    <section>
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                            <ListTodo className="h-4 w-4" />
                            Tasks ({results.totalTasks})
                        </h2>
                        {taskResults.length > 0 ? (
                            <div className="space-y-1">
                                {taskResults.map((task) => (
                                    <TaskItem
                                        key={task.id}
                                        task={task as Task}
                                        showListInfo
                                        userId={userId}
                                        onEdit={handleEditTask}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground py-4">
                                No tasks found.
                            </p>
                        )}

                        {hasMore && (
                            <div
                                ref={sentinelRef}
                                className="flex justify-center py-4"
                            >
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                        )}
                        {isLoadingMore && (
                            <div className="flex justify-center py-2">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                        )}
                    </section>

                    {/* No results at all */}
                    {results.totalTasks === 0 &&
                        results.lists.length === 0 &&
                        results.labels.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <Search className="h-10 w-10 mb-3 opacity-20" />
                                <p className="text-base font-medium">
                                    No results found
                                </p>
                                <p className="text-sm">
                                    Try a different search term or adjust your
                                    filters.
                                </p>
                            </div>
                        )}
                </div>
            )}

            {/* Task edit dialog */}
            {editingTask && (
                <TaskDialog
                    task={{ ...editingTask, icon: editingTask.icon ?? null } as TaskType}
                    open={!!editingTask}
                    onOpenChange={(open) => {
                        if (!open) setEditingTask(null);
                    }}
                    userId={userId}
                />
            )}
        </div>
    );
}
