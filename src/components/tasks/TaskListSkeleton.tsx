"use client";

type TaskListSkeletonVariant = "list" | "board" | "calendar";

interface TaskListSkeletonProps {
    variant?: TaskListSkeletonVariant;
    compact?: boolean;
    showModes?: boolean;
}

export function TaskListSkeleton({
    variant = "list",
    compact = false,
    showModes,
}: TaskListSkeletonProps) {
    const resolvedShowModes = showModes ?? !compact;
    const wrapperClassName = compact
        ? "space-y-4"
        : "rounded-xl border border-border/50 bg-card/40 p-4 space-y-4";

    return (
        <div className={wrapperClassName} aria-hidden="true">
            {!compact && (
                <div className="flex items-center justify-between gap-4">
                    <div className="h-4 w-28 rounded bg-muted/60 animate-pulse" />
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-20 rounded bg-muted/40 animate-pulse" />
                        <div className="h-8 w-20 rounded-md bg-muted/60 animate-pulse" />
                    </div>
                </div>
            )}

            {!compact && resolvedShowModes && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground/80">
                    {["List", "Board", "Calendar"].map((label) => (
                        <div
                            key={`mode-${label}`}
                            className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/10 px-2 py-1"
                        >
                            <span className="h-2.5 w-2.5 rounded bg-muted/60 animate-pulse" />
                            <span>{label}</span>
                        </div>
                    ))}
                </div>
            )}

            {variant === "board" ? (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-20 rounded bg-muted/50 animate-pulse" />
                        <div className="h-7 w-28 rounded-md bg-muted/60 animate-pulse" />
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, columnIndex) => (
                            <div
                                key={`board-column-${columnIndex}`}
                                className="rounded-lg border border-border/40 bg-muted/10 p-3 space-y-3"
                            >
                                <div className="h-3 w-20 rounded bg-muted/60 animate-pulse" />
                                {Array.from({ length: 3 }).map((__, cardIndex) => (
                                    <div
                                        key={`board-card-${columnIndex}-${cardIndex}`}
                                        className="rounded-md border border-border/40 bg-muted/30 p-3 space-y-2"
                                    >
                                        <div className="h-3 w-3/4 rounded bg-muted/70 animate-pulse" />
                                        <div className="h-2.5 w-1/2 rounded bg-muted/50 animate-pulse" />
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            ) : variant === "calendar" ? (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="h-5 w-32 rounded bg-muted/60 animate-pulse" />
                        <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-md bg-muted/60 animate-pulse" />
                            <div className="h-7 w-16 rounded-md bg-muted/50 animate-pulse" />
                            <div className="h-7 w-7 rounded-md bg-muted/60 animate-pulse" />
                        </div>
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                        {Array.from({ length: 35 }).map((_, index) => (
                            <div
                                key={`calendar-cell-${index}`}
                                className="rounded-md border border-border/40 bg-muted/10 p-2 space-y-2"
                            >
                                <div className="h-2.5 w-6 rounded bg-muted/60 animate-pulse" />
                                <div className="h-2 w-10 rounded bg-muted/40 animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {Array.from({ length: 7 }).map((_, index) => (
                        <div
                            key={`task-skeleton-${index}`}
                            className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/30 px-3 py-3"
                        >
                            <div className="h-4 w-4 rounded-sm bg-muted/70 animate-pulse" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-3/4 rounded bg-muted/70 animate-pulse" />
                                <div className="flex items-center gap-2">
                                    <div className="h-2.5 w-16 rounded bg-muted/50 animate-pulse" />
                                    <div className="h-2.5 w-12 rounded bg-muted/40 animate-pulse" />
                                </div>
                            </div>
                            <div className="h-6 w-6 rounded-md bg-muted/60 animate-pulse" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
