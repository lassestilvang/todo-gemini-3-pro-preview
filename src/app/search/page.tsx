import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { searchAll } from "@/lib/actions/search";
import { SearchPageClient } from "@/components/search/SearchPageClient";
import { getLists } from "@/lib/actions/lists";
import { getLabels } from "@/lib/actions/labels";

async function SearchResults({
    userId,
    searchParams,
}: {
    userId: string;
    searchParams: Record<string, string | string[] | undefined>;
}) {
    const q = typeof searchParams.q === "string" ? searchParams.q : "";
    const listId = searchParams.listId
        ? Number(searchParams.listId)
        : undefined;
    const labelId = searchParams.labelId
        ? Number(searchParams.labelId)
        : undefined;
    const priority = (
        typeof searchParams.priority === "string"
            ? searchParams.priority
            : undefined
    ) as "none" | "low" | "medium" | "high" | undefined;
    const status = (
        typeof searchParams.status === "string"
            ? searchParams.status
            : undefined
    ) as "all" | "completed" | "active" | undefined;
    const sort = (
        typeof searchParams.sort === "string"
            ? searchParams.sort
            : undefined
    ) as "relevance" | "created" | "due" | "priority" | undefined;
    const sortOrder = (
        typeof searchParams.sortOrder === "string"
            ? searchParams.sortOrder
            : undefined
    ) as "asc" | "desc" | undefined;

    const [results, allLists, allLabels] = await Promise.all([
        q
            ? searchAll(userId, q, {
                  listId,
                  labelId,
                  priority,
                  status,
                  sort,
                  sortOrder,
              })
            : null,
        getLists(userId),
        getLabels(userId),
    ]);

    return (
        <SearchPageClient
            userId={userId}
            initialQuery={q}
            initialResults={results}
            allLists={allLists}
            allLabels={allLabels}
            initialFilters={{
                listId,
                labelId,
                priority,
                status,
                sort,
                sortOrder,
            }}
        />
    );
}

export default async function SearchPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const user = await getCurrentUser();
    if (!user) redirect("/login");

    const params = await searchParams;

    return (
        <div className="container max-w-4xl py-6 lg:py-10">
            <Suspense fallback={<SearchSkeleton />}>
                <SearchResults userId={user.id} searchParams={params} />
            </Suspense>
        </div>
    );
}

function SearchSkeleton() {
    return (
        <div className="flex flex-col gap-8">
            <div>
                <div className="h-9 w-48 rounded bg-muted animate-pulse" />
                <div className="h-4 w-64 rounded bg-muted animate-pulse mt-2" />
            </div>
            <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
            <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-16 w-full rounded-md bg-muted animate-pulse"
                    />
                ))}
            </div>
        </div>
    );
}
