"use client"

import * as React from "react"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface TimePickerProps {
    time?: string; // Format: "HH:mm"
    setTime: (time?: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

/**
 * Rounds a date up to the next 15-minute interval
 */
function roundUpTo15Minutes(date: Date): Date {
    const minutes = date.getMinutes();
    const remainder = minutes % 15;
    if (remainder === 0) {
        // Already on a 15-minute boundary, add 15 minutes
        return new Date(date.getTime() + 15 * 60 * 1000);
    }
    // Round up to the next 15-minute boundary
    const roundedMinutes = minutes + (15 - remainder);
    const result = new Date(date);
    result.setMinutes(roundedMinutes, 0, 0);
    return result;
}

/**
 * Generates an array of time strings in 15-minute intervals starting from the given time
 */
function generateTimeOptions(startTime: Date): string[] {
    const options: string[] = [];
    const start = roundUpTo15Minutes(startTime);

    // Generate times for the next 24 hours in 15-minute intervals
    for (let i = 0; i < 96; i++) {
        const time = new Date(start.getTime() + i * 15 * 60 * 1000);
        const hours = time.getHours().toString().padStart(2, "0");
        const minutes = time.getMinutes().toString().padStart(2, "0");
        options.push(`${hours}:${minutes}`);
    }

    return options;
}


/**
 * Validates and formats a time string to HH:mm format
 */
function parseTimeInput(input: string): string | null {
    // Remove any non-digit characters except colon
    const cleaned = input.replace(/[^\d:]/g, "");

    // Try to parse common formats
    let hours: number;
    let minutes: number;

    if (cleaned.includes(":")) {
        const parts = cleaned.split(":");
        hours = parseInt(parts[0], 10);
        minutes = parseInt(parts[1] || "0", 10);
    } else if (cleaned.length <= 2) {
        hours = parseInt(cleaned, 10);
        minutes = 0;
    } else if (cleaned.length <= 4) {
        hours = parseInt(cleaned.slice(0, -2), 10);
        minutes = parseInt(cleaned.slice(-2), 10);
    } else {
        return null;
    }

    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return null;
    }

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

export function TimePicker({ time, setTime, placeholder = "Select time", disabled = false }: TimePickerProps) {
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState(time || "");
    const [timeOptions, setTimeOptions] = React.useState<string[]>([]);
    const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const listRef = React.useRef<HTMLDivElement>(null);
    const optionRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
    const justSelectedRef = React.useRef(false);

    // Update input value when time prop changes
    React.useEffect(() => {
        setInputValue(time || "");
    }, [time]);

    // Generate time options when popover opens
    React.useEffect(() => {
        if (open) {
            setTimeOptions(generateTimeOptions(new Date()));
            setHighlightedIndex(-1);
        }
    }, [open]);

    // Scroll highlighted option into view
    React.useEffect(() => {
        if (highlightedIndex >= 0 && optionRefs.current[highlightedIndex]) {
            optionRefs.current[highlightedIndex]?.scrollIntoView({
                block: "nearest",
                behavior: "smooth"
            });
        }
    }, [highlightedIndex]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);
        setHighlightedIndex(-1);
    };

    const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        // Check if focus is moving to the popover content
        const relatedTarget = e.relatedTarget as HTMLElement;
        if (relatedTarget?.closest('[data-radix-popper-content-wrapper]')) {
            return;
        }

        if (inputValue.trim() === "") {
            setTime(undefined);
            return;
        }

        const parsed = parseTimeInput(inputValue);
        if (parsed) {
            setInputValue(parsed);
            setTime(parsed);
        } else {
            // Reset to previous valid value
            setInputValue(time || "");
        }
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
                handleSelectTime(filteredOptions[highlightedIndex]);
            } else {
                const parsed = parseTimeInput(inputValue);
                if (parsed) {
                    setInputValue(parsed);
                    setTime(parsed);
                } else {
                    setInputValue(time || "");
                }
                setOpen(false);
            }
        } else if (e.key === "Escape") {
            setInputValue(time || "");
            setOpen(false);
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            if (!open) {
                setOpen(true);
            } else {
                setHighlightedIndex(prev => 
                    prev < filteredOptions.length - 1 ? prev + 1 : prev
                );
            }
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (open) {
                setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
            }
        }
    };

    const handleSelectTime = (selectedTime: string) => {
        justSelectedRef.current = true;
        setInputValue(selectedTime);
        setTime(selectedTime);
        setOpen(false);
        // Reset the flag after a short delay
        setTimeout(() => {
            justSelectedRef.current = false;
        }, 100);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        justSelectedRef.current = true;
        setInputValue("");
        setTime(undefined);
        setOpen(false);
        // Reset the flag after a short delay
        setTimeout(() => {
            justSelectedRef.current = false;
        }, 100);
    };

    const handleFocus = () => {
        if (!disabled && !justSelectedRef.current) {
            setOpen(true);
        }
    };

    const handleOpenChange = (newOpen: boolean) => {
        // Don't reopen if we just selected something
        if (newOpen && justSelectedRef.current) {
            return;
        }
        setOpen(newOpen);
    };

    // Filter options based on input
    const filteredOptions = inputValue
        ? timeOptions.filter(opt => opt.startsWith(inputValue.replace(":", "").slice(0, 2)))
        : timeOptions;

    return (
        <Popover open={open && !disabled} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild onClick={(e) => e.preventDefault()}>
                <div className="relative">
                    <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onBlur={handleInputBlur}
                        onKeyDown={handleInputKeyDown}
                        onFocus={handleFocus}
                        placeholder={placeholder}
                        disabled={disabled}
                        className={cn(
                            "w-full pl-8",
                            !time && "text-muted-foreground",
                            disabled && "cursor-not-allowed opacity-50"
                        )}
                        aria-label="Time input"
                    />
                </div>
            </PopoverTrigger>
            <PopoverContent
                className="w-[140px] p-0"
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
                onInteractOutside={(e) => {
                    // Don't close if clicking on the input
                    if (inputRef.current?.contains(e.target as Node)) {
                        e.preventDefault();
                    }
                }}
            >
                <ScrollArea className="h-[200px]">
                    <div ref={listRef} className="p-1" role="listbox">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option, index) => (
                                <Button
                                    key={option}
                                    ref={(el) => { optionRefs.current[index] = el; }}
                                    variant="ghost"
                                    role="option"
                                    aria-selected={time === option}
                                    className={cn(
                                        "w-full justify-start font-normal",
                                        time === option && "bg-accent",
                                        highlightedIndex === index && "bg-accent/50"
                                    )}
                                    onClick={() => handleSelectTime(option)}
                                    onMouseEnter={() => setHighlightedIndex(index)}
                                >
                                    {option}
                                </Button>
                            ))
                        ) : (
                            <div className="py-2 px-3 text-sm text-muted-foreground">
                                No matching times
                            </div>
                        )}
                    </div>
                </ScrollArea>
                {time && (
                    <div className="border-t p-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-center text-destructive hover:text-destructive"
                            onClick={handleClear}
                        >
                            Clear
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    )
}

export { generateTimeOptions, parseTimeInput, roundUpTo15Minutes };
