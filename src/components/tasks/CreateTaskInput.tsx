import { reducer, State, Action } from "@/lib/tasks/create-task-reducer";
import { CreateTaskFooter } from "./create-task/CreateTaskFooter";
import { TaskBadges } from "./create-task/TaskBadges";

export function CreateTaskInput({ listId, defaultDueDate, userId, defaultLabelIds }: { listId?: number, defaultDueDate?: Date | string, userId: string, defaultLabelIds?: number[] }) {
    const { dispatch } = useSync();
    const { weekStartsOnMonday } = useUser();

    const [state, dispatchState] = useReducer(reducer, {
        title: "",
        dueDate: defaultDueDate ? new Date(defaultDueDate) : undefined,
        dueDatePrecision: "day",
        dueDateSource: defaultDueDate ? "default" : "none",
        priority: "none",
        energyLevel: undefined,
        context: undefined,
        isExpanded: false,
        isAiLoading: false,
        isSubmitting: false,
        isDialogOpen: false,
        isCalendarOpen: false,
        isPriorityOpen: false,
        icon: undefined,
    });

    const {
        title, dueDate, priority, energyLevel,
        context, isExpanded, isDialogOpen, icon
    } = state;

    const isClient = useIsClient();
    const inputRef = useRef<HTMLInputElement>(null);

    const updateTitle = (nextTitle: string) => {
        const parsed = nextTitle.trim() ? parseNaturalLanguage(nextTitle, { weekStartsOnMonday: weekStartsOnMonday ?? false }) : undefined;
        dispatchState({ type: "SET_TITLE", payload: nextTitle, parsed });
    };

    const handleAiEnhance = async () => {
        if (!title.trim()) return;
        dispatchState({ type: "SET_UI_STATE", payload: { isAiLoading: true } });
        const result = await extractDeadline(title).catch(() => null);
        if (!result) {
            toast.error("Failed to extract deadline. Check API key.");
            dispatchState({ type: "SET_UI_STATE", payload: { isAiLoading: false } });
            return;
        }

        if (result.date) {
            dispatchState({ type: "SET_DUE_DATE", payload: { date: result.date, source: "nlp" } });
            toast.success(`Deadline detected: ${format(result.date, "MMM d")}`);
        } else {
            toast.info("No deadline found in text.");
        }

        dispatchState({ type: "SET_UI_STATE", payload: { isAiLoading: false } });
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!title.trim()) return;

        const parsed = parseNaturalLanguage(title, { weekStartsOnMonday: weekStartsOnMonday ?? false });

        if (!userId) {
            toast.error("Unable to create task: missing user ID");
            return;
        }

        dispatchState({ type: "SET_UI_STATE", payload: { isSubmitting: true } });
        const createResult = await Promise.resolve()
            .then(() => dispatch('createTask', {
                userId,
                title: parsed.title || title,
                listId: listId || null,
                priority,
                energyLevel: energyLevel || null,
                context: context || null,
                dueDate: dueDate || null,
                dueDatePrecision: dueDate ? state.dueDatePrecision : null,
                labelIds: defaultLabelIds,
                icon: icon || null,
            }))
            .then(
                () => true,
                (error) => {
                    console.error("Failed to create task:", error);
                    return false;
                }
            );

        if (!createResult) {
            toast.error("Failed to create task");
            dispatchState({ type: "SET_UI_STATE", payload: { isSubmitting: false } });
            return;
        }

        dispatchState({ type: "RESET", payload: { defaultDueDate: defaultDueDate as Date | undefined } });
        toast.success("Task created");
    };

    const handleFullDetails = () => {
        dispatchState({ type: "SET_UI_STATE", payload: { isDialogOpen: true } });
    };

    const handleClear = () => {
        updateTitle("");
        inputRef.current?.focus();
    };

    const insertSyntax = (text: string) => {
        const trimmed = title.trimEnd();
        updateTitle(trimmed ? `${trimmed} ${text} ` : `${text} `);
        inputRef.current?.focus();
    };

    return (
        <div className="mb-6">
            <div
                className={cn(
                    "relative rounded-lg border bg-background shadow-sm transition-all",
                    isExpanded ? "ring-2 ring-primary" : "hover:border-primary/50"
                )}
            >
                <form onSubmit={handleSubmit} className="flex flex-col">
                    <div className="relative w-full">
                        <Input
                            ref={inputRef}
                            value={title}
                            onChange={(e) => updateTitle(e.target.value)}
                            onFocus={() => dispatchState({ type: "SET_UI_STATE", payload: { isExpanded: true } })}
                            onKeyDown={(e) => {
                                if (state.isSubmitting) return;

                                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                                    e.preventDefault();
                                    handleSubmit();
                                }
                            }}
                            placeholder="Add a task... (try 'Buy milk tomorrow !high @errands')"
                            className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-lg py-6 pr-10"
                            data-testid="task-input"
                            aria-label="Create new task"
                        />
                        {title && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                onClick={handleClear}
                                aria-label="Clear task title"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>

                    <TaskBadges
                        state={state}
                        dispatchState={dispatchState}
                        onRemoveFocus={() => inputRef.current?.focus()}
                    />

                    {isExpanded && (
                        <CreateTaskFooter
                            state={state}
                            dispatchState={dispatchState}
                            userId={userId}
                            isClient={isClient}
                            onAiEnhance={handleAiEnhance}
                            onInsertSyntax={insertSyntax}
                            onFullDetails={handleFullDetails}
                            onCancel={() => dispatchState({ type: "SET_UI_STATE", payload: { isExpanded: false } })}
                            onSubmit={handleSubmit}
                        />
                    )}
                </form>
            </div>

            <TaskDialog
                initialTitle={title}
                initialPriority={priority !== "none" ? priority : undefined}
                initialEnergyLevel={energyLevel}
                initialContext={context}
                open={isDialogOpen}
                onOpenChange={(open) => {
                    dispatchState({ type: "SET_UI_STATE", payload: { isDialogOpen: open } });
                }}
                defaultListId={listId}
                defaultDueDate={dueDate}
                userId={userId}
            />
        </div>
    );
}
