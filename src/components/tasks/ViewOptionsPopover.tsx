"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, ChevronUp, Settings2, List, LayoutGrid, Calendar, RotateCcw } from "lucide-react";
import { ViewSettings, defaultViewSettings } from "@/lib/view-settings";
import { getViewSettings, saveViewSettings, resetViewSettings, getLabels } from "@/lib/actions";
import { cn } from "@/lib/utils";

interface ViewOptionsPopoverProps {
    viewId: string;
    onSettingsChange?: (settings: ViewSettings) => void;
}

interface LabelOption {
    id: number;
    name: string;
    color: string | null;
}

export function ViewOptionsPopover({ viewId, onSettingsChange }: ViewOptionsPopoverProps) {
    const [open, setOpen] = useState(false);
    const [settings, setSettings] = useState<ViewSettings>(defaultViewSettings);
    const [sortExpanded, setSortExpanded] = useState(true);
    const [filterExpanded, setFilterExpanded] = useState(true);
    const [labels, setLabels] = useState<LabelOption[]>([]);
    const [isPending, startTransition] = useTransition();

    // Load settings and labels on mount
    useEffect(() => {
        async function loadData() {
            const [savedSettings, allLabels] = await Promise.all([
                getViewSettings(viewId),
                getLabels()
            ]);

            if (savedSettings) {
                setSettings({
                    layout: savedSettings.layout || defaultViewSettings.layout,
                    showCompleted: savedSettings.showCompleted ?? defaultViewSettings.showCompleted,
                    groupBy: savedSettings.groupBy || defaultViewSettings.groupBy,
                    sortBy: savedSettings.sortBy || defaultViewSettings.sortBy,
                    sortOrder: savedSettings.sortOrder || defaultViewSettings.sortOrder,
                    filterDate: savedSettings.filterDate || defaultViewSettings.filterDate,
                    filterPriority: savedSettings.filterPriority,
                    filterLabelId: savedSettings.filterLabelId,
                });
            }

            setLabels(allLabels);
        }

        loadData();
    }, [viewId]);

    const updateSetting = <K extends keyof ViewSettings>(key: K, value: ViewSettings[K]) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);

        startTransition(async () => {
            await saveViewSettings(viewId, { [key]: value });
            onSettingsChange?.(newSettings);
        });
    };

    const handleReset = () => {
        setSettings(defaultViewSettings);
        startTransition(async () => {
            await resetViewSettings(viewId);
            onSettingsChange?.(defaultViewSettings);
        });
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Settings2 className="h-4 w-4" />
                    View
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4 space-y-4">
                    {/* Layout Section */}
                    <div>
                        <div className="text-sm font-medium mb-3">Layout</div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => updateSetting("layout", "list")}
                                className={cn(
                                    "flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors",
                                    settings.layout === "list"
                                        ? "border-primary bg-primary/5"
                                        : "border-border hover:bg-accent"
                                )}
                            >
                                <List className="h-5 w-5" />
                                <span className="text-xs">List</span>
                            </button>
                            <button
                                onClick={() => updateSetting("layout", "board")}
                                disabled
                                className={cn(
                                    "flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors opacity-50 cursor-not-allowed",
                                    settings.layout === "board"
                                        ? "border-primary bg-primary/5"
                                        : "border-border"
                                )}
                            >
                                <LayoutGrid className="h-5 w-5" />
                                <span className="text-xs">Board</span>
                            </button>
                            <button
                                onClick={() => updateSetting("layout", "calendar")}
                                disabled
                                className={cn(
                                    "flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors opacity-50 cursor-not-allowed",
                                    settings.layout === "calendar"
                                        ? "border-primary bg-primary/5"
                                        : "border-border"
                                )}
                            >
                                <Calendar className="h-5 w-5" />
                                <span className="text-xs">Calendar</span>
                            </button>
                        </div>
                    </div>

                    {/* Completed Tasks Toggle */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm">Completed tasks</span>
                        <Switch
                            checked={settings.showCompleted}
                            onCheckedChange={(checked) => updateSetting("showCompleted", checked)}
                        />
                    </div>

                    <Separator />

                    {/* Sort Section */}
                    <div>
                        <button
                            onClick={() => setSortExpanded(!sortExpanded)}
                            className="flex items-center justify-between w-full text-sm font-medium"
                        >
                            Sort
                            {sortExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                            ) : (
                                <ChevronDown className="h-4 w-4" />
                            )}
                        </button>
                        {sortExpanded && (
                            <div className="mt-3 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Grouping</span>
                                    <Select
                                        value={settings.groupBy}
                                        onValueChange={(value) => updateSetting("groupBy", value as ViewSettings["groupBy"])}
                                    >
                                        <SelectTrigger className="w-[140px]" size="sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            <SelectItem value="dueDate">Due Date</SelectItem>
                                            <SelectItem value="priority">Priority</SelectItem>
                                            <SelectItem value="label">Label</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Sorting</span>
                                    <Select
                                        value={settings.sortBy}
                                        onValueChange={(value) => updateSetting("sortBy", value as ViewSettings["sortBy"])}
                                    >
                                        <SelectTrigger className="w-[140px]" size="sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="manual">Manual</SelectItem>
                                            <SelectItem value="dueDate">Due Date</SelectItem>
                                            <SelectItem value="priority">Priority</SelectItem>
                                            <SelectItem value="name">Name</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* Filter Section */}
                    <div>
                        <button
                            onClick={() => setFilterExpanded(!filterExpanded)}
                            className="flex items-center justify-between w-full text-sm font-medium"
                        >
                            Filter
                            {filterExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                            ) : (
                                <ChevronDown className="h-4 w-4" />
                            )}
                        </button>
                        {filterExpanded && (
                            <div className="mt-3 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Date</span>
                                    <Select
                                        value={settings.filterDate}
                                        onValueChange={(value) => updateSetting("filterDate", value as ViewSettings["filterDate"])}
                                    >
                                        <SelectTrigger className="w-[140px]" size="sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All</SelectItem>
                                            <SelectItem value="hasDate">Has Date</SelectItem>
                                            <SelectItem value="noDate">No Date</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Priority</span>
                                    <Select
                                        value={settings.filterPriority || "all"}
                                        onValueChange={(value) => updateSetting("filterPriority", value === "all" ? null : value)}
                                    >
                                        <SelectTrigger className="w-[140px]" size="sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="low">Low</SelectItem>
                                            <SelectItem value="none">None</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Label</span>
                                    <Select
                                        value={settings.filterLabelId?.toString() || "all"}
                                        onValueChange={(value) => updateSetting("filterLabelId", value === "all" ? null : parseInt(value))}
                                    >
                                        <SelectTrigger className="w-[140px]" size="sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All</SelectItem>
                                            {labels.map((label) => (
                                                <SelectItem key={label.id} value={label.id.toString()}>
                                                    <span style={{ color: label.color || undefined }}>{label.name}</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* Reset Button */}
                    <Button
                        variant="ghost"
                        className="w-full text-destructive hover:text-destructive"
                        onClick={handleReset}
                        disabled={isPending}
                    >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset all
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
