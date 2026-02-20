
import FullCalendar, { type CalendarOptions } from '@fullcalendar/react'
import '@fullcalendar/react/skeleton.css'
import type { } from '@fullcalendar/react/daygrid'
import type { } from '@fullcalendar/react/timegrid'
import type { } from '@fullcalendar/react/list'
import type { } from '@fullcalendar/react/multimonth'
import { cn } from '@/lib/utils'

import {
  xxsTextClass,
  rowPointerResizerClass,
  columnPointerResizerClass,
  rowTouchResizerClass,
  columnTouchResizerClass,
  tallDayCellBottomClass,
  getShortDayCellBottomClass,
  dayRowCommonClasses,
  filledRightTriangle
} from './event-calendar-utils'

export type EventCalendarViewProps =
  CalendarOptions &
  Required<Pick<CalendarOptions, 'popoverCloseContent'>> & {
    liquidHeight?: boolean
  }

export function EventCalendarViews({
  className, liquidHeight, height, views: userViews, ...restOptions
}: EventCalendarViewProps) {
  return (
    <div className={cn(liquidHeight && 'grow min-h-0', className)}>
      <FullCalendar
        height={liquidHeight ? '100%' : height}
        eventShortHeight={50}
        eventColor='var(--primary)'
        eventContrastColor='var(--primary-foreground)'
        eventClass={(data) => cn(
          data.isSelected ? ['outline-3', data.isDragging ? 'shadow-lg' : 'shadow-md'] : 'focus-visible:outline-3',
          'outline-ring/50',
        )}
        backgroundEventColor='var(--foreground)'
        backgroundEventClass='bg-[color-mix(in_oklab,var(--fc-event-color)_10%,transparent)]'
        backgroundEventTitleClass={(data) => cn('opacity-50 italic', data.isNarrow ? `px-1 py-1.5 ${xxsTextClass}` : 'px-2 py-2.5 text-xs')}
        listItemEventClass={(data) => cn('items-center', data.isSelected ? 'bg-foreground/5' : 'hover:bg-foreground/5')}
        listItemEventBeforeClass='rounded-full border-(--fc-event-color)'
        listItemEventInnerClass='flex flex-row items-center'
        blockEventClass={(data) => cn(
          'group relative border-transparent print:border-(--fc-event-color) bg-(--fc-event-color) hover:bg-[color-mix(in_oklab,var(--fc-event-color)_92%,var(--fc-event-contrast-color))] print:bg-white',
          data.isInteractive && 'active:bg-[color-mix(in_oklab,var(--fc-event-color)_85%,var(--fc-event-contrast-color))]',
          (!data.isSelected && data.isDragging) && 'opacity-75',
        )}
        blockEventInnerClass='text-(--fc-event-contrast-color) print:text-black'
        blockEventTimeClass='whitespace-nowrap overflow-hidden'
        blockEventTitleClass='whitespace-nowrap overflow-hidden'
        rowEventClass={(data) => cn('mb-px border-y', data.isStart ? 'border-s rounded-s-sm' : (!data.isNarrow && 'ms-2'), data.isEnd ? 'border-e rounded-e-sm' : (!data.isNarrow && 'me-2'))}
        rowEventBeforeClass={(data) => cn(data.isStartResizable && [data.isSelected ? rowTouchResizerClass : rowPointerResizerClass, '-start-1'], (!data.isStart && !data.isNarrow) && 'absolute -start-2 w-2 -top-px -bottom-px')}
        rowEventBeforeContent={(data) => (!data.isStart && !data.isNarrow) ? filledRightTriangle('size-full rotate-180 [[dir=rtl]_&]:rotate-0 text-(--fc-event-color)') : <></>}
        rowEventAfterClass={(data) => cn(data.isEndResizable && [data.isSelected ? rowTouchResizerClass : rowPointerResizerClass, '-end-1'], (!data.isEnd && !data.isNarrow) && 'absolute -end-2 w-2 -top-px -bottom-px')}
        rowEventAfterContent={(data) => (!data.isEnd && !data.isNarrow) ? filledRightTriangle('size-full [[dir=rtl]_&]:rotate-180 text-(--fc-event-color)') : <></>}
        rowEventInnerClass={(data) => cn('flex flex-row items-center', data.isNarrow ? xxsTextClass : 'text-xs')}
        rowEventTimeClass={(data) => cn('font-bold shrink-1', data.isNarrow ? 'ps-0.5' : 'ps-1')}
        rowEventTitleClass={(data) => cn('shrink-100', data.isNarrow ? 'px-0.5' : 'px-1')}
        columnEventTitleSticky={false}
        columnEventClass={(data) => cn('border-x ring ring-background', data.isStart && 'border-t rounded-t-sm', data.isEnd && 'mb-px border-b rounded-b-sm')}
        columnEventBeforeClass={(data) => cn(data.isStartResizable && [data.isSelected ? columnTouchResizerClass : columnPointerResizerClass, '-top-1'])}
        columnEventAfterClass={(data) => cn(data.isEndResizable && [data.isSelected ? columnTouchResizerClass : columnPointerResizerClass, '-bottom-1'])}
        columnEventInnerClass={(data) => cn('flex', data.isShort ? 'flex-row items-center p-1 gap-1' : ['flex-col', data.isNarrow ? 'px-1 py-0.5' : 'px-2 py-1'], (data.isShort || data.isNarrow) ? xxsTextClass : 'text-xs')}
        columnEventTimeClass={(data) => cn('order-1 shrink-100', !data.isShort && (data.isNarrow ? 'pb-0.5' : 'pb-1'))}
        columnEventTitleClass={(data) => cn('shrink-1', !data.isShort && (data.isNarrow ? 'py-0.5' : 'py-1'))}
        moreLinkClass="focus-visible:outline-3 outline-ring/50"
        moreLinkInnerClass='whitespace-nowrap overflow-hidden'
        columnMoreLinkClass="mb-px border border-transparent print:border-black rounded-sm bg-[color-mix(in_oklab,var(--foreground)_10%,var(--background))] hover:bg-[color-mix(in_oklab,var(--foreground)_13%,var(--background))] print:bg-white ring ring-background"
        columnMoreLinkInnerClass={(data) => data.isNarrow ? `p-0.5 ${xxsTextClass}` : 'p-1 text-xs'}
        dayHeaderAlign='center'
        dayHeaderClass={(data) => cn('justify-center', data.isMajor && 'border border-foreground/20', (data.isDisabled && !data.inPopover) && 'bg-foreground/3')}
        dayHeaderInnerClass='group mt-2 mx-2 flex flex-col items-center outline-none'
        dayHeaderContent={(data) => (
          <>
            {data.weekdayText && <div className="text-xs uppercase text-muted-foreground">{data.weekdayText}</div>}
            {data.dayNumberText && (
              <div className={cn('m-0.5 rounded-full flex flex-row items-center justify-center', data.isNarrow ? 'size-7 text-md' : 'size-8 text-lg', data.isToday ? ['bg-primary/20 dark:bg-primary/30', data.hasNavLink && 'group-hover:bg-primary/40'] : (data.hasNavLink && 'hover:bg-foreground/5'), data.hasNavLink && 'group-focus-visible:outline-3 outline-ring/50')}>
                {data.dayNumberText}
              </div>
            )}
          </>
        )}
        dayCellClass={(data) => cn('border', data.isMajor && 'border-foreground/20', data.isDisabled && 'bg-foreground/3')}
        dayCellTopClass={(data) => cn('flex flex-row', data.isNarrow ? 'justify-end min-h-px' : 'justify-center min-h-0.5')}
        dayCellTopInnerClass={(data) => cn('flex flex-row items-center justify-center whitespace-nowrap rounded-full', data.isNarrow ? `m-px h-5 ${xxsTextClass}` : 'm-1.5 h-6 text-sm', data.text === data.dayNumberText ? (data.isNarrow ? 'w-5' : 'w-6') : (data.isNarrow ? 'px-1' : 'px-2'), data.isToday ? ['bg-primary/20 dark:bg-primary/30', data.hasNavLink && 'hover:bg-primary/40 focus-visible:outline-3 outline-ring/50'] : (data.hasNavLink && 'hover:bg-foreground/5'), data.isOther && 'text-muted-foreground', data.monthText && 'font-bold')}
        dayCellInnerClass={(data) => cn(data.inPopover && 'p-2')}
        dayPopoverFormat={{ day: 'numeric', weekday: 'short' }}
        popoverClass='border rounded-md overflow-hidden shadow-lg m-1 bg-popover text-popover-foreground min-w-60'
        popoverCloseClass="group absolute top-2 end-2 size-8 rounded-full items-center justify-center hover:bg-foreground/5 focus-visible:outline-3 outline-ring/50"
        dayLaneClass={(data) => cn('border', data.isMajor && 'border-foreground/20', data.isDisabled && 'bg-foreground/3')}
        dayLaneInnerClass={(data) => data.isStack ? 'm-1' : (data.isNarrow ? 'mx-px' : 'ms-0.5 me-[2.5%]')}
        slotLaneClass={(data) => cn('border', data.isMinor && 'border-dotted')}
        listDayFormat={{ day: 'numeric' }}
        listDaySideFormat={{ month: 'short', weekday: 'short', forceCommas: true }}
        listDayClass='not-last:border-b flex flex-row items-start'
        listDayHeaderClass='m-2 shrink-0 w-1/3 max-w-44 min-h-9 flex flex-row items-center gap-2'
        listDayHeaderInnerClass={(data) => cn(!data.level ? ['h-9 rounded-full flex flex-row items-center text-lg', data.text === data.dayNumberText ? 'w-9 justify-center' : 'px-3', data.isToday ? ['bg-primary/20 dark:bg-primary/30', data.hasNavLink && 'hover:bg-primary/40 focus-visible:outline-3 outline-ring/50'] : (data.hasNavLink && 'hover:bg-foreground/5')] : ['text-xs uppercase', data.hasNavLink && 'hover:underline'])}
        listDayEventsClass='grow min-w-0 py-2 gap-1'
        singleMonthClass='m-4'
        singleMonthHeaderClass={(data) => cn(data.isSticky && 'border-b bg-background', data.colCount > 1 ? 'pb-2' : 'py-1', 'items-center')}
        singleMonthHeaderInnerClass={(data) => cn('px-3 py-1 rounded-full text-base font-bold', data.hasNavLink && 'hover:bg-foreground/5')}
        tableHeaderClass={(data) => cn(data.isSticky && 'border-b bg-background')}
        fillerClass={(data) => cn('opacity-50 border', data.isHeader && 'border-transparent')}
        dayNarrowWidth={100}
        dayHeaderRowClass='border'
        dayRowClass='border'
        navLinkClass="focus-visible:outline-3 outline-ring/50"
        inlineWeekNumberClass={(data) => cn('absolute flex flex-row items-center whitespace-nowrap bg-foreground/10', data.isNarrow ? `top-0.5 start-0 my-px h-4 pe-1 rounded-e-full ${xxsTextClass}` : 'top-1.5 start-1 h-6 px-2 rounded-full text-sm', data.hasNavLink && 'hover:bg-foreground/20 focus-visible:outline-3 outline-ring/50')}
        nonBusinessClass='bg-foreground/3'
        highlightClass='bg-primary/10'
        nowIndicatorLineClass='-m-px border-1 border-destructive'
        nowIndicatorDotClass="-m-[6px] border-6 border-destructive size-0 rounded-full ring-2 ring-background"
        views={{
          ...userViews,
          dayGrid: { ...dayRowCommonClasses, dayCellBottomClass: getShortDayCellBottomClass, ...userViews?.dayGrid },
          multiMonth: { ...dayRowCommonClasses, dayCellBottomClass: getShortDayCellBottomClass, tableBodyClass: 'border rounded-sm', dayHeaderInnerClass: (data) => cn(!data.inPopover && 'mb-2'), ...userViews?.multiMonth },
          timeGrid: {
            ...dayRowCommonClasses, dayCellBottomClass: tallDayCellBottomClass,
            weekNumberHeaderClass: 'items-center justify-end',
            weekNumberHeaderInnerClass: (data) => cn('ms-1 my-2 flex flex-row items-center rounded-full bg-foreground/10', data.options.dayMinWidth !== undefined && 'me-1', data.isNarrow ? 'h-5 px-1.5 text-xs' : 'h-6 px-2 text-sm', data.hasNavLink && 'hover:bg-foreground/20 focus-visible:outline-3 outline-ring/50'),
            allDayHeaderClass: 'items-center justify-end',
            allDayHeaderInnerClass: (data) => cn('p-2 whitespace-pre text-end', data.isNarrow ? xxsTextClass : 'text-sm'),
            allDayDividerClass: 'border-b',
            slotHeaderClass: (data) => cn('w-2 self-end justify-end', 'border', data.isMinor && 'border-dotted'),
            slotHeaderInnerClass: (data) => cn('relative ps-2 pe-3 py-2', data.isNarrow ? `-top-4 ${xxsTextClass}` : '-top-5 text-sm', data.isFirst && 'hidden'),
            slotHeaderDividerClass: (data) => cn('border-e', (data.isHeader && data.options.dayMinWidth === undefined) && 'border-transparent'),
            ...userViews?.timeGrid,
          },
          list: {
            listItemEventClass: 'group p-2 rounded-s-full gap-2', listItemEventBeforeClass: 'mx-2 border-5', listItemEventInnerClass: 'gap-2 text-sm', listItemEventTimeClass: 'shrink-0 w-1/2 max-w-40 whitespace-nowrap overflow-hidden text-ellipsis', listItemEventTitleClass: (data) => cn('grow min-w-0 whitespace-nowrap overflow-hidden', data.event.url && 'group-hover:underline'),
            noEventsClass: 'grow flex flex-col items-center justify-center', noEventsInnerClass: 'py-15', ...userViews?.list,
          },
        }}
        {...restOptions}
      />
    </div>
  )
}
