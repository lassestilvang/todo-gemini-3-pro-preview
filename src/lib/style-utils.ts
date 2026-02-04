import { CSSProperties } from "react";

const styleCache = new Map<string, CSSProperties>();

/**
 * Generates a style object for a label with the given color.
 * Uses caching to avoid allocating new objects for repeated colors.
 *
 * @param color The color string (hex) or null
 * @returns CSSProperties object with color, background, and border
 */
export function getLabelStyle(color: string | null): CSSProperties {
    const c = color || '#000000';

    // Check cache first to avoid object allocation
    if (styleCache.has(c)) {
        return styleCache.get(c)!;
    }

    // Create and cache new style object
    const style: CSSProperties = {
        borderColor: c + '40',
        backgroundColor: c + '10',
        color: c
    };

    styleCache.set(c, style);
    return style;
}
