
import { cn } from '@/lib/utils'
import { type CalendarOptions, type DayCellData } from '@fullcalendar/react'

export const xxsTextClass = 'text-[0.6875rem]/[1.090909]'

export const blockPointerResizerClass = 'absolute hidden group-hover:block'
export const rowPointerResizerClass = `${blockPointerResizerClass} inset-y-0 w-2`
export const columnPointerResizerClass = `${blockPointerResizerClass} inset-x-0 h-2`

export const blockTouchResizerClass = 'absolute size-2 border border-(--fc-event-color) bg-background rounded-full'
export const rowTouchResizerClass = `${blockTouchResizerClass} top-1/2 -mt-1`
export const columnTouchResizerClass = `${blockTouchResizerClass} left-1/2 -ml-1`

export const tallDayCellBottomClass = 'min-h-4'
export const getShortDayCellBottomClass = (data: DayCellData) => cn(
    !data.isNarrow && 'min-h-px'
)

export const dayRowCommonClasses: CalendarOptions = {
    listItemEventClass: (data) => cn(
        'mb-px p-px rounded-sm',
        data.isNarrow ? 'mx-px' : 'mx-0.5',
    ),
    listItemEventBeforeClass: (data) => cn(
        'border-4',
        data.isNarrow ? 'ms-0.5' : 'ms-1',
    ),
    listItemEventInnerClass: (data) => (
        data.isNarrow
            ? `py-px ${xxsTextClass}`
            : 'py-0.5 text-xs'
    ),
    listItemEventTimeClass: (data) => cn(
        data.isNarrow ? 'ps-0.5' : 'ps-1',
        'whitespace-nowrap overflow-hidden shrink-1',
    ),
    listItemEventTitleClass: (data) => cn(
        data.isNarrow ? 'px-0.5' : 'px-1',
        'font-bold whitespace-nowrap overflow-hidden shrink-100',
    ),
    rowEventClass: (data) => cn(
        data.isStart && 'ms-px',
        data.isEnd && 'me-px',
    ),
    rowEventInnerClass: (data) => cn(data.isNarrow ? 'py-px' : 'py-0.5'),
    rowMoreLinkClass: (data) => cn(
        'mb-px border rounded-sm hover:bg-foreground/5',
        data.isNarrow
            ? 'mx-px border-primary'
            : 'mx-0.5 border-transparent',
    ),
    rowMoreLinkInnerClass: (data) => (
        data.isNarrow
            ? `px-0.5 py-px ${xxsTextClass}`
            : 'px-1 py-0.5 text-xs'
    ),
}

export function filledRightTriangle(className?: string) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 800 2200"
            preserveAspectRatio="none"
            className={className}
        >
            <polygon points="0,0 66,0 800,1100 66,2200 0,2200" fill="currentColor" />
        </svg>
    )
}
