"use client";

import { useEffect, type RefObject } from "react";
import { Draggable } from "@fullcalendar/react";

export function useExternalDrag(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

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
        };
      },
    });

    return () => draggable.destroy();
  }, [containerRef]);
}
