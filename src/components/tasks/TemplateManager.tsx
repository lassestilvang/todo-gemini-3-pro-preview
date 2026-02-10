"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { getTemplates, deleteTemplate, instantiateTemplate } from "@/lib/actions";
import { Plus, Trash2, FileText, Play, Pencil } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { TemplateFormDialog } from "./TemplateFormDialog";

type Template = {
    id: number;
    name: string;
    content: string;
    createdAt: Date;
};

interface TemplateManagerProps {
    userId?: string;
}

export function TemplateManager({ userId }: TemplateManagerProps) {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

    const loadTemplates = useCallback(async () => {
        if (!userId) return;
        try {
            const data = await getTemplates(userId);
            setTemplates(data);
        } catch (error) {
            console.error("Failed to load templates:", error);
            toast.error("Failed to load templates");
        }
    }, [userId]);

    useEffect(() => {
        if (isOpen && userId) {
            loadTemplates();
        }
    }, [isOpen, userId, loadTemplates]);

    const handleOpenCreateDialog = () => {
        setEditingTemplate(null);
        setIsFormDialogOpen(true);
    };

    const handleOpenEditDialog = (template: Template) => {
        setEditingTemplate(template);
        setIsFormDialogOpen(true);
    };

    const handleFormDialogSave = () => {
        loadTemplates();
    };

    const handleDelete = async (id: number) => {
        if (!userId) return;
        if (confirm("Delete this template?")) {
            try {
                await deleteTemplate(id, userId);
                await loadTemplates();
                toast.success("Template deleted");
            } catch (error) {
                console.error("Failed to delete template:", error);
                toast.error("Failed to delete template");
            }
        }
    };

    const handleInstantiate = async (id: number) => {
        if (!userId) return;
        try {
            await instantiateTemplate(userId, id);
            setIsOpen(false);
            toast.success("Task created from template");
        } catch (e) {
            console.error(e);
            toast.error("Failed to create task from template");
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                        <FileText className="mr-2 h-4 w-4" />
                        Templates
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Task Templates</DialogTitle>
                        <DialogDescription>
                            Manage and use your task templates.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex justify-between items-center mb-4">
                        <Button onClick={handleOpenCreateDialog} size="sm" data-testid="new-template-button">
                            <Plus className="h-4 w-4 mr-2" />
                            New Template
                        </Button>
                    </div>

                    <ScrollArea className="h-[300px] pr-4">
                        <div className="space-y-3">
                            {templates.map(template => (
                                <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors" data-testid={`template-item-${template.id}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                                            <FileText className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-sm">{template.name}</h4>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(template.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" onClick={() => handleInstantiate(template.id)} data-testid={`use-template-${template.id}`}>
                                            <Play className="h-3 w-3 mr-1" />
                                            Use
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={() => handleOpenEditDialog(template)} data-testid={`edit-template-${template.id}`} aria-label="Edit template">
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={() => handleDelete(template.id)} data-testid={`delete-template-${template.id}`} aria-label="Delete template">
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {templates.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    No templates found. Create one to get started.
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            {userId && (
                <TemplateFormDialog
                    open={isFormDialogOpen}
                    onOpenChange={setIsFormDialogOpen}
                    template={editingTemplate}
                    userId={userId}
                    onSave={handleFormDialogSave}
                />
            )}
        </>
    );
}
