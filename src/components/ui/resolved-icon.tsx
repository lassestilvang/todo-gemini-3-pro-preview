"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { ListTodo } from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ResolvedIconProps {
    icon: string | null | undefined;
    color?: string | null;
    className?: string;
    fallback?: LucideIcon;
}

export function ResolvedIcon({ icon, color, className, fallback }: ResolvedIconProps) {
    // Memoize the resolved icon data to prevent unnecessary re-parsing
    const resolved = useMemo(() => {
        if (!icon) return { type: "fallback" as const };

        // Check for URL (http or data URI)
        if (icon.startsWith("http") || icon.startsWith("data:")) {
            return { type: "image" as const, value: icon };
        }

        // Check for Lucide format: "lucide:name#color" or just "name" (legacy)
        // Also supports legacy "name" which implies Lucide icon
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

            // PascalCase the name for lookup (e.g. "shopping-cart" -> "ShoppingCart")
            // This is a rough heuristic, we might need a better map if we want to support all
            const pascalName = name
                .split("-")
                .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                .join("");

            // @ts-expect-error - Dynamic lookup
            const IconComponent = LucideIcons[pascalName] || LucideIcons[name];

            if (IconComponent) {
                return { type: "icon" as const, Component: IconComponent, color: iconColor };
            }
        }

        // Assume Emoji if not matched above
        return { type: "emoji" as const, value: icon };

    }, [icon, color]);

    if (resolved.type === "image") {
        return (
            <div className={cn("relative overflow-hidden rounded-sm shrink-0", className)}>
                {/*
                   Using standard img for data URIs or external URLs where we can't easily optimize
                   with Next.Image without whitelisting domains.
                */}
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
        const { Component, color: resolvedColor } = resolved;
        return (
            <Component
                className={cn("shrink-0", className)}
                style={{ color: resolvedColor || undefined }}
            />
        );
    }

    // Fallback
    const FallbackIcon = fallback || ListTodo;
    return (
        <FallbackIcon
            className={cn("shrink-0", className)}
            style={{ color: color || undefined }}
        />
    );
}
