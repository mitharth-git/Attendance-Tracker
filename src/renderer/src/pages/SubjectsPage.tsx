import { useCallback, useEffect, useState } from 'react'
import type { Subject, SubjectInput } from '@shared/types'

const emptyForm: SubjectInput = {
  name: '',
  teacherName: '',
  semester: '',
  phoneNumber: ''
}

export function SubjectsPage(): React.JSX.Element {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [form, setForm] = useState<SubjectInput>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setSubjects(await window.api.listSubjects())
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    setError('')
    try {
      if (editingId) {
        await window.api.updateSubject(editingId, form)
      } else {
        await window.api.createSubject(form)
      }
      setForm(emptyForm)
      setEditingId(null)
      await load()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save subject')
    }
  }

  function startEdit(subject: Subject): void {
    setEditingId(subject.id)
    setForm({
      name: subject.name,
      teacherName: subject.teacherName,
      semester: subject.semester,
      phoneNumber: subject.phoneNumber
    })
  }

  return (
    <div className="mx-auto grid h-full max-w-5xl gap-6 overflow-auto p-6 lg:grid-cols-[340px_1fr]">
      <section className="rounded-2xl bg-panel p-5 shadow-sm">
        <h2 className="text-lg font-semibold">{editingId ? 'Edit subject' : 'Add subject'}</h2>
        <p className="mb-4 text-sm text-ink/55">Name, teacher, semester, and phone number.</p>
        <form className="grid gap-3" onSubmit={submit}>
          <label className="grid gap-1 text-sm">
            Subject name
            <input
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="rounded-lg border border-line bg-white px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Teacher’s name
            <input
              required
              value={form.teacherName}
              onChange={(event) => setForm({ ...form, teacherName: event.target.value })}
              className="rounded-lg border border-line bg-white px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Semester
            <input
              required
              value={form.semester}
              onChange={(event) => setForm({ ...form, semester: event.target.value })}
              className="rounded-lg border border-line bg-white px-3 py-2"
              placeholder="Fall 2026"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Phone number
            <input
              required
              value={form.phoneNumber}
              onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })}
              className="rounded-lg border border-line bg-white px-3 py-2"
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex gap-2 pt-1">
            {editingId ? (
              <button
                type="button"
                className="rounded-lg px-3 py-2 text-sm"
                onClick={() => {
                  setEditingId(null)
                  setForm(emptyForm)
                }}
              >
                Cancel
              </button>
            ) : null}
            <button type="submit" className="rounded-lg bg-forest px-4 py-2 text-sm text-white">
              {editingId ? 'Update' : 'Add subject'}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl bg-panel p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Subjects</h2>
        {subjects.length === 0 ? (
          <p className="mt-4 text-sm text-ink/50">No subjects yet. Add one to start tracking classes.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {subjects.map((subject) => (
              <li key={subject.id} className="flex items-start justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{subject.name}</p>
                  <p className="text-sm text-ink/60">{subject.teacherName}</p>
                  <p className="text-xs text-ink/45">
                    {subject.semester} · {subject.phoneNumber}
                  </p>
                </div>
                <div className="flex gap-2 text-sm">
                  <button type="button" className="text-forest" onClick={() => startEdit(subject)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-red-700"
                    onClick={async () => {
                      if (confirm(`Delete ${subject.name} and its classes?`)) {
                        await window.api.deleteSubject(subject.id)
                        if (editingId === subject.id) {
                          setEditingId(null)
                          setForm(emptyForm)
                        }
                        await load()
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
