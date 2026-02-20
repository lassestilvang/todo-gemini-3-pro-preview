
import React from "react";
import { TabsContent } from "@/components/ui/tabs";
import { Loader2, X } from "lucide-react";
import { ResolvedIcon } from "../resolved-icon";
import Image from "next/image";
import dynamic from "next/dynamic";
import { deleteCustomIcon } from "@/lib/actions/custom-icons";
import { IconPickerState } from "./types";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

interface IconPickerLibraryTabProps {
    state: IconPickerState;
    theme?: string;
    userId?: string;
    handleSelectIcon: (r: string) => void;
    loadCustomIcons: () => void;
}

export function IconPickerLibraryTab({ state, theme, userId, handleSelectIcon, loadCustomIcons }: IconPickerLibraryTabProps) {
    const { recentIcons, isLoading, customIcons } = state;
    return (
        <TabsContent value="library" className="m-0 border-none h-[400px] flex flex-col overflow-hidden">
            <div className="flex-none bg-popover z-10 border-b">
                {recentIcons.length > 0 && (
                    <div className="p-2 pb-0">
                        <h4 className="text-[10px] font-medium text-muted-foreground px-1 mb-1 uppercase tracking-wider">Recently Used</h4>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
                            {recentIcons.map((r: string) => (
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
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {customIcons.map((c: any) => (
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

            <div className="flex-1 min-h-0 emoji-picker-container w-full h-full [&_.epr-main]:!border-none [&_.epr-main]:!rounded-none [&_.epr-main]:!bg-transparent">
                <EmojiPicker
                    onEmojiClick={(e) => handleSelectIcon(e.emoji)}
                    autoFocusSearch={false}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    theme={theme === 'dark' ? 'dark' as any : 'light' as any}
                    lazyLoadEmojis={true}
                    skinTonesDisabled={false}
                    width="100%"
                    height="100%"
                    searchDisabled={false}
                    previewConfig={{ showPreview: false }}
                />
            </div>
        </TabsContent>
    );
}
