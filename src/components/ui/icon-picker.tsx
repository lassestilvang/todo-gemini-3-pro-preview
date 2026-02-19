"use client";

import React, { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Search, Shuffle, Upload as UploadIcon, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AVAILABLE_ICONS } from "@/lib/icons";
import { ResolvedIcon } from "./resolved-icon";
import dynamic from "next/dynamic";
import { getCustomIcons, createCustomIcon, deleteCustomIcon } from "@/lib/actions/custom-icons";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import Image from "next/image";

// Dynamically import EmojiPicker to avoid SSR issues and reduce initial bundle load
const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

interface IconPickerProps {
    value?: string | null;
    onChange: (icon: string) => void;
    userId?: string;
    trigger?: React.ReactNode;
}

const COMMON_COLORS = [
    "#ef4444", // Red
    "#f97316", // Orange
    "#eab308", // Yellow
    "#22c55e", // Green
    "#06b6d4", // Cyan
    "#3b82f6", // Blue
    "#8b5cf6", // Violet
    "#ec4899", // Pink
    "#64748b", // Slate
    "#000000", // Black (or White in dark mode via CSS usually, but explicit hex)
];

const RECENT_ICONS_KEY = "todo-gemini-recent-icons";
const MAX_RECENTS = 18;

// Type for the internal library item
type LibraryItem = {
    type: "emoji" | "custom";
    value: string; // The char for emoji, or url for custom
    name: string; // For filtering
    id?: number; // Only for custom
};

function readRecentIconsFromStorage() {
    if (typeof window === "undefined") return [] as string[];
    const saved = localStorage.getItem(RECENT_ICONS_KEY);
    if (!saved || !saved.startsWith("[")) return [] as string[];

    try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    } catch (error) {
        console.error("Failed to parse recent icons", error);
        return [] as string[];
    }
}

export function IconPicker({ value, onChange, userId, trigger }: IconPickerProps) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("library");
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const { theme } = useTheme();

    // Custom Icons State
    const [customIcons, setCustomIcons] = useState<LibraryItem[]>([]);
    const [uploadName, setUploadName] = useState("");
    const [uploadUrl, setUploadUrl] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Recents
    const [recentIcons, setRecentIcons] = useState<string[]>(() => readRecentIconsFromStorage());

    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const popoverContentId = React.useId();

    const loadCustomIcons = React.useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        const icons = await getCustomIcons(userId).catch((error) => {
            console.error("Failed to load custom icons", error);
            return null;
        });

        if (icons) {
            setCustomIcons(icons.map(Icon => ({
                type: "custom",
                value: Icon.url,
                name: Icon.name,
                id: Icon.id
            })));
        }
        setIsLoading(false);
    }, [userId]);

    const handlePopoverOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen);
        if (nextOpen && userId) {
            void loadCustomIcons();
        }
    };

    const handleSelectIcon = (iconValue: string) => {
        let finalValue = iconValue;

        // Apply tint if it's a standard icon and color is selected
        // We identify standard icons if they match AVAILABLE_ICONS names
        const isStandard = AVAILABLE_ICONS.some(i => i.name === iconValue);
        if (isStandard && selectedColor) {
            // Hex without hash for storage or with?
            // Plan said `lucide:name#color`
            // Clean the hex just in case
            const hex = selectedColor.replace("#", "");
            finalValue = `lucide:${iconValue}#${hex}`;
        } else if (isStandard) {
            // Should we force use `lucide:` prefix for consistency?
            // Or keep legacy? ResolvedIcon handles both.
            // Let's use legacy for plain standard icons to keep DB clean if no color.
            finalValue = iconValue;
        }

        onChange(finalValue);
        addToRecents(finalValue);
        setOpen(false);
    };

    const addToRecents = (icon: string) => {
        const newRecents = [icon, ...recentIcons.filter(i => i !== icon)].slice(0, MAX_RECENTS);
        setRecentIcons(newRecents);
        localStorage.setItem(RECENT_ICONS_KEY, JSON.stringify(newRecents));
    };

    const handleShuffle = () => {
        const allOptions = [
            ...customIcons.map(c => c.value),
            ...AVAILABLE_ICONS.map(i => i.name)
            // Emojis are hard to list all, maybe just pick a random standard icon or custom
        ];

        if (allOptions.length === 0) return;
        const random = allOptions[Math.floor(Math.random() * allOptions.length)];
        handleSelectIcon(random);
    }

    const handleFileProcessing = (file: File) => {
        if (!userId) {
            toast.error("You must be logged in to upload icons");
            return;
        }

        // Check size (50KB limit for Base64 in text column safely)
        if (file.size > 50 * 1024) {
            toast.error("Image too large. Please use an image under 50KB or provide a URL.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            setUploadUrl(base64);
            // Auto-fill name if empty
            if (!uploadName) {
                setUploadName(file.name.split(".")[0]);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        handleFileProcessing(file);
    };

    const handleSaveCustom = async () => {
        if (!userId) return;
        if (!uploadUrl || !uploadName) {
            toast.error("Please provide a name and an image");
            return;
        }

        setIsUploading(true);
        const result = await createCustomIcon({
            userId,
            name: uploadName,
            url: uploadUrl,
        }).catch((error) => {
            console.error(error);
            return null;
        });

        if (!result) {
            toast.error("An unexpected error occurred");
            setIsUploading(false);
            return;
        }

        if (result.success) {
            // Optimistically update list
            const newIcon = result.data;
            setCustomIcons(prev => [...prev, {
                type: "custom",
                value: newIcon.url,
                name: newIcon.name,
                id: newIcon.id
            }]);

            toast.success("Icon saved!");
            setUploadName("");
            setUploadUrl("");
            setActiveTab("library"); // Switch back to library to see it

            // Refresh in background to ensure consistency
            // loadCustomIcons(); // Removed to prevent stale data overwrite (optimistic update is sufficient)
        } else {
            toast.error(result.error?.message || "Failed to save icon");
            console.error("Save failed:", result.error);
        }
        setIsUploading(false);
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (const item of items) {
            if (item.type.indexOf("image") !== -1) {
                const blob = item.getAsFile();
                if (blob) {
                    handleFileProcessing(blob);
                }
            } else if (item.kind === "string" && item.type === "text/plain") {
                item.getAsString((s) => {
                    if (s.startsWith("http")) {
                        setUploadUrl(s);
                    }
                });
            }
        }
    };

    // --- Filter Logic ---
    const filteredStandardIcons = useMemo(() => {
        if (!searchQuery) return AVAILABLE_ICONS;
        const q = searchQuery.toLowerCase();
        return AVAILABLE_ICONS.filter(i =>
            i.name.includes(q) || i.tags.some(t => t.includes(q))
        );
    }, [searchQuery]);

    // Recents filtering (just split standard vs other)
    // Actually we just show all recents in a row, regardless of tab?
    // Plan said "Recently Used row for Tab 1 and Tab 2".
    // Let's show mixed recents in both for convenience, or contextual?
    // Let's show Recents at the top of the Library tab for sure.

    return (
        <Popover open={open} onOpenChange={handlePopoverOpenChange} modal={true}>
            <PopoverTrigger asChild>
                {trigger ? (
                    trigger as React.ReactElement
                ) : (
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        aria-controls={popoverContentId}
                        className="w-full justify-start h-10 px-3"
                    >
                        <ResolvedIcon icon={value} className="mr-2 h-5 w-5" />
                        <span className="truncate opacity-75">
                            {value ? (
                                value.startsWith("http") || value.startsWith("data:") ? "Custom Image" :
                                    value.startsWith("lucide:") ? value.split(":")[1].split("#")[0] :
                                        value
                            ) : "Select Icon..."}
                        </span>
                    </Button>
                )}
            </PopoverTrigger>
            <PopoverContent id={popoverContentId} className="w-[380px] p-0" align="start">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                        <TabsList className="h-8">
                            <TabsTrigger value="library" className="text-xs h-7">Library</TabsTrigger>
                            <TabsTrigger value="icons" className="text-xs h-7">Icons</TabsTrigger>
                            <TabsTrigger value="upload" className="text-xs h-7">Upload</TabsTrigger>
                        </TabsList>
                        <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleShuffle} title="Random Icon">
                                <Shuffle className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>

                    {/* Search Bar (Only for Icons tab, Library uses internal picker search) */}
                    {activeTab === "icons" && (
                        <div className="px-4 py-2 border-b">
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search standard icons..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8 h-9"
                                />
                            </div>
                        </div>
                    )}

                    {/* Tab 1: Library (Recents + Custom + Emoji) */}
                    <TabsContent value="library" className="m-0 border-none h-[400px] flex flex-col overflow-hidden">
                        {/* Recents & Custom Icons Header Area */}
                        <div className="flex-none bg-popover z-10 border-b">
                            {recentIcons.length > 0 && (
                                <div className="p-2 pb-0">
                                    <h4 className="text-[10px] font-medium text-muted-foreground px-1 mb-1 uppercase tracking-wider">Recently Used</h4>
                                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
                                        {recentIcons.map((r) => (
                                            <button
                                                key={r}
                                                onClick={() => handleSelectIcon(r)}
                                                className="shrink-0 flex items-center justify-center w-8 h-8 rounded-md border border-transparent hover:bg-accent/50 hover:border-border transition-all snap-start bg-secondary/30"
                                            >
                                                <ResolvedIcon icon={r} className="h-4 w-4" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {isLoading && customIcons.length === 0 ? (
                                <div className="p-2">
                                    <h4 className="text-[10px] font-medium text-muted-foreground px-1 mb-1 uppercase tracking-wider">My Icons</h4>
                                    <div className="flex items-center justify-center py-4 text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    </div>
                                </div>
                            ) : customIcons.length > 0 && (
                                <div className="p-2">
                                    <h4 className="text-[10px] font-medium text-muted-foreground px-1 mb-1 uppercase tracking-wider">My Icons</h4>
                                    <div className="grid grid-cols-8 gap-1">
                                        {customIcons.map((c) => (
                                            <div key={c.id} className="relative group">
                                                <button
                                                    onClick={() => handleSelectIcon(c.value)}
                                                    className="flex items-center justify-center w-full aspect-square rounded-md hover:bg-accent/50 transition-colors"
                                                    title={c.name}
                                                >
                                                    <div className="w-5 h-5 rounded overflow-hidden">
                                                        <Image
                                                            src={c.value}
                                                            alt={c.name}
                                                            width={20}
                                                            height={20}
                                                            className="w-full h-full object-cover"
                                                            unoptimized
                                                        />
                                                    </div>
                                                </button>
                                                {userId && c.id && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            if (confirm("Delete this icon?")) {
                                                                await deleteCustomIcon(c.id!, userId);
                                                                loadCustomIcons();
                                                            }
                                                        }}
                                                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                                    >
                                                        <X className="h-2 w-2" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Emoji Picker - fills remaining space */}
                        <div className="flex-1 min-h-0 emoji-picker-container w-full h-full [&_.epr-main]:!border-none [&_.epr-main]:!rounded-none [&_.epr-main]:!bg-transparent">
                            <EmojiPicker
                                onEmojiClick={(e) => handleSelectIcon(e.emoji)}
                                autoFocusSearch={false}
                                theme={theme === 'dark' ? 'dark' as any : 'light' as any} // eslint-disable-line @typescript-eslint/no-explicit-any
                                lazyLoadEmojis={true}
                                skinTonesDisabled={false}
                                width="100%"
                                height="100%"
                                searchDisabled={false}
                                previewConfig={{ showPreview: false }}
                            />
                        </div>
                    </TabsContent>

                    {/* Tab 2: Standard Icons */}
                    <TabsContent value="icons" className="m-0 border-none min-h-[300px]">
                        <div className="p-4 space-y-4">
                            {/* Color Picker */}
                            <div className="flex flex-wrap gap-2 pb-2 border-b">
                                {COMMON_COLORS.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setSelectedColor(selectedColor === c ? null : c)}
                                        className={cn(
                                            "w-5 h-5 rounded-full border border-transparent transition-transform hover:scale-110",
                                            selectedColor === c && "ring-2 ring-primary ring-offset-2 scale-110"
                                        )}
                                        style={{ backgroundColor: c }}
                                        title={c}
                                    />
                                ))}
                                <button
                                    onClick={() => setSelectedColor(null)}
                                    className={cn(
                                        "w-5 h-5 rounded-full border border-muted bg-transparent flex items-center justify-center text-[10px]",
                                        !selectedColor && "ring-2 ring-primary ring-offset-2"
                                    )}
                                    title="None"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>

                            <div className="h-[250px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
                                <div className="grid grid-cols-7 gap-1 pr-1">
                                    {filteredStandardIcons.map((item) => (
                                        <button
                                            key={item.name}
                                            onClick={() => handleSelectIcon(item.name)}
                                            className="flex items-center justify-center w-full aspect-square rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                                            title={item.name}
                                        >
                                            <ResolvedIcon
                                                icon={item.name}
                                                className="h-5 w-5"
                                                // Preview with selected color
                                                color={selectedColor}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="upload" className="m-0 border-none min-h-[300px]">
                        <div className="p-4 space-y-4" onPaste={handlePaste}>
                            <div className="space-y-2">
                                <label htmlFor="icon-picker-upload-name" className="text-xs font-medium">Icon Name</label>
                                <Input
                                    id="icon-picker-upload-name"
                                    value={uploadName}
                                    onChange={e => setUploadName(e.target.value)}
                                    placeholder="e.g. My Logo"
                                />
                            </div>

                            <div
                                className={cn(
                                    "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center gap-2 transition-colors cursor-pointer relative",
                                    isDragging ? "border-primary bg-primary/10" : "border-muted hover:bg-accent/30",
                                    uploadUrl ? "border-primary/50 bg-accent/10" : ""
                                )}
                                role="button"
                                tabIndex={0}
                                aria-label="Upload icon image"
                                onClick={() => fileInputRef.current?.click()}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        fileInputRef.current?.click();
                                    }
                                }}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsDragging(true);
                                }}
                                onDragLeave={(e) => {
                                    e.preventDefault();
                                    setIsDragging(false);
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setIsDragging(false);
                                    const file = e.dataTransfer.files?.[0];
                                    if (file) handleFileProcessing(file);
                                }}
                            >
                                {uploadUrl ? (
                                    <div className="relative w-24 h-24">
                                        <Image
                                            src={uploadUrl}
                                            className="w-full h-full object-contain"
                                            alt="Preview"
                                            width={96}
                                            height={96}
                                            unoptimized
                                        />
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setUploadUrl(""); }}
                                            className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="p-3 bg-secondary rounded-full">
                                            <UploadIcon className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium">
                                                Click to upload or drag and drop
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Or paste an image with <kbd className="font-mono bg-muted px-1 rounded">⌘V</kbd>
                                            </p>
                                        </div>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                        />
                                    </>
                                )}
                            </div>

                            <Button onClick={handleSaveCustom} disabled={!uploadUrl || !uploadName || isUploading} className="w-full">
                                {isUploading ? "Saving..." : "Save Icon"}
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </PopoverContent>
        </Popover>
    );
}
