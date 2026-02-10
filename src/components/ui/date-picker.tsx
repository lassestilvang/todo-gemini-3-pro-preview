"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatFriendlyDate } from "@/lib/time-utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
    date?: Date;
    setDate: (date?: Date) => void;
    disabled?: React.ComponentProps<typeof Calendar>["disabled"];
    fromDate?: Date;
    toDate?: Date;
}

export function DatePicker({ date, setDate, disabled, fromDate, toDate }: DatePickerProps) {
    const [open, setOpen] = React.useState(false)
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? (mounted ? formatFriendlyDate(date, "PPP") : format(date, "PPP")) : <span>Pick a date</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                        setDate(d)
                        setOpen(false)
                    }}
                    disabled={disabled}
                    fromDate={fromDate}
                    toDate={toDate}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    )
}
