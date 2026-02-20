
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import { TemplateFormData, ValidationErrors } from "@/lib/template-form-utils";

interface TemplateBasicInfoProps {
    formData: TemplateFormData;
    errors: ValidationErrors;
    updateField: <K extends keyof TemplateFormData>(field: K, value: TemplateFormData[K]) => void;
}

function VariableHelperText() {
    return (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Info className="h-3 w-3" />
            <span>
                Available variables: <code className="bg-muted px-1 rounded">{"{date}"}</code>,{" "}
                <code className="bg-muted px-1 rounded">{"{tomorrow}"}</code>,{" "}
                <code className="bg-muted px-1 rounded">{"{next_week}"}</code>
            </span>
        </p>
    );
}

export function TemplateBasicInfo({ formData, errors, updateField }: TemplateBasicInfoProps) {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                    id="template-name"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="e.g., Weekly Report"
                    className={cn(errors.name && "border-destructive")}
                    data-testid="template-name-input"
                />
                {errors.name && (
                    <p className="text-sm text-destructive" data-testid="name-error">
                        {errors.name}
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="task-title">Task Title</Label>
                <Input
                    id="task-title"
                    value={formData.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    placeholder="e.g., Complete {date} report"
                    className={cn(errors.title && "border-destructive")}
                    data-testid="task-title-input"
                />
                {errors.title && (
                    <p className="text-sm text-destructive" data-testid="title-error">
                        {errors.title}
                    </p>
                )}
                <VariableHelperText />
            </div>

            <div className="space-y-2">
                <Label htmlFor="task-description">Description (optional)</Label>
                <Textarea
                    id="task-description"
                    value={formData.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder="Add a description..."
                    className="min-h-[80px]"
                    data-testid="task-description-input"
                />
                <VariableHelperText />
            </div>
        </div>
    );
}
