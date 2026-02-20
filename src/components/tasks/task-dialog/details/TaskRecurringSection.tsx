
import React from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface TaskRecurringSectionProps {
    isRecurring: boolean;
    setIsRecurring: (v: boolean) => void;
    recurringRule: string;
    setRecurringRule: (v: string) => void;
    isHabit: boolean;
    setIsHabit: (v: boolean) => void;
}

export function TaskRecurringSection({
    isRecurring, setIsRecurring,
    recurringRule, setRecurringRule,
    isHabit, setIsHabit
}: TaskRecurringSectionProps) {
    return (
        <>
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
        </>
    );
}
