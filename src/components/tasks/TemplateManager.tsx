"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getTemplates, createTemplate, deleteTemplate, instantiateTemplate } from "@/lib/actions";
import { Plus, Trash2, FileText, Play } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

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
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState("");
    const [newTemplateContent, setNewTemplateContent] = useState("");

    const loadTemplates = useCallback(async () => {
        if (!userId) return;
        const data = await getTemplates(userId);
        setTemplates(data);
    }, [userId]);

    useEffect(() => {
        if (isOpen && userId) {
            getTemplates(userId).then(data => {
                setTemplates(data);
            });
        }
    }, [isOpen, userId]);

    const handleCreate = async () => {
        if (!newTemplateName || !newTemplateContent || !userId) return;
        try {
            // Validate JSON
            JSON.parse(newTemplateContent);
            await createTemplate(userId, newTemplateName, newTemplateContent);
            setNewTemplateName("");
            setNewTemplateContent("");
            setIsCreateOpen(false);
            loadTemplates();
            toast.success("Template created");
        } catch {
            toast.error("Invalid JSON content");
        }
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

    const exampleTemplate = {
        title: "New Project",
        description: "Setup for a new project",
        priority: "high",
        subtasks: [
            { title: "Initialize repo" },
            { title: "Setup CI/CD" }
        ]
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
                    </DialogHeader>

                    <div className="flex justify-between items-center mb-4">
                        <p className="text-sm text-muted-foreground">Manage and use your task templates.</p>
                        <Button onClick={() => setIsCreateOpen(true)} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            New Template
                        </Button>
                    </div>

                    <ScrollArea className="h-[300px] pr-4">
                        <div className="space-y-3">
                            {templates.map(template => (
                                <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
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
                                        <Button size="sm" variant="outline" onClick={() => handleInstantiate(template.id)}>
                                            <Play className="h-3 w-3 mr-1" />
                                            Use
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={() => handleDelete(template.id)}>
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

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Template</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                                value={newTemplateName}
                                onChange={e => setNewTemplateName(e.target.value)}
                                placeholder="e.g., Weekly Report"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Content (JSON)</Label>
                            <Textarea
                                value={newTemplateContent}
                                onChange={e => setNewTemplateContent(e.target.value)}
                                placeholder={JSON.stringify(exampleTemplate, null, 2)}
                                className="font-mono text-xs h-[200px]"
                            />
                            <p className="text-xs text-muted-foreground">
                                Enter the task structure in JSON format.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreate}>Create</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
