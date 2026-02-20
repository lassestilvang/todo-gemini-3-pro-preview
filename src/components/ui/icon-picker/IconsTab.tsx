
import React from "react";
import { TabsContent } from "@/components/ui/tabs";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResolvedIcon } from "../resolved-icon";
import { COMMON_COLORS, IconPickerState, IconPickerAction } from "./types";

interface IconPickerIconsTabProps {
    state: IconPickerState;
    dispatch: React.Dispatch<IconPickerAction>;
    filteredStandardIcons: Array<{ name: string; tags: string[] }>;
    handleSelectIcon: (name: string) => void;
}

export function IconPickerIconsTab({ state, dispatch, filteredStandardIcons, handleSelectIcon }: IconPickerIconsTabProps) {
    const { selectedColor } = state;
    return (
        <TabsContent value="icons" className="m-0 border-none min-h-[300px]">
            <div className="p-4 space-y-4">
                <div className="flex flex-wrap gap-2 pb-2 border-b">
                    {COMMON_COLORS.map(c => (
                        <button
                            key={c}
                            onClick={() => dispatch({ type: 'SET_SELECTED_COLOR', payload: selectedColor === c ? null : c })}
                            className={cn(
                                "w-5 h-5 rounded-full border border-transparent transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none",
                                selectedColor === c && "ring-2 ring-primary ring-offset-2 scale-110"
                            )}
                            style={{ backgroundColor: c }}
                            title={c}
                            aria-label={`Select ${c} color`}
                            aria-pressed={selectedColor === c}
                        />
                    ))}
                    <button
                        onClick={() => dispatch({ type: 'SET_SELECTED_COLOR', payload: null })}
                        className={cn(
                            "w-5 h-5 rounded-full border border-muted bg-transparent flex items-center justify-center text-[10px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none",
                            !selectedColor && "ring-2 ring-primary ring-offset-2"
                        )}
                        title="None"
                        aria-label="Clear color selection"
                        aria-pressed={!selectedColor}
                    >
                        <X className="h-3 w-3" />
                    </button>
                </div>

                <div className="h-[250px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
                    <div className="grid grid-cols-7 gap-1 pr-1">
                        {filteredStandardIcons.map((item) => (
                            <button
                                key={item.name}
                                onClick={() => handleSelectIcon(item.name)}
                                className="flex items-center justify-center w-full aspect-square rounded-md hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
                                title={item.name}
                                aria-label={`Select ${item.name} icon`}
                            >
                                <ResolvedIcon
                                    icon={item.name}
                                    className="h-5 w-5"
                                    color={selectedColor}
                                />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </TabsContent>
    );
}
