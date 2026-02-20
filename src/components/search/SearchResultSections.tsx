
import React from "react";
import Link from "next/link";
import { FolderOpen, Tag } from "lucide-react";

interface SearchResultListsProps {
    lists: Array<{
        id: number;
        name: string;
        color: string | null;
        description: string | null;
    }>;
}

export function SearchResultLists({ lists }: SearchResultListsProps) {
    if (lists.length === 0) return null;

    return (
        <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Lists ({lists.length})
            </h2>
            <div className="grid gap-2">
                {lists.map((list) => (
                    <Link
                        key={list.id}
                        href={`/lists/${list.id}`}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                    >
                        <div
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: list.color ?? "#000" }}
                        />
                        <div className="min-w-0">
                            <p className="font-medium truncate">{list.name}</p>
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
    );
}

interface SearchResultLabelsProps {
    labels: Array<{
        id: number;
        name: string;
        color: string | null;
    }>;
}

export function SearchResultLabels({ labels }: SearchResultLabelsProps) {
    if (labels.length === 0) return null;

    return (
        <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Labels ({labels.length})
            </h2>
            <div className="flex flex-wrap gap-2">
                {labels.map((label) => (
                    <Link
                        key={label.id}
                        href={`/labels/${label.id}`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-card hover:bg-accent transition-colors text-sm"
                    >
                        <div
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: label.color ?? "#000" }}
                        />
                        {label.name}
                    </Link>
                ))}
            </div>
        </section>
    );
}
