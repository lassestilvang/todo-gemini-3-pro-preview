"use client";

import React, { useMemo, lazy, Suspense } from "react";
import { cn } from "@/lib/utils";
import { ListTodo } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ResolvedIconProps {
    icon: string | null | undefined;
    color?: string | null;
    className?: string;
    fallback?: LucideIcon;
}

// Cache for lazy-loaded icons to prevent creating new lazy components on every render
const iconCache = new Map<string, React.LazyExoticComponent<LucideIcon>>();

const getLazyIcon = (name: string): React.LazyExoticComponent<LucideIcon> => {
    if (iconCache.has(name)) {
        return iconCache.get(name)!;
    }

    const LazyIcon = lazy(async () => {
        try {
            const mod = await import("lucide-react");

            // Handle "lucide:name#color" or just "name" formats
            const cleanName = name.startsWith("lucide:")
                ? name.replace("lucide:", "").split("#")[0]
                : name;

            // PascalCase the name for lookup (e.g. "shopping-cart" -> "ShoppingCart")
            const pascalName = cleanName
                .split("-")
                .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                .join("");

            // @ts-expect-error - Dynamic lookup
            const Icon = mod[pascalName] || mod[cleanName] || mod.ListTodo;

            return { default: Icon };
        } catch (error) {
            console.error(`Failed to load icon: ${name}`, error);
            return { default: ListTodo };
        }
    });

    iconCache.set(name, LazyIcon);
    return LazyIcon;
};

export function ResolvedIcon({ icon, color, className, fallback }: ResolvedIconProps) {
    const FallbackIcon = fallback || ListTodo;

    // Memoize the resolved icon data to prevent unnecessary re-parsing
    const resolved = useMemo(() => {
        if (!icon) return { type: "fallback" as const };

        // Check for URL (http or data URI)
        if (icon.startsWith("http") || icon.startsWith("data:")) {
            return { type: "image" as const, value: icon };
        }

        // Check for Lucide format: "lucide:name#color" or just "name" (legacy)
        const isLucide = icon.startsWith("lucide:") || /^[a-z-]+$/.test(icon);

        if (isLucide) {
            let name = icon;
            let iconColor = color;

            if (icon.startsWith("lucide:")) {
                const parts = icon.replace("lucide:", "").split("#");
                name = parts[0];
                if (parts[1]) {
                    iconColor = `#${parts[1]}`;
                }
            }

            // Instead of returning the component directly, we return the name to lazy load it
            return { type: "icon" as const, name: name, color: iconColor };
        }

        // Assume Emoji if not matched above
        return { type: "emoji" as const, value: icon };

    }, [icon, color]);

    if (resolved.type === "image") {
        return (
            <div className={cn("relative overflow-hidden rounded-sm shrink-0", className)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={resolved.value}
                    alt="Icon"
                    className="w-full h-full object-cover"
                />
            </div>
        );
    }

    if (resolved.type === "emoji") {
        return (
            <svg
                className={cn("shrink-0", className)}
                viewBox="0 0 32 32"
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-label="Icon"
            >
                <text
                    x="50%"
                    y="50%"
                    dy=".35em"
                    textAnchor="middle"
                    fontSize="28"
                >
                    {resolved.value}
                </text>
            </svg>
        );
    }

    if (resolved.type === "icon") {
        const LazyIcon = getLazyIcon(resolved.name);
        return (
            <Suspense fallback={<div className={cn("shrink-0 bg-muted/20 animate-pulse rounded-sm", className)} />}>
                {React.createElement(LazyIcon, {
                    className: cn("shrink-0", className),
                    style: { color: resolved.color || undefined }
                })}
            </Suspense>
        );
    }

    // Fallback
    return (
        <FallbackIcon
            className={cn("shrink-0", className)}
            style={{ color: color || undefined }}
        />
    );
}
