"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, ChevronsUpDown, GraduationCap } from "lucide-react";
import { signOut } from "@/lib/auth";
import Link from "next/link";
import { toast } from "sonner";
import { useOnboarding } from "@/components/providers/OnboardingProvider";

interface UserProfileProps {
    user: {
        id: string;
        email: string;
        firstName?: string | null;
        lastName?: string | null;
        avatarUrl?: string | null;
    } | null;
}

export function UserProfile({ user }: UserProfileProps) {
    const { startTour } = useOnboarding();

    if (!user) {
        return null;
    }

    const displayName = user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.firstName || user.email;

    const initials = user.firstName && user.lastName
        ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
        : (user.email[0] || "?").toUpperCase();

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error("Sign out failed:", error);
            toast.error("Failed to sign out. Please try again.");
        }
    };

    const handleReplayOnboarding = () => {
        startTour();
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild aria-label="User Profile">
                <Button variant="ghost" className="w-full h-14 justify-between px-3 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground" data-testid="user-profile-button">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <span className="sr-only">User Profile</span>
                        <Avatar className="h-9 w-9 border border-border">
                            <AvatarImage src={user.avatarUrl || undefined} alt={displayName} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-start text-left overflow-hidden min-w-0">
                            <span className="text-sm font-semibold truncate w-full">
                                {displayName}
                            </span>
                            {user.email && (
                                <span className="text-xs text-muted-foreground truncate w-full">
                                    {user.email}
                                </span>
                            )}
                        </div>
                    </div>
                    <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="right" className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg" sideOffset={4}>
                <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{displayName}</p>
                        {user.firstName && (
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                        )}
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/settings" className="w-full flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        Profile Settings
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleReplayOnboarding} className="w-full flex items-center">
                    <GraduationCap className="mr-2 h-4 w-4" />
                    Replay Onboarding
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive" data-testid="sign-out-button">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
