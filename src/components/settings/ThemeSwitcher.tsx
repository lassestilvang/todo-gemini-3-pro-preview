"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Check } from "lucide-react"
import { AVAILABLE_THEMES, THEME_METADATA } from "@/lib/themes"

import { cn } from "@/lib/utils"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

export function ThemeSwitcher() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return null
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {AVAILABLE_THEMES.map((themeName) => {
                const metadata = THEME_METADATA[themeName]
                return (
                    <Card
                        key={themeName}
                        className={cn(
                            "cursor-pointer transition-all hover:border-primary",
                            theme === themeName ? "border-primary ring-2 ring-primary ring-offset-2" : ""
                        )}
                        onClick={() => setTheme(themeName)}
                    >
                        <CardHeader className="p-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">{metadata.label}</CardTitle>
                                {theme === themeName && <Check className="h-4 w-4 text-primary" />}
                            </div>
                            <CardDescription className="text-xs">{metadata.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className={cn("h-24 w-full rounded-md border", metadata.previewColor)} />
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}

