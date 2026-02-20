
import React from "react";
import { TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload as UploadIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { IconPickerState, IconPickerAction } from "./types";

interface IconPickerUploadTabProps {
    state: IconPickerState;
    dispatch: React.Dispatch<IconPickerAction>;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    handlePaste: (e: React.ClipboardEvent) => void;
    handleFileProcessing: (file: File) => void;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSaveCustom: () => void;
}

export function IconPickerUploadTab({ state, dispatch, fileInputRef, handlePaste, handleFileProcessing, handleFileUpload, handleSaveCustom }: IconPickerUploadTabProps) {
    const { uploadName, isDragging, uploadUrl, isUploading } = state;
    return (
        <TabsContent value="upload" className="m-0 border-none min-h-[300px]">
            <div className="p-4 space-y-4" onPaste={handlePaste}>
                <div className="space-y-2">
                    <label htmlFor="icon-picker-upload-name" className="text-xs font-medium">Icon Name</label>
                    <Input
                        id="icon-picker-upload-name"
                        value={uploadName}
                        onChange={e => dispatch({ type: 'SET_UPLOAD_NAME', payload: e.target.value })}
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
                        dispatch({ type: 'SET_IS_DRAGGING', payload: true });
                    }}
                    onDragLeave={(e) => {
                        e.preventDefault();
                        dispatch({ type: 'SET_IS_DRAGGING', payload: false });
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        dispatch({ type: 'SET_IS_DRAGGING', payload: false });
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
                                onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SET_UPLOAD_URL', payload: "" }); }}
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
                    {isUploading ? "Saving..." : "Save Custom Icon"}
                </Button>
            </div>
        </TabsContent>
    );
}
