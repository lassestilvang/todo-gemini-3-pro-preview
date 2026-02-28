import React from "react";

// Shared UI Mocks to avoid Radix/Portal issues in happy-dom and ensure consistency

// --- Dialog Mock ---
const DialogContext = React.createContext<{ open: boolean; setOpen: (o: boolean) => void }>({ open: false, setOpen: () => { } });

export const DialogMocks = {
    Dialog: ({ children, open, onOpenChange }: { children: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) => {
        const [internalOpen, setInternalOpen] = React.useState(false);
        const isControlled = open !== undefined;
        const isOpen = isControlled ? open : internalOpen;
        const handleOpenChange = (newOpen: boolean) => {
            if (isControlled && onOpenChange) {
                onOpenChange(newOpen);
            }
            setInternalOpen(newOpen);
        };

        return (
            <DialogContext.Provider value={{ open: !!isOpen, setOpen: handleOpenChange }}>
                <div data-testid="dialog-root" data-open={isOpen}>
                    {children}
                </div>
            </DialogContext.Provider>
        );
    },
    DialogTrigger: ({ children, asChild, onClick }: { children: React.ReactNode; asChild?: boolean; onClick?: () => void }) => {
        const { setOpen } = React.useContext(DialogContext);
        return (
            <div
                data-testid="dialog-trigger"
                role="button"
                tabIndex={0}
                onClick={() => {
                    if (onClick) onClick();
                    setOpen(true);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (onClick) onClick();
                        setOpen(true);
                    }
                }}
            >
                {asChild ? children : <button>{children}</button>}
            </div>
        );
    },
    DialogContent: ({ children }: { children: React.ReactNode }) => {
        const { open } = React.useContext(DialogContext);
        if (!open) return null;
        return (
            <div role="dialog" data-testid="dialog-content">
                {children}
            </div>
        );
    },
    DialogHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-header">{children}</div>,
    DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
    DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
    DialogFooter: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-footer">{children}</div>,
};

// --- Select Mock ---
export const SelectMocks = {
    Select: ({ children, value, onValueChange }: { children: React.ReactNode; value?: string; onValueChange?: (val: string) => void }) => (
        <div
            data-testid="select-root"
            data-value={value}
            role="button"
            tabIndex={0}
            onClick={() => { if (onValueChange) onValueChange(value === "none" ? "mock-value" : "none"); }}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (onValueChange) onValueChange(value === "none" ? "mock-value" : "none");
                }
            }}
        >
            {children}
        </div>
    ),
    SelectTrigger: ({ children, "data-testid": testId }: { children: React.ReactNode; "data-testid"?: string }) => (
        <button data-testid={testId || "select-trigger"}>{children}</button>
    ),
    SelectValue: ({ children, placeholder }: { children?: React.ReactNode; placeholder?: string }) => <span>{children || placeholder}</span>,
    SelectContent: ({ children }: { children: React.ReactNode }) => <div data-testid="select-content">{children}</div>,
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
        <div
            data-testid={`select-item-${value}`}
            role="option"
            aria-selected="false"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                }
            }}
        >
            {children}
        </div>
    ),
};

// --- Popover Mock ---
export const PopoverMocks = {
    Popover: ({ children, open }: { children: React.ReactNode; open?: boolean }) => <div data-testid="popover-root" data-open={open}>{children}</div>,
    PopoverContent: ({ children }: { children: React.ReactNode }) => <div data-testid="popover-content">{children}</div>,
    PopoverTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => asChild ? children : <button>{children}</button>,
};

// --- Tooltip Mock ---
export const TooltipMocks = {
    Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => asChild ? children : <button>{children}</button>,
    TooltipContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-content">{children}</div>,
    TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
};

// --- IconPicker Mock ---
export const IconPickerMocks = {
    IconPicker: ({ value, onChange, trigger }: { value: string | null; onChange: (v: string) => void; trigger: React.ReactNode }) => (
        <div data-testid="icon-picker">
            {trigger}
            <input
                data-testid="icon-picker-input"
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    ),
};

// --- ResolvedIcon Mock ---
export const ResolvedIconMocks = {
    ResolvedIcon: ({ icon, className }: { icon: string; className?: string }) => (
        <div data-testid={`icon-${icon}`} className={className}>
            {icon}
        </div>
    )
};
