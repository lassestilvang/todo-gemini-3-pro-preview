
import React from "react";
import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface SmartSyntaxPopoverProps {
    onInsert: (text: string) => void;
}

export function SmartSyntaxPopover({ onInsert }: SmartSyntaxPopoverProps) {
    return (
        <Popover>
            <Tooltip>
                <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            aria-label="Smart syntax guide"
                        >
                            <Keyboard className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Smart Syntax Guide</p>
                </TooltipContent>
            </Tooltip>
            <PopoverContent className="w-80">
                <div className="grid gap-4">
                    <div className="space-y-1">
                        <h4 className="font-medium leading-none">Smart Syntax</h4>
                        <p className="text-sm text-muted-foreground">Type or click these to quickly set properties.</p>
                    </div>
                    <div className="grid gap-2">
                        <div className="grid grid-cols-3 items-center gap-4">
                            <span className="text-sm font-medium">Priority</span>
                            <div className="col-span-2 text-sm font-mono text-muted-foreground flex gap-1">
                                {["!high", "!m", "!low"].map(s => (
                                    <Badge key={s} variant="secondary" asChild className="px-1 py-0 h-5 font-normal cursor-pointer hover:bg-secondary/80">
                                        <button type="button" onClick={() => onInsert(s)}>{s}</button>
                                    </Badge>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4">
                            <span className="text-sm font-medium">Context</span>
                            <div className="col-span-2 text-sm font-mono text-muted-foreground flex flex-wrap gap-1">
                                {["@work", "@home"].map(s => (
                                    <Badge key={s} variant="secondary" asChild className="px-1 py-0 h-5 font-normal cursor-pointer hover:bg-secondary/80">
                                        <button type="button" onClick={() => onInsert(s)}>{s}</button>
                                    </Badge>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4">
                            <span className="text-sm font-medium">Date</span>
                            <div className="col-span-2 text-sm font-mono text-muted-foreground flex flex-wrap gap-1">
                                {["today", "tomorrow", "next fri"].map(s => (
                                    <Badge key={s} variant="secondary" asChild className="px-1 py-0 h-5 font-normal cursor-pointer hover:bg-secondary/80">
                                        <button type="button" onClick={() => onInsert(s)}>{s}</button>
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
