"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Check } from "lucide-react"
import { AVAILABLE_THEMES } from "@/lib/themes"

import { cn } from "@/lib/utils"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

const themes = [
    {
        name: "light",
        label: "Light",
        description: "Default light mode",
        color: "bg-white border-gray-200",
    },
    {
        name: "dark",
        label: "Dark",
        description: "Default dark mode",
        color: "bg-slate-950 border-slate-800",
    },
    {
        name: "glassmorphism",
        label: "Glassmorphism",
        description: "Dreamy, frosted glass effect",
        color: "bg-purple-900/50 border-white/20 backdrop-blur-md",
    },
    {
        name: "neubrutalism",
        label: "Neubrutalism",
        description: "Bold, high contrast, pop style",
        color: "bg-[#f3f4f6] border-black border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
    },
    {
        name: "minimalist",
        label: "Minimalist",
        description: "Clean, focused, zen",
        color: "bg-[#fafafa] border-gray-100",
    },
]

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
            {themes.map((t) => (
                <Card
                    key={t.name}
                    className={cn(
                        "cursor-pointer transition-all hover:border-primary",
                        theme === t.name ? "border-primary ring-2 ring-primary ring-offset-2" : ""
                    )}
                    onClick={() => setTheme(t.name)}
                >
                    <CardHeader className="p-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{t.label}</CardTitle>
                            {theme === t.name && <Check className="h-4 w-4 text-primary" />}
                        </div>
                        <CardDescription className="text-xs">{t.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className={cn("h-24 w-full rounded-md border", t.color)} />
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
