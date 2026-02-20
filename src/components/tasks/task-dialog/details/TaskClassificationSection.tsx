
import React, { useMemo, createElement } from "react";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { getListIcon } from "@/lib/icons";
import { TimeEstimateInput } from "../../TimeEstimateInput";

interface TaskClassificationSectionProps {
    listId: string;
    setListId: (v: string) => void;
    lists: Array<{ id: number; name: string; color: string | null; icon: string | null; }>;
    priority: "none" | "low" | "medium" | "high";
    setPriority: (v: "none" | "low" | "medium" | "high") => void;
    energyLevel: "high" | "medium" | "low" | "none";
    setEnergyLevel: (v: "high" | "medium" | "low" | "none") => void;
    context: "computer" | "phone" | "errands" | "meeting" | "home" | "anywhere" | "none";
    setContext: (v: "computer" | "phone" | "errands" | "meeting" | "home" | "anywhere" | "none") => void;
    estimateMinutes: number | null;
    setEstimateMinutes: (v: number | null) => void;
}

export function TaskClassificationSection({
    listId, setListId, lists,
    priority, setPriority,
    energyLevel, setEnergyLevel,
    context, setContext,
    estimateMinutes, setEstimateMinutes
}: TaskClassificationSectionProps) {
    const listById = useMemo(() => {
        return new Map(lists.map((list) => [list.id.toString(), list]));
    }, [lists]);

    const selectedList = listById.get(listId);

    return (
        <>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>List</Label>
                    <Select value={listId} onValueChange={setListId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select List">
                                {listId === "inbox" ? (
                                    <div className="flex items-center gap-2">
                                        {createElement(getListIcon("list"), { className: "h-4 w-4" })}
                                        Inbox
                                    </div>
                                ) : selectedList ? (
                                    <div className="flex items-center gap-2">
                                        {createElement(getListIcon(selectedList.icon), {
                                            style: { color: selectedList.color || 'currentColor' },
                                            className: "h-4 w-4"
                                        })}
                                        {selectedList.name}
                                    </div>
                                ) : "Select List"}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="inbox">
                                <div className="flex items-center gap-2">
                                    {createElement(getListIcon("list"), { className: "h-4 w-4" })}
                                    Inbox
                                </div>
                            </SelectItem>
                            {lists.map(list => (
                                <SelectItem key={list.id} value={list.id.toString()}>
                                    <div className="flex items-center gap-2">
                                        {createElement(getListIcon(list.icon), {
                                            style: { color: list.color || 'currentColor' },
                                            className: "h-4 w-4"
                                        })}
                                        {list.name}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Priority</Label>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <Select value={priority} onValueChange={(value) => setPriority(value as any)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Priority" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Energy Level</Label>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <Select value={energyLevel} onValueChange={(value) => setEnergyLevel(value as any)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Energy" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="high">🔋 High</SelectItem>
                            <SelectItem value="medium">🔌 Medium</SelectItem>
                            <SelectItem value="low">🪫 Low</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Context</Label>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <Select value={context} onValueChange={(value) => setContext(value as any)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Context" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="computer">💻 Computer</SelectItem>
                            <SelectItem value="phone">📱 Phone</SelectItem>
                            <SelectItem value="errands">🏃 Errands</SelectItem>
                            <SelectItem value="meeting">👥 Meeting</SelectItem>
                            <SelectItem value="home">🏠 Home</SelectItem>
                            <SelectItem value="anywhere">🌍 Anywhere</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label>Time Estimate</Label>
                <TimeEstimateInput
                    value={estimateMinutes}
                    onChange={setEstimateMinutes}
                />
            </div>
        </>
    );
}
