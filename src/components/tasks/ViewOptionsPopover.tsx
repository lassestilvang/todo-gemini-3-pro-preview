"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, ChevronUp, Settings2, List, LayoutGrid, Calendar, RotateCcw } from "lucide-react";
import { ViewSettings, defaultViewSettings } from "@/lib/view-settings";
import { getViewSettings, saveViewSettings, resetViewSettings } from "@/lib/actions/view-settings";
import { getLabels } from "@/lib/actions/labels";
import { createSavedView } from "@/lib/actions/views";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ViewOptionsPopoverProps {
    viewId: string;
    userId?: string;
    onSettingsChange?: (settings: ViewSettings) => void;
}

interface LabelOption {
    id: number;
    name: string;
    color: string | null;
}

export function ViewOptionsPopover({ viewId, userId, onSettingsChange }: ViewOptionsPopoverProps) {
    const [open, setOpen] = useState(false);
    const [settings, setSettings] = useState<ViewSettings>(defaultViewSettings);
    const [sortExpanded, setSortExpanded] = useState(true);
    const [filterExpanded, setFilterExpanded] = useState(true);
    const [labels, setLabels] = useState<LabelOption[]>([]);
    const [isPending, startTransition] = useTransition();
    const [mounted, setMounted] = useState(false);
    const [viewName, setViewName] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Load settings and labels on mount
    useEffect(() => {
        setMounted(true);
        async function loadData() {
            if (!userId) return;
            const [savedSettings, allLabels] = await Promise.all([
                getViewSettings(userId, viewId),
                getLabels(userId)
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
                    filterEnergyLevel: savedSettings.filterEnergyLevel as ViewSettings["filterEnergyLevel"],
                    filterContext: savedSettings.filterContext as ViewSettings["filterContext"],
                });
            }

            setLabels(allLabels);
        }

        loadData();
    }, [viewId, userId]);

    const updateSetting = <K extends keyof ViewSettings>(key: K, value: ViewSettings[K]) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);

        startTransition(async () => {
            if (userId) {
                await saveViewSettings(userId, viewId, { [key]: value });
            }
            onSettingsChange?.(newSettings);
        });
    };

    const handleReset = () => {
        const previousSettings = settings;
        setSettings(defaultViewSettings);

        startTransition(async () => {
            if (userId) {
                try {
                    await resetViewSettings(userId, viewId);
                    onSettingsChange?.(defaultViewSettings);
                } catch {
                    // Fail silently
                    setSettings(previousSettings);
                    toast.error("Failed to reset view settings");
                }
            } else {
                onSettingsChange?.(defaultViewSettings);
            }
        });
    };

    const handleSaveAsView = async () => {
        if (!userId || !viewName.trim()) return;
        setIsSaving(true);
        try {
            const result = await createSavedView({
                userId,
                name: viewName.trim(),
                settings: JSON.stringify(settings),
            });

            if (result.success) {
                toast.success(`View "${viewName}" saved!`);
                setViewName("");
                setOpen(false);
            } else {
                toast.error("Failed to save view");
            }
        } catch {
            toast.error("An error occurred while saving view");
        } finally {
            setIsSaving(false);
        }
    };

    if (!mounted) {
        return (
            <Button variant="outline" size="sm" className="gap-2" disabled>
                <Settings2 className="h-4 w-4" />
                View
            </Button>
        );
    }

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
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Energy</span>
                                    <Select
                                        value={settings.filterEnergyLevel || "all"}
                                        onValueChange={(value) => updateSetting("filterEnergyLevel", value === "all" ? null : value as ViewSettings["filterEnergyLevel"])}
                                    >
                                        <SelectTrigger className="w-[140px]" size="sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All</SelectItem>
                                            <SelectItem value="high">High 🔋</SelectItem>
                                            <SelectItem value="medium">Medium 🔌</SelectItem>
                                            <SelectItem value="low">Low 🪫</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Context</span>
                                    <Select
                                        value={settings.filterContext || "all"}
                                        onValueChange={(value) => updateSetting("filterContext", value === "all" ? null : value as ViewSettings["filterContext"])}
                                    >
                                        <SelectTrigger className="w-[140px]" size="sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All</SelectItem>
                                            <SelectItem value="computer">Computer 💻</SelectItem>
                                            <SelectItem value="phone">Phone 📱</SelectItem>
                                            <SelectItem value="errands">Errands 🏃</SelectItem>
                                            <SelectItem value="meeting">Meeting 👥</SelectItem>
                                            <SelectItem value="home">Home 🏠</SelectItem>
                                            <SelectItem value="anywhere">Anywhere 🌍</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* Save as View Section */}
                    <div className="space-y-3">
                        <div className="text-sm font-medium">Save as new view</div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="View name..."
                                value={viewName}
                                onChange={(e) => setViewName(e.target.value)}
                                className="flex-1 px-2 py-1 text-xs border rounded bg-background"
                            />
                            <Button
                                size="sm"
                                className="h-8 px-3 text-xs"
                                onClick={handleSaveAsView}
                                disabled={!viewName.trim() || isSaving}
                            >
                                {isSaving ? "Saving..." : "Save"}
                            </Button>
                        </div>
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
