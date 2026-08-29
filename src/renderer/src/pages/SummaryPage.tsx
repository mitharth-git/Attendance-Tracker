import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AbsenceReason, MonthSummary } from '@shared/types'
import { attendanceTone, formatPercent, toneClass } from '../lib/attendance'

function monthValue(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

function Reasons({ items }: { items: AbsenceReason[] }): React.JSX.Element {
  if (items.length === 0) {
    return <p className="text-sm text-ink/45">No missed-class reasons recorded.</p>
  }
  return (
    <ul className="mt-2 space-y-2">
      {items.map((item) => (
        <li key={item.id} className="rounded-lg bg-paper px-3 py-2 text-sm">
          <span className="font-medium">{item.subjectName}</span>
          <span className="text-ink/45"> · {item.date}</span>
          <p className="text-ink/75">{item.reason}</p>
        </li>
      ))}
    </ul>
  )
}

export function SummaryPage(): React.JSX.Element {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [summary, setSummary] = useState<MonthSummary | null>(null)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await window.api.getMonthSummary(year, month)
      setSummary(data)
      setUpdatedAt(new Date())
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load summary')
    }
  }, [year, month])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), 10_000)
    const onFocus = (): void => {
      void load()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [load])

  const overallTone = attendanceTone(summary?.overallPercentage ?? null)
  const showOverallReasons = overallTone === 'green' || overallTone === 'yellow'

  const monthLabel = useMemo(() => {
    return new Date(year, month - 1, 1).toLocaleString(undefined, {
      month: 'long',
      year: 'numeric'
    })
  }, [year, month])

  return (
    <div className="mx-auto h-full max-w-5xl overflow-auto p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Summary</h2>
          <p className="text-sm text-ink/55">
            Live attendance for classes that have already taken place. Canceled classes and holidays
            are excluded from percentages.
          </p>
          {updatedAt ? (
            <p className="mt-1 text-xs text-ink/40">
              Updated {updatedAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
            </p>
          ) : null}
        </div>
        <div className="flex items-end gap-2">
          <label className="grid gap-1 text-sm">
            Month
            <input
              type="month"
              value={monthValue(year, month)}
              onChange={(event) => {
                const [nextYear, nextMonth] = event.target.value.split('-').map(Number)
                setYear(nextYear)
                setMonth(nextMonth)
              }}
              className="rounded-lg border border-line bg-white px-3 py-2"
            />
          </label>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg bg-forest px-3 py-2 text-sm text-white"
          >
            Refresh
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {summary ? (
        <div className="grid gap-4">
          <section className="rounded-2xl bg-panel p-5 shadow-sm">
            <p className="text-xs tracking-wide text-ink/45 uppercase">{monthLabel}</p>
            <p className={`mt-1 text-4xl font-semibold ${toneClass(overallTone)}`}>
              {formatPercent(summary.overallPercentage)}
            </p>
            <p className="mt-1 text-sm text-ink/55">
              Overall attendance · {summary.attended} attended · {summary.missed} missed ·{' '}
              {summary.canceled} canceled · {summary.holidays} holidays
            </p>
            {showOverallReasons ? (
              <div className="mt-4">
                <h3 className="text-sm font-medium">Reasons for not attending</h3>
                <Reasons items={summary.notAttendedReasons} />
              </div>
            ) : null}
          </section>

          <section className="grid gap-3">
            {summary.subjects.length === 0 ? (
              <p className="text-sm text-ink/50">Add subjects to see per-course attendance.</p>
            ) : (
              summary.subjects.map((subject) => {
                const tone = attendanceTone(subject.percentage)
                const showReasons = tone === 'green' || tone === 'yellow'
                return (
                  <article key={subject.subjectId} className="rounded-2xl bg-panel p-5 shadow-sm">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-medium">{subject.subjectName}</h3>
                      <p className={`text-2xl font-semibold ${toneClass(tone)}`}>
                        {formatPercent(subject.percentage)}
                      </p>
                    </div>
                    <p className="text-sm text-ink/50">
                      {subject.attended} attended · {subject.missed} missed
                    </p>
                    {showReasons ? (
                      <div className="mt-3">
                        <h4 className="text-sm font-medium">Reasons for not attending</h4>
                        <Reasons items={subject.reasons} />
                      </div>
                    ) : null}
                  </article>
                )
              })
            )}
          </section>
        </div>
      ) : (
        <p className="text-sm text-ink/50">Loading…</p>
      )}
    </div>
  )
}
