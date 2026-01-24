"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { updateUserPreferences } from "@/lib/actions";
import { useActionResult } from "@/hooks/useActionResult";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";

interface WeekStartSettingsProps {
    userId: string;
    initialWeekStartsOnMonday: boolean | null;
}

export function WeekStartSettings({ userId, initialWeekStartsOnMonday }: WeekStartSettingsProps) {
    const [weekStartsOnMonday, setWeekStartsOnMonday] = useState<boolean | null>(initialWeekStartsOnMonday);
    const { execute, isLoading } = useActionResult<void>();

    // Auto-detection logic for display purposes if null
    const getEffectiveValue = () => {
        if (weekStartsOnMonday !== null) return weekStartsOnMonday;
        // Detect system preference from locale
        try {
            const locale = Intl.DateTimeFormat().resolvedOptions().locale;
            const mondayStartLocales = ['en-GB', 'de', 'fr', 'es', 'it', 'nl', 'pt', 'pl', 'ru', 'ja', 'zh', 'ko'];
            return mondayStartLocales.some(l => locale.startsWith(l));
        } catch {
            return false;
        }
    };

    const handleToggle = async (checked: boolean) => {
        setWeekStartsOnMonday(checked);
        const result = await execute(updateUserPreferences, userId, { weekStartsOnMonday: checked });
        if (result.success) {
            toast.success(`Week now starts on ${checked ? 'Monday' : 'Sunday'}`);
        }
    };

    const handleReset = async () => {
        setWeekStartsOnMonday(null);
        const result = await execute(updateUserPreferences, userId, { weekStartsOnMonday: null });
        if (result.success) {
            toast.success("Reset to system locale preference");
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <div className="space-y-0.5">
                        <Label htmlFor="week-start">Week Starts on Monday</Label>
                        <p className="text-sm text-muted-foreground">
                            {weekStartsOnMonday === null
                                ? `Currently using system preference (${getEffectiveValue() ? 'Monday' : 'Sunday'})`
                                : `Manually set to ${weekStartsOnMonday ? 'Monday' : 'Sunday'}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {weekStartsOnMonday !== null && (
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
                        id="week-start"
                        checked={getEffectiveValue()}
                        onCheckedChange={handleToggle}
                        disabled={isLoading}
                    />
                </div>
            </div>
        </div>
    );
}
