"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateUserPreferences } from "@/lib/actions";
import { useActionResult } from "@/hooks/useActionResult";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { getEffectiveCalendarDenseTooltipThreshold } from "@/components/providers/UserProvider";

interface CalendarTooltipSettingsProps {
    userId: string;
    initialUseNativeTooltipsOnDenseDays: boolean | null;
    initialDenseTooltipThreshold: number | null;
}

const DEFAULT_THRESHOLD = 6;

export function CalendarTooltipSettings({
    userId,
    initialUseNativeTooltipsOnDenseDays,
    initialDenseTooltipThreshold,
}: CalendarTooltipSettingsProps) {
    const [useNativeTooltips, setUseNativeTooltips] = useState<boolean | null>(
        initialUseNativeTooltipsOnDenseDays
    );
    const [threshold, setThreshold] = useState<number | null>(initialDenseTooltipThreshold);
    const { execute, isLoading } = useActionResult<void>();

    const clampedThreshold = getEffectiveCalendarDenseTooltipThreshold(threshold, DEFAULT_THRESHOLD);

    const handleToggle = async (checked: boolean) => {
        setUseNativeTooltips(checked);
        const result = await execute(updateUserPreferences, userId, {
            calendarUseNativeTooltipsOnDenseDays: checked,
        });
        if (result.success) {
            toast.success(
                checked
                    ? "Dense calendar days now use native tooltips"
                    : "Dense calendar days now use rich tooltips"
            );
        }
    };

    const handleThresholdChange = async (value: string) => {
        const parsed = value.trim() === "" ? null : Number(value);
        const nextValue = parsed === null || Number.isNaN(parsed)
            ? null
            : getEffectiveCalendarDenseTooltipThreshold(parsed, DEFAULT_THRESHOLD);
        setThreshold(nextValue);

        const result = await execute(updateUserPreferences, userId, {
            calendarDenseTooltipThreshold: nextValue,
        });
        if (result.success) {
            toast.success("Updated dense tooltip threshold");
        }
    };

    const handleReset = async () => {
        setUseNativeTooltips(null);
        setThreshold(null);
        const result = await execute(updateUserPreferences, userId, {
            calendarUseNativeTooltipsOnDenseDays: null,
            calendarDenseTooltipThreshold: null,
        });
        if (result.success) {
            toast.success("Reset calendar tooltip preferences");
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <div className="space-y-0.5">
                        <Label htmlFor="calendar-dense-tooltips">
                            Dense calendar day tooltips
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            {useNativeTooltips === null
                                ? "Default behavior uses native tooltips on dense days"
                                : useNativeTooltips
                                    ? "Native tooltips on dense days"
                                    : "Rich tooltips on dense days"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {(useNativeTooltips !== null || threshold !== null) && (
                        <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs text-muted-foreground hover:text-primary"
                            onClick={handleReset}
                            disabled={isLoading}
                        >
                            Reset to default
                        </Button>
                    )}
                    <Switch
                        id="calendar-dense-tooltips"
                        checked={useNativeTooltips ?? true}
                        onCheckedChange={handleToggle}
                        disabled={isLoading}
                    />
                </div>
            </div>
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <Label htmlFor="calendar-dense-threshold">Dense day threshold</Label>
                    <p className="text-sm text-muted-foreground">
                        Use native tooltips when a day has more than {clampedThreshold} tasks.
                    </p>
                </div>
                <div className="w-24">
                    <Input
                        id="calendar-dense-threshold"
                        type="number"
                        min={1}
                        max={20}
                        value={threshold ?? ""}
                        onChange={(event) => handleThresholdChange(event.target.value)}
                        disabled={isLoading}
                    />
                </div>
            </div>
        </div>
    );
}
