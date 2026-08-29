import type { AttendanceStatus } from '@shared/types'

export { classHasTakenPlace } from '@shared/time'

export type AttendanceTone = 'green' | 'yellow' | 'red' | 'neutral'

export function attendanceTone(percentage: number | null): AttendanceTone {
  if (percentage === null) {
    return 'neutral'
  }
  if (percentage >= 75) {
    return 'green'
  }
  if (percentage >= 40) {
    return 'yellow'
  }
  return 'red'
}

export function toneClass(tone: AttendanceTone): string {
  switch (tone) {
    case 'green':
      return 'text-emerald-700'
    case 'yellow':
      return 'text-amber-600'
    case 'red':
      return 'text-red-600'
    default:
      return 'text-ink/50'
  }
}

export function formatPercent(percentage: number | null): string {
  return percentage === null ? '—' : `${percentage}%`
}

export function eventColor(status: AttendanceStatus, isHoliday: boolean): string {
  if (isHoliday) {
    return '#8ecae6'
  }
  if (status === 'ATTENDED') {
    return '#2f6f52'
  }
  if (status === 'NOT_ATTENDED') {
    return '#c0392b'
  }
  if (status === 'CANCELED') {
    return '#d4a017'
  }
  return '#3478f6'
}

export function formatClock(iso: string): string {
  const time = iso.slice(11, 16)
  const [hours, minutes] = time.split(':').map(Number)
  return formatHourLabel(hours, minutes)
}

export function formatHourLabel(hours: number, minutes = 0): string {
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 || 12
  return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`
}

export function padTime(hours: number, minutes = 0): string {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function minutesFromMidnight(iso: string): number {
  const hours = Number(iso.slice(11, 13))
  const minutes = Number(iso.slice(14, 16))
  return hours * 60 + minutes
}

export function isSameLocalDate(date: string, compare = new Date()): boolean {
  const year = compare.getFullYear()
  const month = String(compare.getMonth() + 1).padStart(2, '0')
  const day = String(compare.getDate()).padStart(2, '0')
  return date === `${year}-${month}-${day}`
}

export function todayDate(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}
