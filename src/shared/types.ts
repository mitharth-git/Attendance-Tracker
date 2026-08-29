export type AttendanceStatus = 'SCHEDULED' | 'ATTENDED' | 'NOT_ATTENDED' | 'CANCELED'
export type RepeatMode = 'once' | 'until'
export type PageId = 'subjects' | 'classes' | 'summary'

export interface Subject {
  id: number
  name: string
  teacherName: string
  semester: string
  phoneNumber: string
}

export interface SubjectInput {
  name: string
  teacherName: string
  semester: string
  phoneNumber: string
}

export interface Holiday {
  date: string
  name: string
  groupId: string | null
}

export interface HolidayInput {
  name: string
  dates: string[]
}

export interface ClassSession {
  id: number
  subjectId: number
  subjectName: string
  startAt: string
  endAt: string
  roomNo: string
  attendanceStatus: AttendanceStatus
  reason: string | null
  isHoliday: boolean
  holidayName: string | null
  seriesId: string | null
}

export interface ClassInput {
  subjectId: number
  date: string
  startTime: string
  endTime: string
  roomNo: string
  repeatMode: RepeatMode
  repeatUntil: string
}

export interface AttendanceUpdate {
  status: AttendanceStatus
  reason: string
}

export interface AbsenceReason {
  id: number
  date: string
  subjectName: string
  reason: string
}

export interface SubjectAttendance {
  subjectId: number
  subjectName: string
  attended: number
  missed: number
  percentage: number | null
  reasons: AbsenceReason[]
}

export interface MonthSummary {
  year: number
  month: number
  attended: number
  missed: number
  canceled: number
  holidays: number
  overallPercentage: number | null
  subjects: SubjectAttendance[]
  notAttendedReasons: AbsenceReason[]
}

export interface AppApi {
  listSubjects: () => Promise<Subject[]>
  createSubject: (input: SubjectInput) => Promise<Subject>
  updateSubject: (id: number, input: SubjectInput) => Promise<Subject>
  deleteSubject: (id: number) => Promise<void>
  listClasses: (start: string, end: string) => Promise<ClassSession[]>
  createClass: (input: ClassInput) => Promise<ClassSession[]>
  updateClass: (id: number, input: ClassInput) => Promise<ClassSession>
  deleteClass: (id: number) => Promise<void>
  setAttendance: (id: number, update: AttendanceUpdate) => Promise<ClassSession>
  listHolidays: (start: string, end: string) => Promise<Holiday[]>
  saveHolidays: (input: HolidayInput) => Promise<Holiday[]>
  removeHolidayDate: (date: string) => Promise<void>
  getMonthSummary: (year: number, month: number) => Promise<MonthSummary>
}
