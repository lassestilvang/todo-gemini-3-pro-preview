"use client";

import { useReportWebVitals } from "next/web-vitals";

export function WebVitals() {
    useReportWebVitals((metric) => {
        // In a real app, you would send this to your analytics provider (e.g. Vercel, GA, etc.)
        console.log("Web Vital:", metric);

        // Example: send to custom endpoint
        /*
        const body = JSON.stringify(metric);
        const url = '/api/vitals';
    
        // Use `navigator.sendBeacon()` if available, otherwise falling back to `fetch()`.
        if (navigator.sendBeacon) {
          navigator.sendBeacon(url, body);
        } else {
          fetch(url, { body, method: 'POST', keepalive: true });
        }
        */
    });

    return null;
}
