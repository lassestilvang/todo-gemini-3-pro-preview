
import React from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { VoiceInput } from "../VoiceInput";
import { TaskMetadataBar } from "./TaskMetadataBar";
import { SmartSyntaxPopover } from "./SmartSyntaxPopover";
import { State, Action } from "@/lib/tasks/create-task-reducer";

interface CreateTaskFooterProps {
    state: State;
    dispatchState: React.Dispatch<Action>;
    userId: string;
    isClient: boolean;
    onAiEnhance: () => void;
    onInsertSyntax: (text: string) => void;
    onFullDetails: () => void;
    onCancel: () => void;
    onSubmit: () => void;
}

export function CreateTaskFooter({
    state,
    dispatchState,
    userId,
    isClient,
    onAiEnhance,
    onInsertSyntax,
    onFullDetails,
    onCancel,
    onSubmit
}: CreateTaskFooterProps) {
    const { title, isAiLoading, isSubmitting } = state;
    const isDisabled = !title.trim() || !userId || isSubmitting;

    return (
        <div className="flex items-center justify-between p-2 border-t bg-muted/20 rounded-b-lg">
            <TaskMetadataBar
                state={state}
                dispatchState={dispatchState}
                userId={userId}
                isClient={isClient}
            />

            <div className="flex items-center gap-2">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onAiEnhance}
                            disabled={isAiLoading || !title.trim()}
                            className="text-purple-500 hover:text-purple-600 hover:bg-purple-50"
                        >
                            {isAiLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Sparkles className="h-4 w-4" />
                            )}
                            <span className="ml-2 sr-only">AI Detect</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Auto-detect details from text</p>
                    </TooltipContent>
                </Tooltip>

                <VoiceInput onTranscript={(text) => {
                    const nextTitle = title ? `${title} ${text}` : text;
                    dispatchState({ type: "SET_TITLE", payload: nextTitle });
                    dispatchState({ type: "SET_UI_STATE", payload: { isExpanded: true } });
                }} />

                <SmartSyntaxPopover onInsert={onInsertSyntax} />

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onFullDetails}
                    className="text-xs text-muted-foreground hover:text-foreground"
                >
                    Full Details
                </Button>
            </div>

            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onCancel}
                >
                    Cancel
                </Button>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span tabIndex={isDisabled ? 0 : -1} className="inline-block">
                            <Button
                                type="submit"
                                size="sm"
                                disabled={isDisabled}
                                data-testid="add-task-button"
                                className="w-full"
                                onClick={(e) => {
                                    e.preventDefault();
                                    onSubmit();
                                }}
                            >
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Add Task
                            </Button>
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Add Task (⌘Enter)</p>
                    </TooltipContent>
                </Tooltip>
            </div>
        </div>
    );
}
