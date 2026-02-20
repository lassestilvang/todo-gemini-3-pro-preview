
"use client";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, { useCallback, useEffect, useRef, Suspense, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, ListTodo, Loader2 } from "lucide-react";
import { TaskItem } from "@/components/tasks/TaskItem";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { cn } from "@/lib/utils";
import { searchAll, type SearchAllResponse } from "@/lib/actions/search";
import dynamic from "next/dynamic";
import type { Task } from "@/lib/types";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { GroupedVirtuoso } from "react-virtuoso";
import type { TaskType } from "@/components/tasks/hooks/useTaskForm";
import { SearchFilters, SearchFiltersPanel } from "./SearchFiltersPanel";
import { SearchResultLists, SearchResultLabels } from "./SearchResultSections";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { SearchAction, searchReducer } from "@/lib/search/search-reducer";
import { useIsClient } from "@/hooks/use-is-client";
import { useUser } from "@/components/providers/UserProvider";
import { usePerformanceMode } from "@/components/providers/PerformanceContext";
import { useSync } from "@/components/providers/sync-provider";

const TaskDialog = dynamic(
    () => import("@/components/tasks/TaskDialog").then((mod) => mod.TaskDialog),
    { ssr: false }
);

interface SearchPageClientProps {
    userId: string;
    initialQuery: string;
    initialResults: SearchAllResponse | null;
    allLists: Array<{ id: number; name: string; color: string | null; icon: string | null; slug: string }>;
    allLabels: Array<{ id: number; name: string; color: string | null; icon: string | null }>;
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

    const [state, dispatch] = React.useReducer(searchReducer, {
        query: initialQuery,
        results: initialResults,
        taskResults: initialResults?.tasks ?? [],
        cursor: initialResults?.nextCursor ?? null,
        hasMore: initialResults?.hasMore ?? false,
        isLoadingMore: false,
        showFilters: false,
        filters: initialFilters,
        editingTask: null,
        prevInitialQuery: initialQuery,
        prevInitialResults: initialResults,
    });

    const { query, results, taskResults, cursor, hasMore, isLoadingMore, showFilters, filters, editingTask } = state;
    const sentinelRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const isClient = useIsClient();
    const { use24HourClock, weekStartsOnMonday } = useUser();
    const isPerformanceMode = usePerformanceMode();
    const { dispatch: syncDispatch } = useSync();

    const [now, setNow] = React.useState(() => new Date());
    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    const userPreferences = useMemo(() => ({
        use24HourClock: use24HourClock ?? false,
        weekStartsOnMonday: weekStartsOnMonday ?? true
    }), [use24HourClock, weekStartsOnMonday]);

    useEffect(() => {
        if (!initialQuery) inputRef.current?.focus();
    }, [initialQuery]);

    if (initialQuery !== state.prevInitialQuery || initialResults !== state.prevInitialResults) {
        dispatch({ type: 'SYNC_PROPS', query: initialQuery, results: initialResults });
    }

    const loadMore = useCallback(async () => {
        if (!cursor || isLoadingMore || !query.trim()) return;
        dispatch({ type: 'LOAD_MORE_START' });
        const more = await searchAll(userId, query.trim(), { ...filters, cursor }).catch(() => null);
        if (more) {
            dispatch({ type: 'LOAD_MORE_SUCCESS', payload: { tasks: more.tasks, nextCursor: more.nextCursor, hasMore: more.hasMore } });
        } else {
            dispatch({ type: 'LOAD_MORE_ERROR' });
        }
    }, [cursor, isLoadingMore, query, userId, filters]);

    useEffect(() => {
        if (!sentinelRef.current || !hasMore) return;
        const observer = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) loadMore(); }, { rootMargin: "200px" });
        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [hasMore, loadMore]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams(window.location.search);
        if (query.trim()) params.set("q", query.trim()); else params.delete("q");
        router.push(`/search?${params.toString()}`);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateFilter = (key: keyof SearchFilters, value: any) => {
        const params = new URLSearchParams(window.location.search);
        if (value === undefined || value === null || value === "all" || value === "") params.delete(key); else params.set(key, String(value));
        router.push(`/search?${params.toString()}`);
    };

    const clearFilters = () => {
        const params = new URLSearchParams(window.location.search);
        ["listId", "labelId", "priority", "status", "sort", "sortOrder"].forEach(k => params.delete(k));
        router.push(`/search?${params.toString()}`);
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const navigateToTask = (taskId: number) => router.push(`/search?taskId=${taskId}`);

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Search</h1>
                <p className="text-muted-foreground">Search across tasks, lists, and labels.</p>
            </div>

            <form onSubmit={handleSearch} className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    ref={inputRef}
                    type="text"
                    placeholder="Search tasks, lists, labels..."
                    value={query}
                    onChange={(e) => dispatch({ type: 'SET_QUERY', payload: e.target.value })}
                    className="h-11 pl-9 pr-10 text-base"
                />
                {query && (
                    <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => { dispatch({ type: 'SET_QUERY', payload: "" }); inputRef.current?.focus(); }}>
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </form>

            <SearchFiltersPanel
                filters={filters}
                showFilters={showFilters}
                onToggleFilters={() => dispatch({ type: 'TOGGLE_FILTERS' })}
                onUpdateFilter={updateFilter}
                onClearFilters={clearFilters}
                allLists={allLists}
                allLabels={allLabels}
            />

            {!initialQuery && !results ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Search className="h-12 w-12 mb-4 opacity-20" />
                    <p className="text-lg font-medium">Search your tasks</p>
                    <p className="text-sm">Find tasks, lists, and labels by name or description.</p>
                    <p className="text-xs mt-2">Tip: Use <kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px] font-mono">⌘K</kbd> for quick command palette</p>
                </div>
            ) : results && initialQuery ? (
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

                    <SearchResultLists lists={results.lists} />
                    <SearchResultLabels labels={results.labels} />

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
                                        onEdit={(t) => dispatch({ type: 'SET_EDITING_TASK', payload: t })}
                                        now={now}
                                        isClient={isClient}
                                        performanceMode={isPerformanceMode}
                                        userPreferences={userPreferences}
                                        dispatch={syncDispatch}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground py-4">No tasks found.</p>
                        )}

                        {hasMore && <div ref={sentinelRef} className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
                        {isLoadingMore && <div className="flex justify-center py-2"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
                    </section>
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8">
                    <Search className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-lg font-medium">No results found</p>
                    <p className="text-sm">Try adjusting your search or filters</p>
                </div>
            )}

            {editingTask && (
                <TaskDialog
                    task={{ ...editingTask, icon: editingTask.icon ?? null } as TaskType}
                    open={!!editingTask}
                    onOpenChange={(open) => { if (!open) dispatch({ type: 'SET_EDITING_TASK', payload: null }); }}
                    userId={userId}
                />
            )}
        </div>
    );
}
