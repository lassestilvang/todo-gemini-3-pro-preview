import { format, isToday, isTomorrow, isYesterday } from "date-fns";

/**
 * Detects if the system is set to 24-hour clock.
 */
export function isSystem24Hour(): boolean {
    if (typeof window === "undefined") return false;
    return !new Intl.DateTimeFormat(undefined, { hour: "numeric" })
        .formatToParts(new Date())
        .some((part) => part.type === "dayPeriod");
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
    const d = new Date(date);
    if (isToday(d)) return "Today";
    if (isTomorrow(d)) return "Tomorrow";
    if (isYesterday(d)) return "Yesterday";
    return format(d, fallbackFormat);
}
