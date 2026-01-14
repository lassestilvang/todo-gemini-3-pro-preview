import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ErrorStateProps {
    error?: Error;
    reset?: () => void;
    title?: string;
    message?: string;
}

export function ErrorState({ error, reset, title = "Something went wrong", message = "We encountered an unexpected error. Please try again." }: ErrorStateProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center space-y-4 rounded-lg border bg-muted/30">
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-2">
                <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
                <p className="text-sm text-muted-foreground max-w-[400px]">
                    {message}
                </p>
                {error && (
                    <pre className="text-xs text-left bg-muted p-2 rounded overflow-auto max-w-[400px] max-h-[100px] mx-auto mt-2 opacity-70">
                        {error.message}
                    </pre>
                )}
            </div>
            {reset && (
                <Button
                    variant="outline"
                    onClick={reset}
                >
                    Try Again
                </Button>
            )}
        </div>
    );
}
