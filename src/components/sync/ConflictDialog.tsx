"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConflictInfo } from "@/lib/sync/types";
import { format } from "date-fns";
import { AlertTriangle, Check } from "lucide-react";

interface ConflictDialogProps {
  conflict: ConflictInfo | null;
  onResolve: (actionId: string, resolution: 'local' | 'server' | 'merge', mergedData?: any) => void;
  onClose: () => void;
}

interface FieldDiff {
  field: string;
  local: any;
  server: any;
}

function getFieldDiffs(localData: any, serverData: any): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  const fields = ['title', 'description', 'priority', 'dueDate', 'deadline', 'isCompleted', 'listId'];
  
  for (const field of fields) {
    const localVal = localData?.[field];
    const serverVal = serverData?.[field];
    
    if (localVal !== undefined && JSON.stringify(localVal) !== JSON.stringify(serverVal)) {
      diffs.push({
        field,
        local: localVal,
        server: serverVal,
      });
    }
  }
  
  return diffs;
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return "(empty)";
  if (value instanceof Date) return format(value, "PPp");
  if (typeof value === "string" && !isNaN(Date.parse(value))) {
    return format(new Date(value), "PPp");
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function formatFieldName(field: string): string {
  const names: Record<string, string> = {
    title: "Title",
    description: "Description",
    priority: "Priority",
    dueDate: "Due Date",
    deadline: "Deadline",
    isCompleted: "Completed",
    listId: "List",
  };
  return names[field] || field;
}

export function ConflictDialog({ conflict, onResolve, onClose }: ConflictDialogProps) {
  const [selectedFields, setSelectedFields] = useState<Record<string, 'local' | 'server'>>({});
  
  if (!conflict) return null;
  
  const diffs = getFieldDiffs(conflict.localData, conflict.serverData);
  const serverTitle = conflict.serverData?.title || "Task";
  const serverUpdatedAt = conflict.serverData?.updatedAt;
  
  const handleMerge = () => {
    const mergedData: any = {};
    for (const diff of diffs) {
      const choice = selectedFields[diff.field] || 'server';
      mergedData[diff.field] = choice === 'local' ? diff.local : diff.server;
    }
    onResolve(conflict.actionId, 'merge', mergedData);
  };
  
  const allFieldsSelected = diffs.every(d => selectedFields[d.field] !== undefined);
  
  return (
    <Dialog open={!!conflict} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Sync Conflict Detected
          </DialogTitle>
          <DialogDescription>
            &quot;{serverTitle}&quot; was modified on another device
            {serverUpdatedAt && (
              <> at {format(new Date(serverUpdatedAt), "PPp")}</>
            )}. Choose how to resolve the conflict.
          </DialogDescription>
        </DialogHeader>

        {diffs.length > 0 && (
          <div className="space-y-4 max-h-[300px] overflow-y-auto">
            <div className="grid grid-cols-3 gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
              <div>Field</div>
              <div>Your Changes</div>
              <div>Server Version</div>
            </div>
            
            {diffs.map((diff) => (
              <div key={diff.field} className="grid grid-cols-3 gap-2 text-sm items-start">
                <div className="font-medium">{formatFieldName(diff.field)}</div>
                <button
                  type="button"
                  onClick={() => setSelectedFields(prev => ({ ...prev, [diff.field]: 'local' }))}
                  className={`text-left p-2 rounded border transition-colors ${
                    selectedFields[diff.field] === 'local'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{formatValue(diff.local)}</span>
                    {selectedFields[diff.field] === 'local' && (
                      <Check className="h-4 w-4 text-primary shrink-0 ml-2" />
                    )}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFields(prev => ({ ...prev, [diff.field]: 'server' }))}
                  className={`text-left p-2 rounded border transition-colors ${
                    selectedFields[diff.field] === 'server'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{formatValue(diff.server)}</span>
                    {selectedFields[diff.field] === 'server' && (
                      <Check className="h-4 w-4 text-primary shrink-0 ml-2" />
                    )}
                  </div>
                </button>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onResolve(conflict.actionId, 'server')}
          >
            Use Server Version
          </Button>
          <Button
            variant="outline"
            onClick={() => onResolve(conflict.actionId, 'local')}
          >
            Keep My Changes
          </Button>
          {diffs.length > 0 && (
            <Button
              onClick={handleMerge}
              disabled={!allFieldsSelected}
            >
              Merge Selected
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
