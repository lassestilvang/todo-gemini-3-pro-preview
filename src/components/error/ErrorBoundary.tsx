"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center space-y-4 rounded-lg border bg-muted/30">
                    <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                        <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-semibold tracking-tight">Something went wrong</h2>
                        <p className="text-sm text-muted-foreground max-w-[400px]">
                            We encountered an unexpected error. Please try again.
                        </p>
                        {this.state.error && (
                            <pre className="text-xs text-left bg-muted p-2 rounded overflow-auto max-w-[400px] max-h-[100px] mx-auto mt-2 opacity-70">
                                {this.state.error.message}
                            </pre>
                        )}
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => this.setState({ hasError: false, error: null })}
                    >
                        Try Again
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}
