export function parseLocalDateTime(iso: string): Date {
  const [date, time = '00:00:00'] = iso.split('T')
  const [year, month, day] = date.split('-').map(Number)
  const [hours, minutes, seconds] = time.split(':').map(Number)
  return new Date(year, month - 1, day, hours || 0, minutes || 0, seconds || 0)
}

export function dateKey(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function classHasTakenPlace(endAt: string, now = new Date()): boolean {
  return parseLocalDateTime(endAt) <= now
}
