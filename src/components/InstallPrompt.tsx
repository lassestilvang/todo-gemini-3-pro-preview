"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

export function InstallPrompt() {
    const { isInstallable, handleInstall } = useInstallPrompt();

    if (!isInstallable) return null;

    return (
        <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-purple-600 border-purple-200 hover:bg-purple-50"
            onClick={handleInstall}
        >
            <Download className="mr-2 h-4 w-4" />
            Install App
        </Button>
    );
}
