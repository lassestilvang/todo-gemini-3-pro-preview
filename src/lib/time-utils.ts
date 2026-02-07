import { format, isToday, isTomorrow, isYesterday } from "date-fns";

let cachedIs24Hour: boolean | null = null;

/**
 * Detects if the system is set to 24-hour clock.
 */
export function isSystem24Hour(): boolean {
    if (cachedIs24Hour !== null) {
        return cachedIs24Hour;
    }

    if (typeof window === "undefined") {
        return false;
    }

    cachedIs24Hour = !new Intl.DateTimeFormat(undefined, { hour: "numeric" })
        .formatToParts(new Date())
        .some((part) => part.type === "dayPeriod");

    return cachedIs24Hour;
}

/**
 * Formats a date or time according to the user's preference.
 * 
 * @param date - The date to format
 * @param use24h - User's preference (true=24h, false=12h, null=auto)
 * @param type - Whether to format as 'time', 'date', or 'datetime'
 */
export function formatTimePreference(
    date: Date | number,
    use24h: boolean | null,
    type: "time" | "date" | "datetime" = "time"
): string {
    const is24h = use24h ?? isSystem24Hour();

    if (type === "date") {
        return format(date, "PPP");
    }

    if (type === "datetime") {
        const timeFormat = is24h ? "HH:mm" : "h:mm a";
        return format(date, `PPP ${timeFormat}`);
    }

    // default 'time'
    return format(date, is24h ? "HH:mm" : "h:mm a");
}

/**
 * Formats a date to "Today", "Tomorrow", "Yesterday", or a fallback format.
 *
 * @param date - The date to format
 * @param fallbackFormat - Format string to use if not today/tomorrow/yesterday (default: "PPP")
 */
export function formatFriendlyDate(date: Date | number, fallbackFormat: string = "PPP"): string {
    // Optimization: Avoid cloning Date if it's already a Date object
    const d = date instanceof Date ? date : new Date(date);

    if (isToday(d)) return "Today";
    if (isTomorrow(d)) return "Tomorrow";
    if (isYesterday(d)) return "Yesterday";
    return format(d, fallbackFormat);
}
