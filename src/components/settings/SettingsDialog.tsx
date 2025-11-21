"use client"

import * as React from "react"
import { Settings } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { ThemeSwitcher } from "@/components/settings/ThemeSwitcher"

export function SettingsDialog() {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>
                        Customize the appearance and behavior of the application.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <section>
                        <h3 className="mb-4 text-lg font-medium">Appearance</h3>
                        <ThemeSwitcher />
                    </section>
                </div>
            </DialogContent>
        </Dialog>
    )
}
