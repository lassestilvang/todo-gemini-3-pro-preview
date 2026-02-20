
import React from "react";
import { UnplannedColumn } from "../UnplannedColumn";
import { TodayColumn } from "../TodayColumn";
import { EventCalendar } from "@/components/calendar4/event-calendar";
import { Task } from "@/lib/types";

interface CalendarLayoutProps {
    unplannedTasks: Task[];
    todayTasks: Task[];
    todayDoneTasks: Task[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    events: any[];
    selectedListName: string;
    onEditTask: (task: Task) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onDateClick: (info: any) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onEventClick: (info: any) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onEventDrop: (info: any) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onEventResize: (info: any) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onEventReceive: (info: any) => void;
}

export function CalendarLayout({
    unplannedTasks, todayTasks, todayDoneTasks, events, selectedListName,
    onEditTask, onDateClick, onEventClick, onEventDrop, onEventResize, onEventReceive
}: CalendarLayoutProps) {
    return (
        <div className="flex-1 flex min-w-0">
            {/* Column 1: Unplanned */}
            <div className="w-[300px] shrink-0 border-r flex flex-col min-h-0 bg-background/50">
                <UnplannedColumn
                    tasks={unplannedTasks}
                    listName={selectedListName}
                    onEditTask={onEditTask}
                />
            </div>

            {/* Column 2: Today */}
            <div className="w-[300px] shrink-0 border-r flex flex-col min-h-0 bg-background/50">
                <TodayColumn
                    tasks={todayTasks}
                    doneTasks={todayDoneTasks}
                    onEditTask={onEditTask}
                />
            </div>

            {/* Column 3: Calendar */}
            <div className="flex-1 min-w-0 flex flex-col bg-background">
                <EventCalendar
                    height="100%"
                    initialView="timeGridWeek"
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
                    }}
                    events={events}
                    editable={true}
                    droppable={true}
                    selectable={true}
                    dateClick={onDateClick}
                    eventClick={onEventClick}
                    eventDrop={onEventDrop}
                    eventResize={onEventResize}
                    eventReceive={onEventReceive}
                    availableViews={['dayGridMonth', 'timeGridWeek', 'timeGridDay', 'listWeek']}
                />
            </div>
        </div>
    );
}
