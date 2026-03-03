"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { mainNav } from "./sidebar/SidebarNavigation";
import { ResolvedIcon } from "@/components/ui/resolved-icon";
import { useTaskCounts } from "@/hooks/use-task-counts";
import {
    PanelLeftClose,
    PanelLeftOpen,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

type List = {
    id: number;
    name: string;
    color: string | null;
    icon: string | null;
    slug: string;
};

type Label = {
    id: number;
    name: string;
    color: string | null;
    icon: string | null;
};

interface SlimSidebarProps {
    lists: List[];
    labels: Label[];
    onExpand: () => void;
    onHide: () => void;
    active?: boolean;
}

export function SlimSidebar({ lists, labels, onExpand, onHide, active = true }: SlimSidebarProps) {
    const pathname = usePathname();
    const { inbox, today, upcoming, total, listCounts, labelCounts } = useTaskCounts(active);

    const getCount = (href: string) => {
        switch (href) {
            case "/inbox": return inbox;
            case "/today": return today;
            case "/upcoming": return upcoming;
            case "/all": return total;
            default: return 0;
        }
    };

    const formatAriaLabel = (name: string, count: number) => {
        if (count > 0) {
            const display = count > 99 ? "99+" : String(count);
            return `${name} (${display})`;
        }
        return name;
    };

    return (
        <aside
            className="flex flex-col h-full border-r bg-card/50 backdrop-blur-xl w-[52px] shrink-0 transition-all duration-300 items-center"
            aria-label="Slim Sidebar"
            data-testid="slim-sidebar"
        >
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pt-3 w-full custom-scrollbar">
                {/* Expand button */}
                <div className="flex justify-center mb-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={onExpand}
                                className="flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
                                aria-label="Expand sidebar"
                            >
                                <PanelLeftOpen className="h-4 w-4" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={8}>
                            Expand sidebar <kbd className="ml-1.5 pointer-events-none inline-flex h-4 select-none items-center rounded border border-background/30 bg-background/20 px-1 font-mono text-[10px] font-medium">{"⌘\\"}</kbd>
                        </TooltipContent>
                    </Tooltip>
                </div>

                <Separator className="mx-2 w-auto" />

                {/* Main navigation icons */}
                <div className="flex flex-col items-center gap-0.5 py-2">
                    {mainNav.map((item) => {
                        const isActive = pathname === item.href;
                        const count = getCount(item.href);
                        return (
                            <Tooltip key={item.href}>
                                <TooltipTrigger asChild>
                                    <Link
                                        href={item.href}
                                        className={cn(
                                            "relative flex items-center justify-center h-9 w-9 rounded-lg transition-all duration-200",
                                            isActive
                                                ? "bg-secondary text-foreground shadow-sm"
                                                : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                        )}
                                        aria-label={formatAriaLabel(item.name, count)}
                                        aria-current={isActive ? "page" : undefined}
                                    >
                                        <item.icon className={cn("h-4 w-4", isActive && item.color)} />
                                        {count > 0 && (
                                            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold px-1 leading-none">
                                                {count > 99 ? "99+" : count}
                                            </span>
                                        )}
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="right" sideOffset={8}>
                                    {item.name}
                                    {count > 0 && <span className="ml-1.5 text-muted-foreground">({count})</span>}
                                </TooltipContent>
                            </Tooltip>
                        );
                    })}
                </div>

                <Separator className="mx-2 w-auto" />

                {/* Lists - show first 5 */}
                {lists.length > 0 && (
                    <div className="flex flex-col items-center gap-0.5 py-2">
                        {lists.slice(0, 5).map((list) => {
                            const isActive = pathname === `/lists/${list.id}`;
                            const count = listCounts[list.id] || 0;
                            return (
                                <Tooltip key={list.id}>
                                    <TooltipTrigger asChild>
                                        <Link
                                            href={`/lists/${list.id}`}
                                            className={cn(
                                                "relative flex items-center justify-center h-9 w-9 rounded-lg transition-all duration-200",
                                                isActive
                                                    ? "bg-secondary text-foreground shadow-sm"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                            )}
                                            aria-label={formatAriaLabel(list.name, count)}
                                            aria-current={isActive ? "page" : undefined}
                                        >
                                            <ResolvedIcon
                                                icon={list.icon}
                                                className="h-4 w-4"
                                                color={list.color || undefined}
                                            />
                                            {count > 0 && (
                                                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold px-1 leading-none">
                                                    {count > 99 ? "99+" : count}
                                                </span>
                                            )}
                                        </Link>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" sideOffset={8}>
                                        {list.name}
                                        {count > 0 && <span className="ml-1.5 text-muted-foreground">({count})</span>}
                                    </TooltipContent>
                                </Tooltip>
                            );
                        })}
                        {lists.length > 5 && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={onExpand}
                                        className="flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-[10px] font-medium"
                                    >
                                        +{lists.length - 5}
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" sideOffset={8}>
                                    {lists.length - 5} more lists
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                )}

                {lists.length > 0 && labels.length > 0 && <Separator className="mx-2 w-auto" />}

                {/* Labels - show first 5 */}
                {labels.length > 0 && (
                    <div className="flex flex-col items-center gap-0.5 py-2">
                        {labels.slice(0, 5).map((label) => {
                            const isActive = pathname === `/labels/${label.id}`;
                            const count = labelCounts[label.id] || 0;
                            return (
                                <Tooltip key={label.id}>
                                    <TooltipTrigger asChild>
                                        <Link
                                            href={`/labels/${label.id}`}
                                            className={cn(
                                                "relative flex items-center justify-center h-9 w-9 rounded-lg transition-all duration-200",
                                                isActive
                                                    ? "bg-secondary text-foreground shadow-sm"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                            )}
                                            aria-label={formatAriaLabel(label.name, count)}
                                            aria-current={isActive ? "page" : undefined}
                                        >
                                            <ResolvedIcon
                                                icon={label.icon}
                                                className="h-4 w-4"
                                                color={label.color || undefined}
                                            />
                                            {count > 0 && (
                                                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold px-1 leading-none">
                                                    {count > 99 ? "99+" : count}
                                                </span>
                                            )}
                                        </Link>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" sideOffset={8}>
                                        {label.name}
                                        {count > 0 && <span className="ml-1.5 text-muted-foreground">({count})</span>}
                                    </TooltipContent>
                                </Tooltip>
                            );
                        })}
                        {labels.length > 5 && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={onExpand}
                                        className="flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-[10px] font-medium"
                                    >
                                        +{labels.length - 5}
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" sideOffset={8}>
                                    {labels.length - 5} more labels
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom: hide button */}
            <div className="shrink-0 py-2 border-t w-full flex justify-center">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={onHide}
                            className="flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
                            aria-label="Hide sidebar"
                        >
                            <PanelLeftClose className="h-4 w-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>Hide sidebar</TooltipContent>
                </Tooltip>
            </div>
        </aside>
    );
}
