import { useEffect, useState } from 'react'
import type { ClassInput, ClassSession, RepeatMode, Subject } from '@shared/types'

interface ClassFormModalProps {
  open: boolean
  date: string
  subjects: Subject[]
  editing: ClassSession | null
  defaultStartTime?: string
  defaultEndTime?: string
  onClose: () => void
  onSave: (input: ClassInput) => Promise<void>
}

const emptyForm = {
  subjectId: 0,
  startTime: '09:00',
  endTime: '10:00',
  roomNo: '',
  repeatMode: 'once' as RepeatMode,
  repeatUntil: ''
}

function weekdayName(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { weekday: 'long' })
}

export function ClassFormModal({
  open,
  date,
  subjects,
  editing,
  defaultStartTime = '09:00',
  defaultEndTime = '10:00',
  onClose,
  onSave
}: ClassFormModalProps): React.JSX.Element | null {
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }
    if (editing) {
      setForm({
        subjectId: editing.subjectId,
        startTime: editing.startAt.slice(11, 16),
        endTime: editing.endAt.slice(11, 16),
        roomNo: editing.roomNo,
        repeatMode: 'once',
        repeatUntil: ''
      })
    } else {
      setForm({
        ...emptyForm,
        subjectId: subjects[0]?.id ?? 0,
        startTime: defaultStartTime,
        endTime: defaultEndTime,
        repeatUntil: date
      })
    }
    setError('')
  }, [open, editing, subjects, date, defaultStartTime, defaultEndTime])

  if (!open) {
    return null
  }

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave({ ...form, date })
      onClose()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save class')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <form
        onSubmit={submit}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-panel p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">{editing ? 'Edit class' : 'New class'}</h2>
            <p className="text-sm text-ink/55">{date}</p>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-ink/50 hover:text-ink">
            Close
          </button>
        </div>

        {subjects.length === 0 ? (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Add a subject first on the Subjects page.
          </p>
        ) : (
          <div className="grid gap-4">
            <label className="grid gap-1 text-sm">
              Subject
              <select
                required
                value={form.subjectId}
                onChange={(event) => setForm({ ...form, subjectId: Number(event.target.value) })}
                className="rounded-lg border border-line bg-white px-3 py-2"
              >
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-sm">
                Starts
                <input
                  type="time"
                  required
                  value={form.startTime}
                  onChange={(event) => setForm({ ...form, startTime: event.target.value })}
                  className="rounded-lg border border-line bg-white px-3 py-2"
                />
              </label>
              <label className="grid gap-1 text-sm">
                Ends
                <input
                  type="time"
                  required
                  value={form.endTime}
                  onChange={(event) => setForm({ ...form, endTime: event.target.value })}
                  className="rounded-lg border border-line bg-white px-3 py-2"
                />
              </label>
            </div>

            {!editing ? (
              <fieldset className="grid gap-2 rounded-xl border border-line p-3">
                <legend className="px-1 text-sm">Repeat</legend>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="repeat"
                    checked={form.repeatMode === 'once'}
                    onChange={() => setForm({ ...form, repeatMode: 'once' })}
                  />
                  Only once
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="repeat"
                    checked={form.repeatMode === 'until'}
                    onChange={() => setForm({ ...form, repeatMode: 'until' })}
                  />
                  Repeat every {weekdayName(date)} until
                </label>
                {form.repeatMode === 'until' ? (
                  <input
                    type="date"
                    required
                    min={date}
                    value={form.repeatUntil}
                    onChange={(event) => setForm({ ...form, repeatUntil: event.target.value })}
                    className="rounded-lg border border-line bg-white px-3 py-2"
                  />
                ) : null}
              </fieldset>
            ) : null}

            <label className="grid gap-1 text-sm">
              Room No.
              <input
                value={form.roomNo}
                onChange={(event) => setForm({ ...form, roomNo: event.target.value })}
                className="rounded-lg border border-line bg-white px-3 py-2"
                placeholder="B-204"
              />
            </label>
          </div>
        )}

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || subjects.length === 0}
            className="rounded-lg bg-forest px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : editing ? 'Save' : 'Add'}
          </button>
        </div>
      </form>
    </div>
  )
}
