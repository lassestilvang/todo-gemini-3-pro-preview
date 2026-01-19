"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Download, Upload, Loader2, AlertCircle } from "lucide-react"
import { exportUserData, importUserData } from "@/lib/actions/data-migration"

export function DataExportImport() {
    const router = useRouter()
    const [isExporting, setIsExporting] = useState(false)
    const [isImporting, setIsImporting] = useState(false)

    const handleExport = async () => {
        try {
            setIsExporting(true)
            const data = await exportUserData()

            // Create a blob and trigger download
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `todo-gemini-backup-${new Date().toISOString().split('T')[0]}.json`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)

            toast.success("Data exported successfully")
        } catch (error) {
            console.error(error)
            toast.error("Failed to export data")
        } finally {
            setIsExporting(false)
        }
    }

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!confirm("This will import data from the selected file. Existing data will NOT be deleted, but duplicates may be created. logic attempts to preserve relationships. Continue?")) {
            e.target.value = "" // Reset input
            return
        }

        try {
            setIsImporting(true)
            const text = await file.text()
            const json = JSON.parse(text)

            const result = await importUserData(json)

            if (result.success) {
                toast.success(`Import successful: ${result.counts?.tasks ?? 0} tasks, ${result.counts?.lists ?? 0} lists imported.`)
                router.refresh()
                e.target.value = "" // Reset input
            }
        } catch (error) {
            console.error(error)
            toast.error("Failed to import data. Invalid file format.")
        } finally {
            setIsImporting(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Data Management</CardTitle>
                <CardDescription>
                    Export your data for backup or import data from another account.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                        <Label>Export Data</Label>
                        <p className="text-sm text-muted-foreground">
                            Download a JSON file containing all your tasks, lists, and settings.
                        </p>
                    </div>
                    <Button onClick={handleExport} disabled={isExporting} variant="outline">
                        {isExporting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <Download className="mr-2 h-4 w-4" />
                                Export Backup
                            </>
                        )}
                    </Button>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-4 border-t">
                    <div className="space-y-1">
                        <Label>Import Data</Label>
                        <p className="text-sm text-muted-foreground">
                            Restore data from a backup file.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Input
                            type="file"
                            accept=".json"
                            onChange={handleImport}
                            disabled={isImporting}
                            className="w-full max-w-[250px]"
                        />
                        {isImporting && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                </div>

                <div className="rounded-md bg-muted p-4">
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        <p>
                            Importing will add the contents of the file to your current account.
                            It will not delete existing data. Relationships between tasks and lists
                            in the backup file will be preserved.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
