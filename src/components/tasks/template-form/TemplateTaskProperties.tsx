
import React from "react";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { TemplateFormData } from "@/lib/template-form-utils";

interface TemplateTaskPropertiesProps {
    formData: TemplateFormData;
    updateField: <K extends keyof TemplateFormData>(field: K, value: TemplateFormData[K]) => void;
}

export function TemplateTaskProperties({ formData, updateField }: TemplateTaskPropertiesProps) {
    return (
        <div className="grid gap-6">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                        value={formData.priority}
                        onValueChange={(value) =>
                            updateField("priority", value as TemplateFormData["priority"])
                        }
                    >
<SelectTrigger data-testid="priority-select" aria-label="Priority">
                            <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Select
                        value={formData.dueDateType}
                        onValueChange={(value) =>
                            updateField("dueDateType", value as TemplateFormData["dueDateType"])
                        }
                    >
<SelectTrigger data-testid="due-date-select" aria-label="Due Date">
                            <SelectValue placeholder="Select due date" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="tomorrow">Tomorrow</SelectItem>
                            <SelectItem value="next_week">Next Week</SelectItem>
                            <SelectItem value="custom">Custom (days)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {formData.dueDateType === "custom" && (
                <div className="space-y-2">
                    <Label htmlFor="due-date-days">Days from now</Label>
                    <Input
                        id="due-date-days"
                        type="number"
                        min="1"
                        value={formData.dueDateDays || ""}
                        onChange={(e) =>
                            updateField(
                                "dueDateDays",
                                e.target.value ? parseInt(e.target.value, 10) : undefined
                            )
                        }
                        placeholder="e.g., 3"
                        data-testid="due-date-days-input"
                    />
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Energy Level</Label>
                    <Select
                        value={formData.energyLevel}
                        onValueChange={(value) =>
                            updateField("energyLevel", value as TemplateFormData["energyLevel"])
                        }
                    >
<SelectTrigger data-testid="energy-select" aria-label="Energy Level">
                            <SelectValue placeholder="Select energy" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="low">Low 🪫</SelectItem>
                            <SelectItem value="medium">Medium 🔌</SelectItem>
                            <SelectItem value="high">High 🔋</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Context</Label>
                    <Select
                        value={formData.context}
                        onValueChange={(value) =>
                            updateField("context", value as TemplateFormData["context"])
                        }
                    >
<SelectTrigger data-testid="context-select" aria-label="Context">
                            <SelectValue placeholder="Select context" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="computer">Computer 💻</SelectItem>
                            <SelectItem value="phone">Phone 📱</SelectItem>
                            <SelectItem value="errands">Errands 🏃</SelectItem>
                            <SelectItem value="meeting">Meeting 👥</SelectItem>
                            <SelectItem value="home">Home 🏠</SelectItem>
                            <SelectItem value="anywhere">Anywhere 🌍</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="template-estimate">Time Estimate (minutes)</Label>
                <Input
                    id="template-estimate"
                    type="number"
                    min="0"
                    value={formData.estimateMinutes || ""}
                    onChange={(e) =>
                        updateField(
                            "estimateMinutes",
                            e.target.value ? parseInt(e.target.value, 10) : undefined
                        )
                    }
                    placeholder="e.g., 30"
                    data-testid="estimate-input"
                />
            </div>
        </div>
    );
}
