
import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ViewSettings } from "@/lib/view-settings";

interface LabelOption {
    id: number;
    name: string;
    color: string | null;
}

interface FilterSectionProps {
    settings: ViewSettings;
    labels: LabelOption[];
    expanded: boolean;
    onToggle: () => void;
    onUpdate: <K extends keyof ViewSettings>(key: K, value: ViewSettings[K]) => void;
}

export function FilterSection({
    settings, labels, expanded, onToggle, onUpdate
}: FilterSectionProps) {
    return (
        <div>
            <button
                onClick={onToggle}
                aria-expanded={expanded}
                aria-controls="filter-options"
                className="flex items-center justify-between w-full text-sm font-medium"
            >
                Filter
                {expanded ? (
                    <ChevronUp className="h-4 w-4" />
                ) : (
                    <ChevronDown className="h-4 w-4" />
                )}
            </button>
            {expanded && (
                <div id="filter-options" className="mt-3 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Date</span>
                        <Select
                            value={settings.filterDate}
                            onValueChange={(value) => onUpdate("filterDate", value as ViewSettings["filterDate"])}
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
                            onValueChange={(value) => onUpdate("filterPriority", value === "all" ? null : value as any)}
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
                            onValueChange={(value) => onUpdate("filterLabelId", value === "all" ? null : parseInt(value))}
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
                            onValueChange={(value) => onUpdate("filterEnergyLevel", value === "all" ? null : value as any)}
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
                            onValueChange={(value) => onUpdate("filterContext", value === "all" ? null : value as any)}
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
    );
}
