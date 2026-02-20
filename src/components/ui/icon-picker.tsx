
"use client";

import React, { useMemo, useRef, useCallback, useReducer, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Search, Shuffle } from "lucide-react";
import { AVAILABLE_ICONS } from "@/lib/icons";
import { ResolvedIcon } from "./resolved-icon";
import { getCustomIcons, createCustomIcon } from "@/lib/actions/custom-icons";
import { toast } from "sonner";
import { useTheme } from "next-themes";

// Extracted Parts
import { RECENT_ICONS_KEY, MAX_RECENTS, readRecentIconsFromStorage } from "./icon-picker/types";
import { iconPickerReducer } from "./icon-picker/reducer";
import { IconPickerLibraryTab } from "./icon-picker/LibraryTab";
import { IconPickerIconsTab } from "./icon-picker/IconsTab";
import { IconPickerUploadTab } from "./icon-picker/UploadTab";

interface IconPickerProps {
    value?: string | null;
    onChange: (icon: string) => void;
    userId?: string;
    trigger?: React.ReactNode;
}

export function IconPicker({ value, onChange, userId, trigger }: IconPickerProps) {
    const [state, dispatch] = useReducer(iconPickerReducer, null, () => ({
        open: false,
        searchQuery: "",
        activeTab: "library",
        selectedColor: null,
        customIcons: [],
        uploadName: "",
        uploadUrl: "",
        isUploading: false,
        isLoading: false,
        recentIcons: readRecentIconsFromStorage(),
        isDragging: false,
    }));

    const { open, searchQuery, activeTab, selectedColor, customIcons, uploadName, uploadUrl, isUploading, recentIcons } = state;
    const { theme } = useTheme();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const popoverContentId = React.useId();

    const loadCustomIcons = useCallback(async () => {
        if (!userId) return;
        dispatch({ type: 'SET_IS_LOADING', payload: true });
        const icons = await getCustomIcons(userId).catch(e => { console.error(e); return null; });
        if (icons) {
            dispatch({
                type: 'SET_CUSTOM_ICONS', payload: icons.map(Icon => ({
                    type: "custom", value: Icon.url, name: Icon.name, id: Icon.id
                }))
            });
        }
        dispatch({ type: 'SET_IS_LOADING', payload: false });
    }, [userId]);

    useEffect(() => {
        if (open && userId) loadCustomIcons();
    }, [open, userId, loadCustomIcons]);

    const addToRecents = (icon: string) => {
        const newRecents = [icon, ...recentIcons.filter(i => i !== icon)].slice(0, MAX_RECENTS);
        dispatch({ type: 'SET_RECENT_ICONS', payload: newRecents });
        localStorage.setItem(RECENT_ICONS_KEY, JSON.stringify(newRecents));
    };

    const handleSelectIcon = (iconValue: string) => {
        let finalValue = iconValue;
        const isStandard = AVAILABLE_ICONS.some(i => i.name === iconValue);
        if (isStandard && selectedColor) {
            finalValue = `lucide:${iconValue}#${selectedColor.replace("#", "")}`;
        }
        onChange(finalValue);
        addToRecents(finalValue);
        dispatch({ type: 'SET_OPEN', payload: false });
    };

    const handleShuffle = () => {
        const allOptions = [...customIcons.map(c => c.value), ...AVAILABLE_ICONS.map(i => i.name)];
        if (allOptions.length === 0) return;
        handleSelectIcon(allOptions[Math.floor(Math.random() * allOptions.length)]);
    };

    const handleFileProcessing = (file: File) => {
        if (!userId) return toast.error("Log in to upload icons");
        if (file.size > 50 * 1024) return toast.error("Image too large (>50KB)");
        const reader = new FileReader();
        reader.onloadend = () => {
            dispatch({ type: 'SET_UPLOAD_URL', payload: reader.result as string });
            if (!uploadName) dispatch({ type: 'SET_UPLOAD_NAME', payload: file.name.split(".")[0] });
        };
        reader.readAsDataURL(file);
    };

    const handleSaveCustom = async () => {
        if (!userId || !uploadUrl || !uploadName) return toast.error("Missing name or image");
        dispatch({ type: 'SET_IS_UPLOADING', payload: true });
        const result = await createCustomIcon({ userId, name: uploadName, url: uploadUrl }).catch(() => null);
        if (result?.success) {
            dispatch({ type: 'ADD_CUSTOM_ICON', payload: { type: "custom", value: result.data.url, name: result.data.name, id: result.data.id } });
            toast.success("Icon saved!");
            dispatch({ type: 'RESET_UPLOAD' });
            dispatch({ type: 'SET_ACTIVE_TAB', payload: "library" });
        } else {
            toast.error(result?.error?.message || "Failed to save icon");
        }
        dispatch({ type: 'SET_IS_UPLOADING', payload: false });
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (const item of items) {
            if (item.type.includes("image")) {
                const blob = item.getAsFile();
                if (blob) handleFileProcessing(blob);
            } else if (item.kind === "string" && item.type === "text/plain") {
                item.getAsString(s => { if (s.startsWith("http")) dispatch({ type: 'SET_UPLOAD_URL', payload: s }); });
            }
        }
    };

    const filteredStandardIcons = useMemo(() => {
        if (!searchQuery) return AVAILABLE_ICONS;
        const q = searchQuery.toLowerCase();
        return AVAILABLE_ICONS.filter(i => i.name.includes(q) || i.tags.some(t => t.includes(q)));
    }, [searchQuery]);

    return (
        <Popover open={open} onOpenChange={(v) => dispatch({ type: 'SET_OPEN', payload: v })} modal={true}>
            <PopoverTrigger asChild>
                {trigger ?? (
                    <Button variant="outline" className="w-full justify-start h-10 px-3">
                        <ResolvedIcon icon={value || null} className="mr-2 h-5 w-5" />
                        <span className="truncate opacity-75">{value ? (value.includes(":") ? value.split(":")[1].split("#")[0] : "Custom") : "Select Icon..."}</span>
                    </Button>
                )}
            </PopoverTrigger>
            <PopoverContent id={popoverContentId} className="w-[380px] p-0" align="start">
                <Tabs value={activeTab} onValueChange={(v) => dispatch({ type: 'SET_ACTIVE_TAB', payload: v })} className="w-full">
                    <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                        <TabsList className="h-8">
                            <TabsTrigger value="library" className="text-xs h-7">Library</TabsTrigger>
                            <TabsTrigger value="icons" className="text-xs h-7">Icons</TabsTrigger>
                            <TabsTrigger value="upload" className="text-xs h-7">Upload</TabsTrigger>
                        </TabsList>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleShuffle} title="Random Icon"><Shuffle className="h-3.5 w-3.5" /></Button>
                    </div>

                    {activeTab === "icons" && (
                        <div className="px-4 py-2 border-b">
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search icons..." value={searchQuery} onChange={e => dispatch({ type: 'SET_SEARCH_QUERY', payload: e.target.value })} className="pl-8 h-9" />
                            </div>
                        </div>
                    )}

                    <IconPickerLibraryTab state={state} theme={theme} userId={userId} handleSelectIcon={handleSelectIcon} loadCustomIcons={loadCustomIcons} />
                    <IconPickerIconsTab state={state} dispatch={dispatch} filteredStandardIcons={filteredStandardIcons} handleSelectIcon={handleSelectIcon} />
                    <IconPickerUploadTab state={state} dispatch={dispatch} fileInputRef={fileInputRef} handlePaste={handlePaste} handleFileProcessing={handleFileProcessing} handleFileUpload={e => { const f = e.target.files?.[0]; if (f) handleFileProcessing(f); }} handleSaveCustom={handleSaveCustom} />
                </Tabs>
            </PopoverContent>
        </Popover>
    );
}
