"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { updateUserPreferences } from "@/lib/actions";
import { useActionResult } from "@/hooks/useActionResult";
import { Clock } from "lucide-react";
import { toast } from "sonner";

interface TimeSettingsProps {
    userId: string;
    initialUse24HourClock: boolean | null;
}

export function TimeSettings({ userId, initialUse24HourClock }: TimeSettingsProps) {
    const [use24h, setUse24h] = useState<boolean | null>(() => initialUse24HourClock);
    const { execute, isLoading } = useActionResult<void>();

    // Auto-detection logic for display purposes if null
    const getEffectiveValue = () => {
        if (use24h !== null) return use24h;
        // Detect system preference
        return !new Intl.DateTimeFormat(undefined, { hour: 'numeric' })
            .formatToParts(new Date())
            .some(part => part.type === 'dayPeriod');
    };

    const handleToggle = async (checked: boolean) => {
        setUse24h(checked);
        const result = await execute(updateUserPreferences, userId, { use24HourClock: checked });
        if (result.success) {
            toast.success(`Switched to ${checked ? '24-hour' : '12-hour'} clock`);
        }
    };

    const handleReset = async () => {
        setUse24h(null);
        const result = await execute(updateUserPreferences, userId, { use24HourClock: null });
        if (result.success) {
            toast.success("Reset to system time preference");
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div className="space-y-0.5">
                        <Label htmlFor="time-format">24-Hour Clock</Label>
                        <p className="text-sm text-muted-foreground">
                            {use24h === null
                                ? `Currently using system preference (${getEffectiveValue() ? '24h' : '12h'})`
                                : `Manually set to ${use24h ? '24h' : '12h'}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {use24h !== null && (
                        <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs text-muted-foreground hover:text-primary"
                            onClick={handleReset}
                            disabled={isLoading}
                        >
                            Reset to auto
                        </Button>
                    )}
                    <Switch
                        id="time-format"
                        checked={getEffectiveValue()}
                        onCheckedChange={handleToggle}
                        disabled={isLoading}
                    />
                </div>
            </div>
        </div>
    );
}
