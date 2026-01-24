"use client";

import { useEffect } from "react";

export function PwaRegister() {
    useEffect(() => {
        if ("serviceWorker" in navigator) {
            if (process.env.NODE_ENV === "development") {
                navigator.serviceWorker.getRegistrations().then((registrations) => {
                    for (const registration of registrations) {
                        registration.unregister();
                        console.log("Unregistered service worker in dev mode");
                    }
                });
            }
            // In production, next-pwa handles registration automatically via 'register: true' in next.config.ts
        }
    }, []);

    return null;
}
