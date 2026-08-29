import { useEffect, useState } from 'react'
import type { AttendanceStatus, AttendanceUpdate, ClassSession } from '@shared/types'
import { eventColor, formatClock } from '../lib/attendance'
import { classHasTakenPlace } from '@shared/time'

interface EventActionsSheetProps {
  session: ClassSession | null
  onClose: () => void
  onEdit: (session: ClassSession) => void
  onDelete: (session: ClassSession) => Promise<void>
  onAttendance: (session: ClassSession, update: AttendanceUpdate) => Promise<void>
}

const statuses: { id: AttendanceStatus; label: string }[] = [
  { id: 'ATTENDED', label: 'ATTENDED' },
  { id: 'NOT_ATTENDED', label: 'NOT ATTENDED' },
  { id: 'CANCELED', label: 'CANCELED' }
]

export function EventActionsSheet({
  session,
  onClose,
  onEdit,
  onDelete,
  onAttendance
}: EventActionsSheetProps): React.JSX.Element | null {
  const [status, setStatus] = useState<AttendanceStatus>('ATTENDED')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!session) {
      return
    }
    setStatus(session.attendanceStatus === 'SCHEDULED' ? 'ATTENDED' : session.attendanceStatus)
    setReason(session.reason ?? '')
    setError('')
  }, [session])

  if (!session) {
    return null
  }

  const needsReason = status === 'NOT_ATTENDED' || status === 'CANCELED'
  const locked = session.isHoliday
  const notYet = !classHasTakenPlace(session.endAt)

  const current = session

  async function applyAttendance(): Promise<void> {
    setSaving(true)
    setError('')
    try {
      await onAttendance(current, { status, reason })
      onClose()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not update attendance')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-panel p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{session.subjectName}</h2>
            <p className="text-sm text-ink/55">
              {formatClock(session.startAt)} – {formatClock(session.endAt)}
              {session.roomNo ? ` · ${session.roomNo}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-ink/50 hover:text-ink">
            Close
          </button>
        </div>

        {locked ? (
          <p className="mb-4 rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-800">
            Holiday: {session.holidayName}. Classes on this day stay canceled.
          </p>
        ) : notYet ? (
          <p className="mb-4 rounded-xl bg-paper px-3 py-2 text-sm text-ink/70">
            Class hasn't took place
          </p>
        ) : (
          <div className="grid gap-2">
            {statuses.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setStatus(item.id)}
                className={`rounded-xl border px-3 py-2 text-left text-sm font-medium ${
                  status === item.id ? 'border-transparent text-white' : 'border-line bg-white'
                }`}
                style={
                  status === item.id
                    ? { backgroundColor: eventColor(item.id, false) }
                    : undefined
                }
              >
                {item.label}
              </button>
            ))}
            {needsReason ? (
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="mt-1 rounded-lg border border-line bg-white px-3 py-2 text-sm"
                placeholder="Reason"
              />
            ) : null}
            <button
              type="button"
              disabled={saving}
              onClick={() => void applyAttendance()}
              className="mt-1 rounded-lg bg-forest px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save attendance'}
            </button>
          </div>
        )}

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <div className="mt-5 grid grid-cols-2 gap-2 border-t border-line pt-4">
          <button
            type="button"
            onClick={() => {
              onClose()
              onEdit(session)
            }}
            className="rounded-lg border border-line px-3 py-2 text-sm"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={async () => {
              await onDelete(session)
              onClose()
            }}
            className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
