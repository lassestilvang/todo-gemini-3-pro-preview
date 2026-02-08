"use client";

import { useEffect, type RefObject } from "react";
import { Draggable } from "@fullcalendar/react";

// In v7 Draggable is exported from interaction plugin or core? 
// Actually in v6 it was @fullcalendar/interaction.
// Let's check if @fullcalendar/interaction is installed and has it.
// usage: import { Draggable } from '@fullcalendar/interaction';

export function useExternalDrag(containerRef: RefObject<HTMLElement | null>) {
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        // Draggable requires the interaction plugin to be loaded? 
        // Actually Draggable class is a standalone utility often provided by interaction.
        // Let's try importing from @fullcalendar/interaction.

        const draggable = new Draggable(el, {
            itemSelector: ".fc-external-task",
            eventData: (eventEl) => {
                const taskId = eventEl.getAttribute("data-task-id");
                const title = eventEl.getAttribute("data-task-title") || "Untitled";
                const duration = Number(eventEl.getAttribute("data-duration")) || 30;
                const listColor = eventEl.getAttribute("data-list-color") || undefined;

                return {
                    title,
                    duration: { minutes: duration },
                    extendedProps: { taskId: Number(taskId) },
                    backgroundColor: listColor,
                    borderColor: listColor,
                    create: true // important for external element drop
                };
            },
        });

        return () => draggable.destroy();
    }, [containerRef]);
}
