"use client";

import * as React from "react";
import { m, AnimatePresence } from "framer-motion";
import { Clock, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface TimeEstimateInputProps {
    value: number | null;
    onChange: (value: number | null) => void;
    className?: string;
}

const PRESETS = [
    { label: "15m", value: 15 },
    { label: "30m", value: 30 },
    { label: "1h", value: 60 },
    { label: "2h", value: 120 },
    { label: "4h", value: 240 },
    { label: "8h", value: 480 },
];

function formatTime(minutes: number): string {
    if (minutes < 60) {
        return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function TimeEstimateInput({ value, onChange, className }: TimeEstimateInputProps) {
    const [customOpen, setCustomOpen] = React.useState(false);
    const [sliderValue, setSliderValue] = React.useState(value || 30);

    const isPreset = value !== null && PRESETS.some(p => p.value === value);

    return (
        <div className={cn("space-y-3", className)}>
            {/* Preset Buttons */}
            <div className="flex flex-wrap gap-2">
                {PRESETS.map((preset) => (
                    <m.button
                        key={preset.value}
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onChange(preset.value)}
                        className={cn(
                            "px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200",
                            value === preset.value
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-background hover:bg-muted border-border text-foreground hover:border-primary/50"
                        )}
                    >
                        {preset.label}
                    </m.button>
                ))}

                {/* Custom Popover */}
                <Popover open={customOpen} onOpenChange={setCustomOpen}>
                    <PopoverTrigger asChild>
                        <m.button
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={cn(
                                "px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200 flex items-center gap-1",
                                value !== null && !isPreset
                                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                    : "bg-background hover:bg-muted border-border text-foreground hover:border-primary/50"
                            )}
                        >
                            {value !== null && !isPreset ? formatTime(value) : "Custom"}
                            <ChevronDown className="h-3 w-3" />
                        </m.button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-4" align="start">
                        <div className="space-y-4">
                            <div className="text-sm font-medium text-muted-foreground">Custom Duration</div>

                            {/* Hours and Minutes Input */}
                            <div className="flex items-center gap-2">
                                <div className="flex-1">
                                    <label className="text-xs text-muted-foreground mb-1 block">Hours</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={8}
                                        value={Math.floor(sliderValue / 60)}
                                        onChange={(e) => {
                                            const hours = Math.max(0, Math.min(8, Number(e.target.value) || 0));
                                            const mins = sliderValue % 60;
                                            setSliderValue(hours * 60 + mins);
                                        }}
                                        className="w-full h-10 px-3 rounded-lg border bg-background text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <span className="text-xl font-bold text-muted-foreground mt-5">:</span>
                                <div className="flex-1">
                                    <label className="text-xs text-muted-foreground mb-1 block">Minutes</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={55}
                                        step={5}
                                        value={sliderValue % 60}
                                        onChange={(e) => {
                                            const hours = Math.floor(sliderValue / 60);
                                            const mins = Math.max(0, Math.min(55, Number(e.target.value) || 0));
                                            setSliderValue(hours * 60 + mins);
                                        }}
                                        className="w-full h-10 px-3 rounded-lg border bg-background text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </div>

                            {/* Slider for quick adjustment */}
                            <div className="space-y-2">
                                <input
                                    type="range"
                                    value={sliderValue}
                                    onChange={(e) => setSliderValue(Number(e.target.value))}
                                    min={5}
                                    max={480}
                                    step={5}
                                    className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>5m</span>
                                    <span className="font-medium text-foreground">{formatTime(sliderValue)}</span>
                                    <span>8h</span>
                                </div>
                            </div>

                            <Button
                                type="button"
                                size="sm"
                                className="w-full"
                                onClick={() => {
                                    onChange(Math.max(5, sliderValue));
                                    setCustomOpen(false);
                                }}
                            >
                                Set {formatTime(sliderValue)}
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Selected Value Display with Progress */}
            <AnimatePresence>
                {value !== null && (
                    <m.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border/50">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Estimate</span>
                                    <span className="font-medium">{formatTime(value)}</span>
                                </div>
                                {/* Visual Progress Bar */}
                                <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                                    <m.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min((value / 480) * 100, 100)}%` }}
                                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500"
                                        style={{
                                            background: value <= 60
                                                ? "linear-gradient(to right, #10b981, #10b981)"
                                                : value <= 120
                                                    ? "linear-gradient(to right, #10b981, #f59e0b)"
                                                    : value <= 240
                                                        ? "linear-gradient(to right, #10b981, #f59e0b, #ef4444)"
                                                        : "linear-gradient(to right, #10b981, #f59e0b, #ef4444, #dc2626)"
                                        }}
                                    />
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={() => onChange(null)}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    </m.div>
                )}
            </AnimatePresence>
        </div>
    );
}
