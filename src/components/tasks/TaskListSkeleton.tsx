export function TaskListSkeleton() {
    return (
        <div className="rounded-xl border border-border/50 bg-card/40 p-4">
            <div className="flex items-center justify-between gap-4">
                <div className="h-4 w-24 rounded bg-muted/60 animate-pulse" />
                <div className="h-8 w-20 rounded-md bg-muted/60 animate-pulse" />
            </div>
            <div className="mt-4 space-y-3">
                {Array.from({ length: 7 }).map((_, index) => (
                    <div
                        key={`task-skeleton-${index}`}
                        className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/30 px-3 py-3"
                    >
                        <div className="h-4 w-4 rounded-sm bg-muted/70 animate-pulse" />
                        <div className="h-4 flex-1 rounded bg-muted/70 animate-pulse" />
                        <div className="h-4 w-16 rounded bg-muted/70 animate-pulse" />
                    </div>
                ))}
            </div>
        </div>
    );
}
