import { app } from 'electron'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import Database from 'better-sqlite3'
import { SCHEMA } from './schema'
import type {
  AbsenceReason,
  AttendanceStatus,
  AttendanceUpdate,
  ClassInput,
  ClassSession,
  Holiday,
  HolidayInput,
  MonthSummary,
  Subject,
  SubjectAttendance,
  SubjectInput
} from '@shared/types'
import { classHasTakenPlace } from '@shared/time'

let db: Database.Database

interface SubjectRow {
  id: number
  name: string
  teacher_name: string
  semester: string
  phone_number: string
}

interface ClassRow {
  id: number
  subject_id: number
  subject_name: string
  start_at: string
  end_at: string
  room_no: string
  attendance_status: AttendanceStatus
  reason: string | null
  holiday_name: string | null
  series_id: string | null
}

interface HolidayRow {
  date: string
  name: string
  group_id: string | null
}

const CLASS_SELECT = `
  SELECT c.id, c.subject_id, s.name AS subject_name, c.start_at, c.end_at, c.room_no,
         c.attendance_status, c.reason, c.series_id, h.name AS holiday_name
  FROM class_sessions c
  JOIN subjects s ON s.id = c.subject_id
  LEFT JOIN holidays h ON h.date = substr(c.start_at, 1, 10)
`

function mapSubject(row: SubjectRow): Subject {
  return {
    id: row.id,
    name: row.name,
    teacherName: row.teacher_name,
    semester: row.semester,
    phoneNumber: row.phone_number
  }
}

function mapClass(row: ClassRow): ClassSession {
  return {
    id: row.id,
    subjectId: row.subject_id,
    subjectName: row.subject_name,
    startAt: row.start_at,
    endAt: row.end_at,
    roomNo: row.room_no,
    attendanceStatus: row.attendance_status,
    reason: row.reason,
    isHoliday: Boolean(row.holiday_name),
    holidayName: row.holiday_name,
    seriesId: row.series_id
  }
}

function mapHoliday(row: HolidayRow): Holiday {
  return { date: row.date, name: row.name, groupId: row.group_id }
}

function combineDateAndTime(date: string, time: string): string {
  const normalized = time.length === 5 ? `${time}:00` : time
  return `${date}T${normalized}`
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number)
  const next = new Date(year, month - 1, day)
  next.setDate(next.getDate() + days)
  const y = next.getFullYear()
  const m = String(next.getMonth() + 1).padStart(2, '0')
  const d = String(next.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function eachWeeklyDate(startDate: string, untilDate: string): string[] {
  const dates: string[] = []
  let current = startDate
  while (current <= untilDate) {
    dates.push(current)
    current = addDays(current, 7)
  }
  return dates
}

function holidayNameForDate(date: string): string | null {
  const row = db.prepare('SELECT name FROM holidays WHERE date = ?').get(date) as
    | { name: string }
    | undefined
  return row?.name ?? null
}

function cancelClassesOnDate(date: string, holidayName: string): void {
  db.prepare(
    `UPDATE class_sessions
     SET attendance_status = 'CANCELED', reason = ?
     WHERE substr(start_at, 1, 10) = ?`
  ).run(holidayName, date)
}

function restoreHolidayCancellations(date: string, holidayName: string): void {
  db.prepare(
    `UPDATE class_sessions
     SET attendance_status = 'SCHEDULED', reason = NULL
     WHERE substr(start_at, 1, 10) = ?
       AND attendance_status = 'CANCELED'
       AND reason = ?`
  ).run(date, holidayName)
}

function getSubject(id: number): Subject {
  const row = db.prepare('SELECT * FROM subjects WHERE id = ?').get(id) as SubjectRow | undefined
  if (!row) {
    throw new Error('Subject not found')
  }
  return mapSubject(row)
}

function getClass(id: number): ClassSession {
  const row = db.prepare(`${CLASS_SELECT} WHERE c.id = ?`).get(id) as ClassRow | undefined
  if (!row) {
    throw new Error('Class not found')
  }
  return mapClass(row)
}

function validateClassInput(input: ClassInput): void {
  if (!input.subjectId) {
    throw new Error('Subject is required')
  }
  if (!input.date || !input.startTime || !input.endTime) {
    throw new Error('Date and times are required')
  }
  if (input.endTime <= input.startTime) {
    throw new Error('End time must be after start time')
  }
  if (input.repeatMode === 'until' && (!input.repeatUntil || input.repeatUntil < input.date)) {
    throw new Error('Repeat-until date must be on or after the class date')
  }
}

function insertSession(input: ClassInput, date: string, seriesId: string | null): number {
  const holidayName = holidayNameForDate(date)
  const result = db
    .prepare(
      `INSERT INTO class_sessions (
        subject_id, start_at, end_at, room_no, attendance_status, reason, series_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.subjectId,
      combineDateAndTime(date, input.startTime),
      combineDateAndTime(date, input.endTime),
      input.roomNo.trim(),
      holidayName ? 'CANCELED' : 'SCHEDULED',
      holidayName,
      seriesId
    )
  return Number(result.lastInsertRowid)
}

function rebuildClassSessionsIfNeeded(): void {
  const table = db
    .prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'class_sessions'`)
    .get() as { sql: string } | undefined
  if (!table) {
    return
  }

  const columns = db.prepare('PRAGMA table_info(class_sessions)').all() as { name: string }[]
  const names = new Set(columns.map((column) => column.name))
  const needsRebuild = names.has('is_holiday') || !table.sql.includes('SCHEDULED')
  if (!needsRebuild) {
    return
  }

  db.exec(`
    CREATE TABLE class_sessions_migrated (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL,
      start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      room_no TEXT NOT NULL DEFAULT '',
      attendance_status TEXT NOT NULL CHECK (
        attendance_status IN ('SCHEDULED', 'ATTENDED', 'NOT_ATTENDED', 'CANCELED')
      ),
      reason TEXT,
      series_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );
    INSERT INTO class_sessions_migrated (
      id, subject_id, start_at, end_at, room_no, attendance_status, reason, series_id, created_at
    )
    SELECT id, subject_id, start_at, end_at, room_no, attendance_status, reason, series_id, created_at
    FROM class_sessions;
    DROP TABLE class_sessions;
    ALTER TABLE class_sessions_migrated RENAME TO class_sessions;
    CREATE INDEX IF NOT EXISTS idx_class_sessions_start ON class_sessions(start_at);
    CREATE INDEX IF NOT EXISTS idx_class_sessions_subject ON class_sessions(subject_id);
    CREATE INDEX IF NOT EXISTS idx_class_sessions_series ON class_sessions(series_id);
  `)
}

export function initDatabase(): void {
  const userData = app.getPath('userData')
  if (!existsSync(userData)) {
    mkdirSync(userData, { recursive: true })
  }

  db = new Database(join(userData, 'attendance.sqlite'))
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(SCHEMA)
  rebuildClassSessionsIfNeeded()
}

export function listSubjects(): Subject[] {
  const rows = db
    .prepare('SELECT * FROM subjects ORDER BY name COLLATE NOCASE')
    .all() as SubjectRow[]
  return rows.map(mapSubject)
}

export function createSubject(input: SubjectInput): Subject {
  const result = db
    .prepare(
      `INSERT INTO subjects (name, teacher_name, semester, phone_number)
       VALUES (?, ?, ?, ?)`
    )
    .run(input.name.trim(), input.teacherName.trim(), input.semester.trim(), input.phoneNumber.trim())
  return getSubject(Number(result.lastInsertRowid))
}

export function updateSubject(id: number, input: SubjectInput): Subject {
  const result = db
    .prepare(
      `UPDATE subjects
       SET name = ?, teacher_name = ?, semester = ?, phone_number = ?
       WHERE id = ?`
    )
    .run(
      input.name.trim(),
      input.teacherName.trim(),
      input.semester.trim(),
      input.phoneNumber.trim(),
      id
    )
  if (result.changes === 0) {
    throw new Error('Subject not found')
  }
  return getSubject(id)
}

export function deleteSubject(id: number): void {
  const result = db.prepare('DELETE FROM subjects WHERE id = ?').run(id)
  if (result.changes === 0) {
    throw new Error('Subject not found')
  }
}

export function listClasses(start: string, end: string): ClassSession[] {
  const rows = db
    .prepare(`${CLASS_SELECT} WHERE c.start_at >= ? AND c.start_at < ? ORDER BY c.start_at`)
    .all(start, end) as ClassRow[]
  return rows.map(mapClass)
}

export function createClass(input: ClassInput): ClassSession[] {
  validateClassInput(input)
  getSubject(input.subjectId)

  const dates =
    input.repeatMode === 'until' ? eachWeeklyDate(input.date, input.repeatUntil) : [input.date]
  const seriesId = dates.length > 1 ? crypto.randomUUID() : null

  const insertMany = db.transaction(() => dates.map((date) => insertSession(input, date, seriesId)))
  return insertMany().map((id) => getClass(id))
}

export function updateClass(id: number, input: ClassInput): ClassSession {
  validateClassInput(input)
  getSubject(input.subjectId)
  const current = getClass(id)
  const holidayName = holidayNameForDate(input.date)

  const result = db
    .prepare(
      `UPDATE class_sessions
       SET subject_id = ?, start_at = ?, end_at = ?, room_no = ?,
           attendance_status = ?, reason = ?
       WHERE id = ?`
    )
    .run(
      input.subjectId,
      combineDateAndTime(input.date, input.startTime),
      combineDateAndTime(input.date, input.endTime),
      input.roomNo.trim(),
      holidayName ? 'CANCELED' : current.attendanceStatus,
      holidayName ?? current.reason,
      id
    )

  if (result.changes === 0) {
    throw new Error('Class not found')
  }
  return getClass(id)
}

export function deleteClass(id: number): void {
  const result = db.prepare('DELETE FROM class_sessions WHERE id = ?').run(id)
  if (result.changes === 0) {
    throw new Error('Class not found')
  }
}

export function setAttendance(id: number, update: AttendanceUpdate): ClassSession {
  const current = getClass(id)
  if (current.isHoliday) {
    throw new Error('This class is on a holiday and stays canceled')
  }
  if (!classHasTakenPlace(current.endAt)) {
    throw new Error("Class hasn't took place")
  }
  if (update.status === 'SCHEDULED') {
    throw new Error('Choose attended, not attended, or canceled')
  }
  if (
    (update.status === 'NOT_ATTENDED' || update.status === 'CANCELED') &&
    !update.reason.trim()
  ) {
    throw new Error('A reason is required for missed or canceled classes')
  }

  const result = db
    .prepare(
      `UPDATE class_sessions
       SET attendance_status = ?, reason = ?
       WHERE id = ?`
    )
    .run(
      update.status,
      update.status === 'ATTENDED' ? null : update.reason.trim(),
      id
    )
  if (result.changes === 0) {
    throw new Error('Class not found')
  }
  return getClass(id)
}

export function listHolidays(start: string, end: string): Holiday[] {
  const rows = db
    .prepare(
      `SELECT date, name, group_id FROM holidays
       WHERE date >= ? AND date < ?
       ORDER BY date`
    )
    .all(start.slice(0, 10), end.slice(0, 10)) as HolidayRow[]
  return rows.map(mapHoliday)
}

export function saveHolidays(input: HolidayInput): Holiday[] {
  const name = input.name.trim()
  if (!name) {
    throw new Error('Name of holiday is required')
  }
  const dates = [...new Set(input.dates)].sort()
  if (dates.length === 0) {
    throw new Error('Select at least one date')
  }

  const groupId = dates.length > 1 ? crypto.randomUUID() : null
  const apply = db.transaction(() => {
    for (const date of dates) {
      const existing = holidayNameForDate(date)
      if (existing) {
        restoreHolidayCancellations(date, existing)
      }
      db.prepare(
        `INSERT INTO holidays (date, name, group_id)
         VALUES (?, ?, ?)
         ON CONFLICT(date) DO UPDATE SET name = excluded.name, group_id = excluded.group_id`
      ).run(date, name, groupId)
      cancelClassesOnDate(date, name)
    }
  })
  apply()
  return dates.map((date) => ({ date, name, groupId }))
}

export function removeHolidayDate(date: string): void {
  const existing = holidayNameForDate(date)
  if (!existing) {
    return
  }
  const apply = db.transaction(() => {
    restoreHolidayCancellations(date, existing)
    db.prepare('DELETE FROM holidays WHERE date = ?').run(date)
  })
  apply()
}

function percentage(attended: number, missed: number): number | null {
  const total = attended + missed
  if (total === 0) {
    return null
  }
  return Math.round((attended / total) * 1000) / 10
}

export function getMonthSummary(year: number, month: number): MonthSummary {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const endMonth = month === 12 ? 1 : month + 1
  const endYear = month === 12 ? year + 1 : year
  const end = `${endYear}-${String(endMonth).padStart(2, '0')}-01`

  const sessions = listClasses(start, end)
  const holidayRows = listHolidays(start, end)
  const occurred = sessions.filter((session) => classHasTakenPlace(session.endAt))
  const countable = occurred.filter(
    (session) => !session.isHoliday && session.attendanceStatus !== 'SCHEDULED'
  )
  const canceled = countable.filter((session) => session.attendanceStatus === 'CANCELED')
  const attended = countable.filter((session) => session.attendanceStatus === 'ATTENDED')
  const missed = countable.filter((session) => session.attendanceStatus === 'NOT_ATTENDED')

  const toReason = (session: ClassSession): AbsenceReason => ({
    id: session.id,
    date: session.startAt.slice(0, 10),
    subjectName: session.subjectName,
    reason: session.reason ?? ''
  })

  const notAttendedReasons = missed.filter((session) => session.reason).map(toReason)

  const bySubject = new Map<number, ClassSession[]>()
  for (const session of countable) {
    const list = bySubject.get(session.subjectId) ?? []
    list.push(session)
    bySubject.set(session.subjectId, list)
  }

  const subjects: SubjectAttendance[] = listSubjects().map((subject) => {
    const subjectSessions = bySubject.get(subject.id) ?? []
    const subjectAttended = subjectSessions.filter((session) => session.attendanceStatus === 'ATTENDED')
    const subjectMissed = subjectSessions.filter((session) => session.attendanceStatus === 'NOT_ATTENDED')
    return {
      subjectId: subject.id,
      subjectName: subject.name,
      attended: subjectAttended.length,
      missed: subjectMissed.length,
      percentage: percentage(subjectAttended.length, subjectMissed.length),
      reasons: subjectMissed.filter((session) => session.reason).map(toReason)
    }
  })

  return {
    year,
    month,
    attended: attended.length,
    missed: missed.length,
    canceled: canceled.length,
    holidays: holidayRows.length,
    overallPercentage: percentage(attended.length, missed.length),
    subjects,
    notAttendedReasons
  }
}
