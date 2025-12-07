"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Plus, Trash2, Sparkles } from "lucide-react";
import { TabsContent } from "@/components/ui/tabs";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { AiBreakdownDialog } from "../AiBreakdownDialog";
import { ParsedSubtask } from "@/lib/smart-scheduler";

// Types
type ListType = { id: number; name: string; color: string | null; };
type LabelType = { id: number; name: string; color: string | null; };
type SubtaskType = { id: number; title: string; isCompleted: boolean | null; };
type ReminderType = { id: number; remindAt: Date; };

interface TaskDetailsTabProps {
    isEdit: boolean;
    title: string;
    setTitle: (v: string) => void;
    description: string;
    setDescription: (v: string) => void;
    listId: string;
    setListId: (v: string) => void;
    lists: ListType[];
    priority: "none" | "low" | "medium" | "high";
    setPriority: (v: "none" | "low" | "medium" | "high") => void;
    energyLevel: "high" | "medium" | "low" | "none";
    setEnergyLevel: (v: "high" | "medium" | "low" | "none") => void;
    context: "computer" | "phone" | "errands" | "meeting" | "home" | "anywhere" | "none";
    setContext: (v: "computer" | "phone" | "errands" | "meeting" | "home" | "anywhere" | "none") => void;
    dueDate: Date | undefined;
    setDueDate: (v: Date | undefined) => void;
    deadline: Date | undefined;
    setDeadline: (v: Date | undefined) => void;
    isRecurring: boolean;
    setIsRecurring: (v: boolean) => void;
    recurringRule: string;
    setRecurringRule: (v: string) => void;
    isHabit: boolean;
    setIsHabit: (v: boolean) => void;
    // Subtasks
    subtasks: SubtaskType[];
    newSubtask: string;
    setNewSubtask: (v: string) => void;
    handleAddSubtask: () => void;
    handleToggleSubtask: (id: number, checked: boolean) => void;
    handleDeleteSubtask: (id: number) => void;
    onAiConfirm: (subtasks: ParsedSubtask[]) => void;
    // Labels
    labels: LabelType[];
    selectedLabelIds: number[];
    toggleLabel: (id: number) => void;
    // Reminders
    reminders: ReminderType[];
    newReminderDate: Date | undefined;
    setNewReminderDate: (v: Date | undefined) => void;
    handleAddReminder: () => void;
    handleDeleteReminder: (id: number) => void;
    // Form submission
    handleSubmit: (e: React.FormEvent) => void;
}

export function TaskDetailsTab({
    isEdit,
    title, setTitle,
    description, setDescription,
    listId, setListId, lists,
    priority, setPriority,
    energyLevel, setEnergyLevel,
    context, setContext,
    dueDate, setDueDate,
    deadline, setDeadline,
    isRecurring, setIsRecurring,
    recurringRule, setRecurringRule,
    isHabit, setIsHabit,
    subtasks, newSubtask, setNewSubtask, handleAddSubtask, handleToggleSubtask, handleDeleteSubtask, onAiConfirm,
    labels, selectedLabelIds, toggleLabel,
    reminders, newReminderDate, setNewReminderDate, handleAddReminder, handleDeleteReminder,
    handleSubmit
}: TaskDetailsTabProps) {
    const [aiBreakdownOpen, setAiBreakdownOpen] = useState(false);

    return (
        <TabsContent value="details">
            <form id="task-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Task Title"
                        required
                        autoFocus
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Description (optional)"
                        className="min-h-[100px]"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>List</Label>
                        <Select value={listId} onValueChange={setListId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select List" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="inbox">Inbox</SelectItem>
                                {lists.map(list => (
                                    <SelectItem key={list.id} value={list.id.toString()}>
                                        {list.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Priority</Label>
                        <Select value={priority} onValueChange={(value) => setPriority(value as "none" | "low" | "medium" | "high")}>
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
                        <Select value={energyLevel} onValueChange={(value) => setEnergyLevel(value as "high" | "medium" | "low" | "none")}>
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
                        <Select value={context} onValueChange={(value) => setContext(value as "computer" | "phone" | "errands" | "meeting" | "home" | "anywhere" | "none")}>
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

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Due Date</Label>
                        <div className="block">
                            <DatePicker date={dueDate} setDate={setDueDate} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Deadline</Label>
                        <div className="block">
                            <DatePicker date={deadline} setDate={setDeadline} />
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-2 border p-3 rounded-md">
                    <Checkbox
                        id="recurring"
                        checked={isRecurring}
                        onCheckedChange={(checked) => setIsRecurring(!!checked)}
                    />
                    <div className="grid gap-1.5 leading-none">
                        <Label
                            htmlFor="recurring"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            Recurring Task
                        </Label>
                    </div>
                    {isRecurring && (
                        <Select value={recurringRule} onValueChange={setRecurringRule}>
                            <SelectTrigger className="w-[180px] ml-auto h-8">
                                <SelectValue placeholder="Frequency" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="FREQ=DAILY">Daily</SelectItem>
                                <SelectItem value="FREQ=WEEKLY">Weekly</SelectItem>
                                <SelectItem value="FREQ=MONTHLY">Monthly</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                </div>

                {isRecurring && (
                    <div className="flex items-center space-x-2 border p-3 rounded-md bg-blue-500/5">
                        <Checkbox
                            id="habit"
                            checked={isHabit}
                            onCheckedChange={(checked) => setIsHabit(!!checked)}
                        />
                        <div className="grid gap-1.5 leading-none flex-1">
                            <Label
                                htmlFor="habit"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                🔥 Track as Habit
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Build streaks and see completion heatmap
                            </p>
                        </div>
                    </div>
                )}

                {isEdit && (
                    <div className="space-y-2">
                        <Label>Subtasks</Label>
                        <div className="space-y-2">
                            {subtasks.map(sub => (
                                <div key={sub.id} className="flex items-center gap-2 group">
                                    <Checkbox
                                        checked={sub.isCompleted || false}
                                        onCheckedChange={(c) => handleToggleSubtask(sub.id, !!c)}
                                    />
                                    <span className={cn("flex-1 text-sm", sub.isCompleted && "line-through text-muted-foreground")}>
                                        {sub.title}
                                    </span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                        onClick={() => handleDeleteSubtask(sub.id)}
                                    >
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                            <div className="flex items-center gap-2">
                                <Input
                                    value={newSubtask}
                                    onChange={(e) => setNewSubtask(e.target.value)}
                                    placeholder="Add a subtask..."
                                    className="h-8 text-sm"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddSubtask();
                                        }
                                    }}
                                />
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={handleAddSubtask}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-purple-600 hover:text-purple-700 hover:bg-purple-50 border-purple-200"
                                    onClick={() => setAiBreakdownOpen(true)}
                                >
                                    <Sparkles className="mr-2 h-3 w-3" />
                                    Break Down with AI
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                <AiBreakdownDialog
                    open={aiBreakdownOpen}
                    onOpenChange={setAiBreakdownOpen}
                    taskTitle={title}
                    onConfirm={(subs) => {
                        onAiConfirm(subs);
                        setAiBreakdownOpen(false);
                    }}
                />

                <div className="space-y-2">
                    <Label>Labels</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {selectedLabelIds.map(id => {
                            const label = labels.find(l => l.id === id);
                            if (!label) return null;
                            return (
                                <Badge
                                    key={id}
                                    variant="secondary"
                                    className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                                    onClick={() => toggleLabel(id)}
                                    style={{ backgroundColor: (label.color || '#000000') + '20', color: label.color || '#000000' }}
                                >
                                    {label.name}
                                    <X className="ml-1 h-3 w-3" />
                                </Badge>
                            );
                        })}
                    </div>
                    <div className="flex flex-wrap gap-2 border rounded-md p-2 max-h-[100px] overflow-y-auto">
                        {labels.map(label => (
                            <div key={label.id} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`label-${label.id}`}
                                    checked={selectedLabelIds.includes(label.id)}
                                    onCheckedChange={() => toggleLabel(label.id)}
                                />
                                <Label
                                    htmlFor={`label-${label.id}`}
                                    className="cursor-pointer"
                                    style={{ color: label.color || '#000000' }}
                                >
                                    {label.name}
                                </Label>
                            </div>
                        ))}
                        {labels.length === 0 && <span className="text-muted-foreground text-sm">No labels available</span>}
                    </div>
                </div>

                {isEdit && (
                    <div className="space-y-2 border-t pt-4 mt-4">
                        <Label>Reminders</Label>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="flex-1">
                                <DatePicker date={newReminderDate} setDate={setNewReminderDate} />
                            </div>
                            <Button type="button" onClick={handleAddReminder} size="sm" disabled={!newReminderDate}>Add</Button>
                        </div>
                        <div className="space-y-2">
                            {reminders.map(reminder => (
                                <div key={reminder.id} className="flex items-center justify-between bg-muted/50 p-2 rounded-md text-sm">
                                    <span>{format(reminder.remindAt, "PPP p")}</span>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => handleDeleteReminder(reminder.id)} className="h-6 w-6">
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                            {reminders.length === 0 && <p className="text-sm text-muted-foreground">No reminders set.</p>}
                        </div>
                    </div>
                )}
            </form>
        </TabsContent>
    );
}
