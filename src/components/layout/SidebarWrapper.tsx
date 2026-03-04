"use client";

import { useCallback, useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { useSidebarState, MIN_WIDTH, MAX_WIDTH } from "@/hooks/use-sidebar-state";
import { SlimSidebar } from "./SlimSidebar";
import {
    PanelLeftClose,
    PanelLeftOpen,
    Columns2,
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { FloatingSearchInput } from "./FloatingSearchInput";

interface SidebarWrapperProps {
    children: React.ReactNode;
    className?: string;
    lists: { id: number; name: string; color: string | null; icon: string | null; slug: string }[];
    labels: { id: number; name: string; color: string | null; icon: string | null }[];
}

export function SidebarWrapper({ children, className, lists, labels }: SidebarWrapperProps) {
    const { mode, setMode, width, setWidth, cycleMode, isResizing, setIsResizing } = useSidebarState();
    const sidebarRef = useRef<HTMLDivElement>(null);
    const startXRef = useRef(0);
    const startWidthRef = useRef(0);
    const rafRef = useRef<number | null>(null);
    const pendingWidthRef = useRef<number | null>(null);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        startXRef.current = e.clientX;
        const cssWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--sidebar-width"), 10);
        startWidthRef.current = !Number.isNaN(cssWidth) ? cssWidth : width;
    }, [width, setIsResizing]);

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const delta = e.clientX - startXRef.current;
            const newWidth = startWidthRef.current + delta;
            const clamped = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
            pendingWidthRef.current = clamped;
            if (rafRef.current == null) {
                rafRef.current = window.requestAnimationFrame(() => {
                    const nextWidth = pendingWidthRef.current;
                    if (typeof nextWidth === "number") {
                        document.documentElement.style.setProperty("--sidebar-width", `${nextWidth}px`);
                    }
                    rafRef.current = null;
                });
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            const finalWidth = pendingWidthRef.current;
            if (typeof finalWidth === "number") {
                setWidth(finalWidth);
            }
            pendingWidthRef.current = null;
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
            if (rafRef.current != null) {
                window.cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };
    }, [isResizing, setWidth, setIsResizing]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

            if ((e.key === "\\" || e.key === "|") && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                cycleMode();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [cycleMode]);

    const handleResizeKeyDown = useCallback((e: ReactKeyboardEvent<HTMLDivElement>) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        const delta = e.key === "ArrowRight" ? 16 : -16;
        const nextWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width + delta));
        setWidth(nextWidth);
        document.documentElement.style.setProperty("--sidebar-width", `${nextWidth}px`);
    }, [setWidth, width]);

    const isNormal = mode === "normal";
    const responsiveClassName = className ?? "";

    return (
        <>
            {/* Normal mode */}
            <aside
                ref={sidebarRef}
                id="app-sidebar"
                aria-label="Sidebar wrapper"
                className={cn(
                    "sidebar-normal relative group/sidebar",
                    responsiveClassName,
                    !isNormal && "hidden"
                )}
                style={isNormal ? { width: `var(--sidebar-width, 256px)`, minWidth: `${MIN_WIDTH}px`, maxWidth: `${MAX_WIDTH}px` } : undefined}
            >
                <div className="flex-1 min-w-0 h-full flex flex-col">
                    {children}
                </div>

                <div className="absolute top-2 right-2 z-10 flex items-center gap-0.5 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 bg-card/90 backdrop-blur-sm border border-border/60 rounded-lg p-0.5 shadow-sm">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => setMode("slim")}
                                className="flex items-center justify-center h-6 w-6 rounded-md text-foreground/70 hover:text-foreground hover:bg-accent transition-colors"
                                aria-label="Slim sidebar"
                            >
                                <Columns2 className="h-3.5 w-3.5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" sideOffset={4}>Slim sidebar</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => setMode("hidden")}
                                className="flex items-center justify-center h-6 w-6 rounded-md text-foreground/70 hover:text-foreground hover:bg-accent transition-colors"
                                aria-label="Hide sidebar"
                            >
                                <PanelLeftClose className="h-3.5 w-3.5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" sideOffset={4}>
                            Hide sidebar <kbd className="ml-1.5 pointer-events-none inline-flex h-4 select-none items-center rounded border border-background/30 bg-background/20 px-1 font-mono text-[10px] font-medium">{"⌘\\"}</kbd>
                        </TooltipContent>
                    </Tooltip>
                </div>

                <div
                    onMouseDown={handleMouseDown}
                    onKeyDown={handleResizeKeyDown}
                    className={cn(
                        "absolute top-0 right-0 w-1 h-full cursor-col-resize z-20 transition-all duration-150",
                        "hover:bg-primary/20 active:bg-primary/40",
                        isResizing ? "bg-primary/40 w-1" : "bg-transparent hover:w-1"
                    )}
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Resize sidebar"
                    aria-controls="app-sidebar"
                    aria-valuemin={MIN_WIDTH}
                    aria-valuemax={MAX_WIDTH}
                    aria-valuenow={Math.round(width)}
                    tabIndex={0}
                >
                    <div className={cn(
                        "absolute top-1/2 -translate-y-1/2 right-0 w-1 h-8 rounded-full transition-all duration-200",
                        isResizing ? "bg-primary scale-y-150" : "bg-border opacity-0 group-hover/sidebar:opacity-100"
                    )} />
                </div>
            </aside>

            {/* Slim mode — always rendered so CSS can reveal instantly based on data attribute */}
            <div className={cn("sidebar-slim", mode === "slim" ? "flex" : "hidden")}>
                <SlimSidebar
                    active={mode === "slim"}
                    lists={lists}
                    labels={labels}
                    onExpand={() => setMode("normal")}
                    onHide={() => setMode("hidden")}
                />
            </div>

            {/* Hidden mode — always rendered so CSS can reveal instantly based on data attribute */}
            <div className={cn("sidebar-hidden w-0", mode === "hidden" ? "block" : "hidden")}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={() => setMode("normal")}
                            className="fixed top-3 left-3 z-40 flex items-center justify-center h-8 w-8 rounded-lg bg-card backdrop-blur-sm border border-border text-foreground/70 hover:text-foreground hover:bg-accent shadow-sm transition-all duration-200 hover:shadow-md hover:scale-105 hidden md:flex"
                            aria-label="Show sidebar"
                        >
                            <PanelLeftOpen className="h-4 w-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={4}>
                        Show sidebar <kbd className="ml-1.5 pointer-events-none inline-flex h-4 select-none items-center rounded border border-background/30 bg-background/20 px-1 font-mono text-[10px] font-medium">{"⌘\\"}</kbd>
                    </TooltipContent>
                </Tooltip>
            </div>

            <FloatingSearchInput sidebarMode={mode} />
        </>
    );
}
