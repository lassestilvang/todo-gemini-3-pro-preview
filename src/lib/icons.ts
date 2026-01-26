import {
    ListTodo,
    Briefcase,
    Home,
    User,
    Star,
    Settings,
    ShoppingCart,
    Plane,
    Dumbbell,
    Book,
    Music,
    Video,
    Code,
    Users,
    Coffee,
    Sun,
    Moon,
    Tag,
    Flag,
    Bookmark,
    Zap,
    Heart,
    Calendar,
    CheckSquare,
    Clock3,
    AlertTriangle,
    Compass,
    Database,
    Edit,
    Filter,
    Gift,
    Globe,
    Info,
    Lock,
    Map,
    Search,
    Smartphone,
    Smile,
    Trash2,
    Tv,
    Wifi,
    Cloud,
    Rocket,
    Flame,
    Ghost,
    Gamepad,
    Terminal,
    Hash as HashIcon
} from "lucide-react";

export const AVAILABLE_ICONS = [
    // Essentials
    { name: "list-todo", icon: ListTodo, tags: ["todo", "list", "check"] },
    { name: "check-square", icon: CheckSquare, tags: ["done", "task"] },
    { name: "calendar", icon: Calendar, tags: ["date", "schedule"] },
    { name: "clock-3", icon: Clock3, tags: ["time", "watch"] },
    { name: "alert-triangle", icon: AlertTriangle, tags: ["warning", "danger"] },
    { name: "info", icon: Info, tags: ["information", "help"] },

    // Lifestyle & Home
    { name: "home", icon: Home, tags: ["house", "building"] },
    { name: "coffee", icon: Coffee, tags: ["drink", "cafe"] },
    { name: "dumbbell", icon: Dumbbell, tags: ["gym", "workout", "fitness"] },
    { name: "shopping-cart", icon: ShoppingCart, tags: ["buy", "store"] },
    { name: "gift", icon: Gift, tags: ["present", "birthday"] },
    { name: "music", icon: Music, tags: ["song", "audio"] },
    { name: "video", icon: Video, tags: ["movie", "film"] },
    { name: "book", icon: Book, tags: ["read", "study"] },
    { name: "gamepad", icon: Gamepad, tags: ["game", "play"] },

    // Tech & Work
    { name: "briefcase", icon: Briefcase, tags: ["work", "office", "job"] },
    { name: "code", icon: Code, tags: ["dev", "programming"] },
    { name: "terminal", icon: Terminal, tags: ["command", "console"] },
    { name: "monitor", icon: Tv, tags: ["screen", "display"] },
    { name: "smartphone", icon: Smartphone, tags: ["mobile", "phone"] },
    { name: "database", icon: Database, tags: ["storage", "server"] },
    { name: "cloud", icon: Cloud, tags: ["weather", "sky"] },
    { name: "wifi", icon: Wifi, tags: ["internet", "network"] },

    // Abstract & Shapes
    { name: "star", icon: Star, tags: ["favorite", "rating"] },
    { name: "heart", icon: Heart, tags: ["love", "like"] },
    { name: "flag", icon: Flag, tags: ["priority", "goal"] },
    { name: "tag", icon: Tag, tags: ["label", "category"] },
    { name: "hash", icon: HashIcon, tags: ["number", "tag"] },
    { name: "bookmark", icon: Bookmark, tags: ["save", "read"] },
    { name: "ghost", icon: Ghost, tags: ["spooky", "halloween"] },
    { name: "flame", icon: Flame, tags: ["fire", "hot"] },
    { name: "rocket", icon: Rocket, tags: ["launch", "space"] },
    { name: "zap", icon: Zap, tags: ["electricity", "power"] },

    // Travel
    { name: "plane", icon: Plane, tags: ["fly", "travel", "airport"] },
    { name: "map", icon: Map, tags: ["location", "place"] },
    { name: "compass", icon: Compass, tags: ["navigation", "direction"] },
    { name: "globe", icon: Globe, tags: ["world", "earth"] },

    // User
    { name: "user", icon: User, tags: ["person", "profile"] },
    { name: "users", icon: Users, tags: ["people", "group"] },
    { name: "smile", icon: Smile, tags: ["happy", "face"] },

    // Settings & UI
    { name: "settings", icon: Settings, tags: ["options", "config"] },
    { name: "search", icon: Search, tags: ["find", "query"] },
    { name: "filter", icon: Filter, tags: ["sort", "options"] },
    { name: "trash-2", icon: Trash2, tags: ["delete", "remove"] },
    { name: "edit", icon: Edit, tags: ["write", "pencil"] },
    { name: "lock", icon: Lock, tags: ["secure", "password"] },
    { name: "sun", icon: Sun, tags: ["light", "day"] },
    { name: "moon", icon: Moon, tags: ["dark", "night"] },
];

export const LIST_ICONS = AVAILABLE_ICONS; // Legacy compatibility
export const LABEL_ICONS = AVAILABLE_ICONS.filter(i =>
    ["tag", "hash", "flag", "bookmark", "alert-triangle", "check-square", "clock-3", "zap", "heart", "star", "flame", "rocket", "gem"].includes(i.name)
);

export function getListIcon(name: string | null) {
    if (!name) return ListTodo;
    return LIST_ICONS.find((i) => i.name === name)?.icon || ListTodo;
}

export function getLabelIcon(name: string | null) {
    if (!name) return HashIcon;
    return LABEL_ICONS.find((i) => i.name === name)?.icon || HashIcon;
}
