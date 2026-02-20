
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Smile } from "lucide-react";
import { IconPicker } from "@/components/ui/icon-picker";
import { ResolvedIcon } from "@/components/ui/resolved-icon";

interface TaskHeaderSectionProps {
    title: string;
    setTitle: (v: string) => void;
    description: string;
    setDescription: (v: string) => void;
    icon: string | null;
    setIcon: (v: string | null) => void;
    userId?: string;
}

export function TaskHeaderSection({
    title, setTitle,
    description, setDescription,
    icon, setIcon,
    userId
}: TaskHeaderSectionProps) {
    return (
        <>
            <div className="space-y-2">
                <Label htmlFor="title">Title & Icon</Label>
                <div className="flex gap-2">
                    <IconPicker
                        value={icon}
                        onChange={setIcon}
                        userId={userId}
                        trigger={
                            <Button variant="outline" size="icon" className="shrink-0 h-10 w-10" type="button">
                                {icon ? (
                                    <ResolvedIcon icon={icon} className="h-4 w-4" />
                                ) : (
                                    <Smile className="h-4 w-4 text-muted-foreground" />
                                )}
                            </Button>
                        }
                    />
                    <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Task Title"
                        required
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description (optional)"
                    className="min-h-[100px]"
                />
            </div>
        </>
    );
}
