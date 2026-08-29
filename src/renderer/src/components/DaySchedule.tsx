import { useEffect, useMemo, useRef, useState } from 'react'
import type { ClassSession, Holiday } from '@shared/types'
import {
  eventColor,
  formatClock,
  formatHourLabel,
  isSameLocalDate,
  minutesFromMidnight,
  padTime
} from '../lib/attendance'

const HOUR_HEIGHT = 72
const HOURS = Array.from({ length: 24 }, (_, hour) => hour)

interface DayScheduleProps {
  date: string
  sessions: ClassSession[]
  holiday: Holiday | null
  onBack: () => void
  onToday: () => void
  onAdd: (startTime: string, endTime: string) => void
  onSelect: (session: ClassSession) => void
  onSaveHoliday: (name: string) => Promise<void>
  onClearHoliday: () => Promise<void>
}

function durationMinutes(session: ClassSession): number {
  return Math.max(20, minutesFromMidnight(session.endAt) - minutesFromMidnight(session.startAt))
}

function addHour(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const next = hours + 1
  if (next >= 24) {
    return '23:59'
  }
  return padTime(next, minutes)
}

export function DaySchedule({
  date,
  sessions,
  holiday,
  onBack,
  onToday,
  onAdd,
  onSelect,
  onSaveHoliday,
  onClearHoliday
}: DayScheduleProps): React.JSX.Element {
  const scroller = useRef<HTMLDivElement>(null)
  const [now, setNow] = useState(() => new Date())
  const [holidayOn, setHolidayOn] = useState(Boolean(holiday))
  const [holidayName, setHolidayName] = useState(holiday?.name ?? '')
  const [holidayError, setHolidayError] = useState('')
  const isToday = isSameLocalDate(date, now)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    setHolidayOn(Boolean(holiday))
    setHolidayName(holiday?.name ?? '')
    setHolidayError('')
  }, [holiday, date])

  useEffect(() => {
    const node = scroller.current
    if (!node) {
      return
    }
    const current = new Date()
    const minutes = isSameLocalDate(date, current)
      ? current.getHours() * 60 + current.getMinutes()
      : 9 * 60
    node.scrollTop = Math.max(0, (minutes / 60) * HOUR_HEIGHT - 160)
  }, [date])

  const heading = useMemo(() => {
    const [year, month, day] = date.split('-').map(Number)
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }, [date])

  const nowTop = (now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60) * (HOUR_HEIGHT / 60)

  function onGridClick(event: React.MouseEvent<HTMLDivElement>): void {
    if ((event.target as HTMLElement).closest('[data-event]')) {
      return
    }
    const bounds = event.currentTarget.getBoundingClientRect()
    const rawMinutes = ((event.clientY - bounds.top) / HOUR_HEIGHT) * 60
    const snapped = Math.max(0, Math.min(23 * 60 + 45, Math.round(rawMinutes / 15) * 15))
    const start = padTime(Math.floor(snapped / 60), snapped % 60)
    onAdd(start, addHour(start))
  }

  async function applyHoliday(checked: boolean): Promise<void> {
    setHolidayError('')
    if (!checked) {
      setHolidayOn(false)
      await onClearHoliday()
      return
    }
    setHolidayOn(true)
  }

  async function saveHolidayName(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    if (!holidayName.trim()) {
      setHolidayError('Enter the name of the holiday')
      return
    }
    await onSaveHoliday(holidayName.trim())
  }

  return (
    <div className="flex h-full min-h-0 flex-col p-6">
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg bg-forest px-3 py-2 text-sm text-white"
        >
          ← Month
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">{heading}</h2>
          <p className="text-sm text-ink/55">Click a time to add a class. Click a class to mark attendance.</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onToday}
            className="rounded-lg bg-forest px-3 py-2 text-sm text-white"
          >
            Today
          </button>
          <label className="flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={holidayOn}
              onChange={(event) => void applyHoliday(event.target.checked)}
            />
            Holiday
          </label>
        </div>
      </div>

      {holidayOn ? (
        <form onSubmit={saveHolidayName} className="mb-4 flex flex-wrap items-end gap-2">
          <label className="grid min-w-56 flex-1 gap-1 text-sm">
            Name of holiday
            <input
              value={holidayName}
              onChange={(event) => setHolidayName(event.target.value)}
              className="rounded-lg border border-line bg-white px-3 py-2"
              placeholder="Diwali"
            />
          </label>
          <button type="submit" className="rounded-lg bg-forest px-4 py-2 text-sm text-white">
            Save holiday
          </button>
          {holidayError ? <p className="w-full text-sm text-red-600">{holidayError}</p> : null}
        </form>
      ) : null}

      {holiday ? (
        <p className="mb-3 rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-900">
          {holiday.name} — classes this day are canceled.
        </p>
      ) : null}

      <div ref={scroller} className="min-h-0 flex-1 overflow-auto rounded-2xl bg-panel shadow-sm">
        <div className="flex min-w-[640px]">
          <div
            className={`relative flex-1 cursor-pointer ${holiday ? 'bg-sky-100/80' : ''}`}
            style={{ height: HOURS.length * HOUR_HEIGHT }}
            onClick={onGridClick}
          >
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute right-0 left-0 border-t border-line/80"
                style={{ top: hour * HOUR_HEIGHT }}
              />
            ))}

            {sessions.map((session) => (
              <button
                key={session.id}
                type="button"
                data-event="true"
                onClick={(event) => {
                  event.stopPropagation()
                  onSelect(session)
                }}
                className="absolute right-3 left-3 overflow-hidden rounded-lg px-3 py-1 text-left text-white shadow-sm"
                style={{
                  top: (minutesFromMidnight(session.startAt) / 60) * HOUR_HEIGHT + 1,
                  height: (durationMinutes(session) / 60) * HOUR_HEIGHT - 2,
                  backgroundColor: eventColor(session.attendanceStatus, session.isHoliday)
                }}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{session.subjectName}</span>
                  <span className="shrink-0 text-[11px] opacity-90">
                    {formatClock(session.startAt)} – {formatClock(session.endAt)}
                  </span>
                </div>
                <p className="truncate text-xs opacity-85">{session.roomNo || 'No room'}</p>
              </button>
            ))}

            {isToday ? (
              <div
                className="pointer-events-none absolute right-0 left-0 z-10 flex items-center"
                style={{ top: nowTop }}
              >
                <div className="h-px flex-1 bg-[#ff3b30]" />
                <div className="size-2.5 shrink-0 rounded-full bg-[#ff3b30]" />
              </div>
            ) : null}
          </div>

          <div
            className="relative w-24 shrink-0 border-l border-line bg-paper/40"
            style={{ height: HOURS.length * HOUR_HEIGHT }}
          >
            {HOURS.map((hour) => (
              <div
                key={hour}
                className={`absolute right-3 -translate-y-1/2 text-right text-xs text-ink/55 ${
                  isToday && Math.abs(hour * HOUR_HEIGHT - nowTop) < 14 ? 'opacity-0' : ''
                }`}
                style={{ top: hour * HOUR_HEIGHT }}
              >
                {formatHourLabel(hour)}
              </div>
            ))}
            {isToday ? (
              <div
                className="pointer-events-none absolute right-3 -translate-y-1/2 text-right text-xs font-medium text-[#ff3b30]"
                style={{ top: nowTop }}
              >
                {formatHourLabel(now.getHours(), now.getMinutes())}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
