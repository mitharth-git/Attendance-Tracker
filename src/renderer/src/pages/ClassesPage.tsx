import { useCallback, useEffect, useMemo, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg, EventContentArg } from '@fullcalendar/core'
import type {
  AttendanceUpdate,
  ClassInput,
  ClassSession,
  Holiday,
  Subject
} from '@shared/types'
import { ClassFormModal } from '../components/ClassFormModal'
import { DaySchedule } from '../components/DaySchedule'
import { EventActionsSheet } from '../components/EventActionsSheet'
import { eventColor, formatClock, todayDate } from '../lib/attendance'
import { dateKey } from '@shared/time'

function localDateTime(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`
}

function nextDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const next = new Date(year, month - 1, day + 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
}

function eventContent(arg: EventContentArg): React.JSX.Element | true {
  const session = arg.event.extendedProps.session as ClassSession | undefined
  if (!session) {
    return true
  }
  return (
    <div className="px-1 leading-tight text-white">
      <div className="flex items-baseline justify-between gap-1">
        <span className="truncate text-[11px] font-semibold">{session.subjectName}</span>
        <span className="shrink-0 text-[9px] opacity-90">{formatClock(session.startAt)}</span>
      </div>
      <div className="truncate text-[10px] opacity-85">{session.roomNo || 'No room'}</div>
    </div>
  )
}

export function ClassesPage(): React.JSX.Element {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [sessions, setSessions] = useState<ClassSession[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [range, setRange] = useState<{ start: string; end: string } | null>(null)
  const [dayDate, setDayDate] = useState<string | null>(null)
  const [modalDate, setModalDate] = useState('')
  const [defaultStartTime, setDefaultStartTime] = useState('09:00')
  const [defaultEndTime, setDefaultEndTime] = useState('10:00')
  const [editing, setEditing] = useState<ClassSession | null>(null)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<ClassSession | null>(null)
  const [pickingHolidays, setPickingHolidays] = useState(false)
  const [pickedDates, setPickedDates] = useState<string[]>([])
  const [holidayGroupName, setHolidayGroupName] = useState('')
  const [holidayError, setHolidayError] = useState('')

  const loadSubjects = useCallback(async () => {
    setSubjects(await window.api.listSubjects())
  }, [])

  const loadRange = useCallback(async () => {
    if (!range) {
      return
    }
    const [nextSessions, nextHolidays] = await Promise.all([
      window.api.listClasses(range.start, range.end),
      window.api.listHolidays(range.start, range.end)
    ])
    setSessions(nextSessions)
    setHolidays(nextHolidays)
  }, [range])

  useEffect(() => {
    void loadSubjects()
  }, [loadSubjects])

  useEffect(() => {
    void loadRange()
  }, [loadRange])

  useEffect(() => {
    if (!dayDate) {
      return
    }
    setRange({
      start: `${dayDate}T00:00:00`,
      end: `${nextDate(dayDate)}T00:00:00`
    })
  }, [dayDate])

  const holidayDates = useMemo(() => new Set(holidays.map((holiday) => holiday.date)), [holidays])
  const pickedSet = useMemo(() => new Set(pickedDates), [pickedDates])
  const dayHoliday = holidays.find((holiday) => holiday.date === dayDate) ?? null

  const events = useMemo(() => {
    const classEvents = sessions.map((session) => ({
      id: String(session.id),
      title: session.subjectName,
      start: session.startAt,
      end: session.endAt,
      backgroundColor: eventColor(session.attendanceStatus, session.isHoliday),
      borderColor: eventColor(session.attendanceStatus, session.isHoliday),
      extendedProps: { session, kind: 'class' as const }
    }))
    const holidayEvents = holidays.map((holiday) => ({
      id: `holiday-${holiday.date}`,
      title: holiday.name,
      start: holiday.date,
      allDay: true,
      display: 'background' as const,
      backgroundColor: '#8ecae6',
      extendedProps: { kind: 'holiday' as const }
    }))
    return [...holidayEvents, ...classEvents]
  }, [sessions, holidays])

  function togglePicked(date: string): void {
    setPickedDates((current) =>
      current.includes(date) ? current.filter((item) => item !== date) : [...current, date]
    )
  }

  function openCreate(date: string, startTime = '09:00', endTime = '10:00'): void {
    setEditing(null)
    setModalDate(date)
    setDefaultStartTime(startTime)
    setDefaultEndTime(endTime)
    setOpen(true)
  }

  function openEdit(session: ClassSession): void {
    setEditing(session)
    setModalDate(session.startAt.slice(0, 10))
    setDefaultStartTime(session.startAt.slice(11, 16))
    setDefaultEndTime(session.endAt.slice(11, 16))
    setOpen(true)
  }

  function onEventClick(info: EventClickArg): void {
    info.jsEvent.preventDefault()
    info.jsEvent.stopPropagation()
    if (info.event.extendedProps.kind === 'holiday') {
      const date = info.event.startStr.slice(0, 10)
      if (pickingHolidays) {
        togglePicked(date)
      }
      return
    }
    const session = info.event.extendedProps.session as ClassSession
    if (pickingHolidays) {
      togglePicked(session.startAt.slice(0, 10))
      return
    }
    setSelected(session)
  }

  async function save(input: ClassInput): Promise<void> {
    if (editing) {
      await window.api.updateClass(editing.id, input)
    } else {
      await window.api.createClass(input)
    }
    await loadRange()
  }

  async function savePickedHolidays(): Promise<void> {
    setHolidayError('')
    try {
      await window.api.saveHolidays({ name: holidayGroupName, dates: pickedDates })
      setPickingHolidays(false)
      setPickedDates([])
      setHolidayGroupName('')
      await loadRange()
    } catch (error) {
      setHolidayError(error instanceof Error ? error.message : 'Could not save holidays')
    }
  }

  const modal = (
    <ClassFormModal
      open={open}
      date={modalDate}
      subjects={subjects}
      editing={editing}
      defaultStartTime={defaultStartTime}
      defaultEndTime={defaultEndTime}
      onClose={() => setOpen(false)}
      onSave={save}
    />
  )

  const sheet = (
    <EventActionsSheet
      session={selected}
      onClose={() => setSelected(null)}
      onEdit={openEdit}
      onDelete={async (session) => {
        await window.api.deleteClass(session.id)
        await loadRange()
      }}
      onAttendance={async (session, update: AttendanceUpdate) => {
        await window.api.setAttendance(session.id, update)
        await loadRange()
      }}
    />
  )

  if (dayDate) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <DaySchedule
          date={dayDate}
          sessions={sessions}
          holiday={dayHoliday}
          onBack={() => {
            setDayDate(null)
            setRange(null)
          }}
          onToday={() => setDayDate(todayDate())}
          onAdd={(startTime, endTime) => openCreate(dayDate, startTime, endTime)}
          onSelect={setSelected}
          onSaveHoliday={async (name) => {
            await window.api.saveHolidays({ name, dates: [dayDate] })
            await loadRange()
          }}
          onClearHoliday={async () => {
            await window.api.removeHolidayDate(dayDate)
            await loadRange()
          }}
        />
        {modal}
        {sheet}
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Classes</h2>
        <p className="text-sm text-ink/55">Click a day to open its schedule. Click a class to mark attendance.</p>
      </div>
      {pickingHolidays ? (
        <div className="mb-4 rounded-2xl border border-line bg-panel p-4">
          <p className="text-sm font-medium">Mark holidays</p>
          <p className="mb-3 text-sm text-ink/55">
            Click dates on the calendar to add them to this holiday. All classes on those days will be canceled.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid min-w-56 flex-1 gap-1 text-sm">
              Name of holiday
              <input
                value={holidayGroupName}
                onChange={(event) => setHolidayGroupName(event.target.value)}
                className="rounded-lg border border-line bg-white px-3 py-2"
              />
            </label>
            <button
              type="button"
              onClick={() => void savePickedHolidays()}
              className="rounded-lg bg-forest px-4 py-2 text-sm text-white"
            >
              Save {pickedDates.length} day{pickedDates.length === 1 ? '' : 's'}
            </button>
            <button
              type="button"
              onClick={() => {
                setPickingHolidays(false)
                setPickedDates([])
                setHolidayGroupName('')
                setHolidayError('')
              }}
              className="rounded-lg px-3 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
          {pickedDates.length > 0 ? (
            <p className="mt-2 text-xs text-ink/50">{pickedDates.slice().sort().join(', ')}</p>
          ) : null}
          {holidayError ? <p className="mt-2 text-sm text-red-600">{holidayError}</p> : null}
        </div>
      ) : null}
      <div className="rounded-2xl bg-panel p-4 shadow-sm">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'markHolidays' }}
          buttonText={{ today: 'Today' }}
          customButtons={{
            markHolidays: {
              text: 'Mark holidays',
              click: () => {
                setPickingHolidays(true)
                setHolidayError('')
              }
            }
          }}
          height="auto"
          events={events}
          datesSet={(info) => {
            if (dayDate) {
              return
            }
            setRange({
              start: localDateTime(info.start),
              end: localDateTime(info.end)
            })
          }}
          dateClick={(info) => {
            if (pickingHolidays) {
              togglePicked(info.dateStr)
              return
            }
            setDayDate(info.dateStr)
          }}
          eventClick={onEventClick}
          eventContent={eventContent}
          dayCellClassNames={(arg) => {
            const key = dateKey(arg.date)
            const classes: string[] = []
            if (holidayDates.has(key) || holidayDates.has(arg.dateStr)) {
              classes.push('holiday-day')
            }
            if (pickedSet.has(key) || pickedSet.has(arg.dateStr)) {
              classes.push('holiday-picked')
            }
            return classes
          }}
        />
      </div>
      {modal}
      {sheet}
    </div>
  )
}
