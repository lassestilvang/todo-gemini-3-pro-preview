"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
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
import { createTask, updateTask, deleteTask, getLists, getLabels } from "@/lib/actions";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Trash2 } from "lucide-react";
import { createSubtask, updateSubtask, deleteSubtask, getSubtasks, createReminder, deleteReminder, getReminders, getTaskLogs } from "@/lib/actions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

type TaskType = {
    id: number;
    title: string;
    description: string | null;
    priority: "none" | "low" | "medium" | "high" | null;
    listId: number | null;
    dueDate: Date | null;
    deadline: Date | null;
    isRecurring: boolean | null;
    recurringRule: string | null;
    labels?: Array<{ id: number; name: string; color: string | null }>;
};

type ReminderType = {
    id: number;
    remindAt: Date;
};

type LogType = {
    id: number;
    action: string;
    details: string | null;
    createdAt: Date;
};

type ListType = {
    id: number;
    name: string;
    color: string | null;
};

type LabelType = {
    id: number;
    name: string;
    color: string | null;
};

type SubtaskType = {
    id: number;
    title: string;
    isCompleted: boolean | null;
};

interface TaskDialogProps {
    task?: TaskType;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: React.ReactNode;
    defaultListId?: number;
}

import { cn } from "@/lib/utils";

export function TaskDialog({ task, open, onOpenChange, trigger, defaultListId }: TaskDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const effectiveOpen = open !== undefined ? open : internalOpen;
    const setEffectiveOpen = onOpenChange || setInternalOpen;

    // We use a key to force re-mounting of the form when the dialog opens or the task changes.
    // This ensures state is initialized correctly without needing useEffect to sync state.
    const formKey = effectiveOpen ? (task ? `edit-${task.id}` : "create") : "closed";

    return (
        <Dialog open={effectiveOpen} onOpenChange={setEffectiveOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden">
                <TaskForm
                    key={formKey}
                    task={task}
                    defaultListId={defaultListId}
                    onClose={() => setEffectiveOpen(false)}
                />
            </DialogContent>
        </Dialog>
    );
}

function TaskForm({ task, defaultListId, onClose }: { task?: TaskType, defaultListId?: number, onClose: () => void }) {
    const [title, setTitle] = useState(task?.title || "");
    const [description, setDescription] = useState(task?.description || "");
    const [priority, setPriority] = useState<"none" | "low" | "medium" | "high">(task?.priority || "none");
    const [listId, setListId] = useState<string>(task?.listId?.toString() || defaultListId?.toString() || "inbox");
    const [dueDate, setDueDate] = useState<Date | undefined>(task?.dueDate ? new Date(task.dueDate) : undefined);
    const [deadline, setDeadline] = useState<Date | undefined>(task?.deadline ? new Date(task.deadline) : undefined);
    const [selectedLabelIds, setSelectedLabelIds] = useState<number[]>(task?.labels?.map((l) => l.id) || []);

    const [lists, setLists] = useState<ListType[]>([]);
    const [labels, setLabels] = useState<LabelType[]>([]);

    // Reminders & Logs
    const [reminders, setReminders] = useState<ReminderType[]>([]);
    const [logs, setLogs] = useState<LogType[]>([]);
    const [newReminderDate, setNewReminderDate] = useState<Date | undefined>();

    // Recurring state
    const [isRecurring, setIsRecurring] = useState(task?.isRecurring || false);
    const [recurringRule, setRecurringRule] = useState(task?.recurringRule || "FREQ=DAILY");

    // Subtasks state
    const [subtasks, setSubtasks] = useState<SubtaskType[]>([]);
    const [newSubtask, setNewSubtask] = useState("");

    const isEdit = !!task;

    const fetchSubtasks = useCallback(async () => {
        if (task?.id) {
            const subs = await getSubtasks(task.id);
            setSubtasks(subs);
        }
    }, [task]);

    const fetchRemindersAndLogs = useCallback(async () => {
        if (task?.id) {
            const [fetchedReminders, fetchedLogs] = await Promise.all([
                getReminders(task.id),
                getTaskLogs(task.id)
            ]);
            setReminders(fetchedReminders);
            setLogs(fetchedLogs);
        }
    }, [task]);

    useEffect(() => {
        const fetchData = async () => {
            const [fetchedLists, fetchedLabels] = await Promise.all([
                getLists(),
                getLabels()
            ]);
            setLists(fetchedLists);
            setLabels(fetchedLabels);

            if (isEdit) {
                fetchSubtasks();
                fetchRemindersAndLogs();
            }
        };
        fetchData();
    }, [isEdit, task?.id, fetchSubtasks, fetchRemindersAndLogs]);

    const handleAddSubtask = async () => {
        if (!newSubtask.trim() || !task?.id) return;
        await createSubtask(task.id, newSubtask);
        setNewSubtask("");
        fetchSubtasks();
    };

    const handleToggleSubtask = async (id: number, checked: boolean) => {
        await updateSubtask(id, checked);
        fetchSubtasks();
    };

    const handleDeleteSubtask = async (id: number) => {
        await deleteSubtask(id);
        fetchSubtasks();
    };

    const handleAddReminder = async () => {
        if (!newReminderDate || !task?.id) return;
        await createReminder(task.id, newReminderDate);
        setNewReminderDate(undefined);
        fetchRemindersAndLogs();
    };

    const handleDeleteReminder = async (id: number) => {
        await deleteReminder(id);
        fetchRemindersAndLogs();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = {
                title,
                description,
                priority,
                listId: listId === "inbox" ? null : parseInt(listId),
                dueDate,
                deadline,
                labelIds: selectedLabelIds,
                isRecurring,
                recurringRule: isRecurring ? recurringRule : null
            };

            if (isEdit) {
                await updateTask(task.id, data);
            } else {
                await createTask(data);
            }
            onClose();
        } catch (error) {
            console.error("Failed to save task:", error);
        }
    };

    const handleDelete = async () => {
        if (!isEdit) return;
        if (confirm("Are you sure you want to delete this task?")) {
            await deleteTask(task.id);
            onClose();
        }
    };

    const toggleLabel = (labelId: number) => {
        setSelectedLabelIds(prev =>
            prev.includes(labelId)
                ? prev.filter(id => id !== labelId)
                : [...prev, labelId]
        );
    };

    return (
        <div className="flex flex-col h-full max-h-[90vh]">
            <DialogHeader className="px-6 py-4 border-b">
                <DialogTitle>{isEdit ? "Edit Task" : "New Task"}</DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4">
                <Tabs defaultValue="details" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="activity" disabled={!isEdit}>Activity</TabsTrigger>
                    </TabsList>

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
                                    </div>
                                </div>
                            )}

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

                    <TabsContent value="activity" className="space-y-6">


                        <div className="space-y-4">
                            <h3 className="text-sm font-medium">Activity Log</h3>
                            <ScrollArea className="h-[200px] rounded-md border p-4">
                                <div className="space-y-4">
                                    {logs.map(log => (
                                        <div key={log.id} className="text-sm">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-medium capitalize">{log.action.replace(/_/g, ' ')}</span>
                                                <span className="text-xs text-muted-foreground">{format(log.createdAt, "Pp")}</span>
                                            </div>
                                            <p className="text-muted-foreground text-xs whitespace-pre-wrap">{log.details}</p>
                                        </div>
                                    ))}
                                    {logs.length === 0 && <p className="text-sm text-muted-foreground">No activity recorded.</p>}
                                </div>
                            </ScrollArea>
                        </div>
                    </TabsContent>
                </Tabs>
            </div >

            <DialogFooter className="px-6 py-4 border-t bg-muted/50 flex justify-between sm:justify-between">
                {isEdit ? (
                    <Button type="button" variant="destructive" onClick={handleDelete}>
                        Delete
                    </Button>
                ) : <div></div>}
                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" form="task-form">Save</Button>
                </div>
            </DialogFooter>
        </div >
    );
}
