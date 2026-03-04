
import React, { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { format, subDays } from "date-fns";
import { getDueRange, type DuePrecision } from "@/lib/due-utils";

interface TaskRemindersSectionProps {
    isEdit: boolean;
    dueDate: Date | undefined;
    dueDatePrecision: DuePrecision;
    weekStartsOnMonday?: boolean;
    reminders: Array<{ id: number; remindAt: Date; }>;
    newReminderDate: Date | undefined;
    setNewReminderDate: (v: Date | undefined) => void;
    handleAddReminder: (date?: Date) => void;
    handleDeleteReminder: (id: number) => void;
}

export function TaskRemindersSection({
    isEdit,
    dueDate, dueDatePrecision, weekStartsOnMonday,
    reminders, newReminderDate, setNewReminderDate, handleAddReminder, handleDeleteReminder
}: TaskRemindersSectionProps) {
    const reminderRange = useMemo(() => {
        if (!dueDate || dueDatePrecision === "day") return null;
        return getDueRange(dueDate, dueDatePrecision, weekStartsOnMonday ?? false);
    }, [dueDate, dueDatePrecision, weekStartsOnMonday]);

    const effectiveReminderDate = useMemo(() => {
        if (!isEdit || !reminderRange) return newReminderDate;
        if (!newReminderDate) return reminderRange.start;
        const time = newReminderDate.getTime();
        if (time < reminderRange.start.getTime() || time >= reminderRange.endExclusive.getTime()) {
            return reminderRange.start;
        }
        return newReminderDate;
    }, [isEdit, newReminderDate, reminderRange]);

    const reminderDisabled = reminderRange
        ? (date: Date) =>
            date.getTime() < reminderRange.start.getTime()
            || date.getTime() >= reminderRange.endExclusive.getTime()
        : undefined;

    const reminderRangeLabel = reminderRange
        ? `${format(reminderRange.start, "PPP")} – ${format(subDays(reminderRange.endExclusive, 1), "PPP")}`
        : null;
    const reminderToDate = reminderRange
        ? subDays(reminderRange.endExclusive, 1)
        : undefined;

    if (!isEdit) return null;

    return (
        <div className="space-y-2 border-t pt-4 mt-4">
            <Label>Reminders</Label>
            <div className="flex items-center gap-2 mb-2">
                <div className="flex-1">
                    <DatePicker
                        date={effectiveReminderDate}
                        setDate={setNewReminderDate}
                        disabled={reminderDisabled}
                        fromDate={reminderRange?.start}
                        toDate={reminderToDate}
                    />
                </div>
                <Button
                    type="button"
                    onClick={() => handleAddReminder(effectiveReminderDate)}
                    size="sm"
                    disabled={!effectiveReminderDate}
                    aria-label="Add reminder"
                >
                    Add reminder
                </Button>
            </div>
            {reminderRangeLabel && (
                <p className="text-xs text-muted-foreground">
                    Choose a date within {reminderRangeLabel}. Default is the first day of the period.
                </p>
            )}
            <div className="space-y-2">
                {reminders.map(reminder => (
                    <div key={reminder.id} className="flex items-center justify-between bg-muted/50 p-2 rounded-md text-sm">
                        <span>{format(reminder.remindAt, "PPP p")}</span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteReminder(reminder.id)}
                            className="h-6 w-6"
                            aria-label={`Delete reminder for ${format(reminder.remindAt, "PPP p")}`}
                        >
                            <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                    </div>
                ))}
                {reminders.length === 0 && <p className="text-sm text-muted-foreground">No reminders set.</p>}
            </div>
        </div>
    );
}
