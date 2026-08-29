import { ipcMain } from 'electron'
import type { AttendanceUpdate, ClassInput, HolidayInput, SubjectInput } from '@shared/types'
import {
  createClass,
  createSubject,
  deleteClass,
  deleteSubject,
  getMonthSummary,
  listClasses,
  listHolidays,
  listSubjects,
  removeHolidayDate,
  saveHolidays,
  setAttendance,
  updateClass,
  updateSubject
} from './db'

function handle<T>(fn: () => T): T {
  try {
    return fn()
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Unexpected database error')
  }
}

export function registerIpc(): void {
  ipcMain.handle('subjects:list', () => handle(() => listSubjects()))
  ipcMain.handle('subjects:create', (_event, input: SubjectInput) => handle(() => createSubject(input)))
  ipcMain.handle('subjects:update', (_event, id: number, input: SubjectInput) =>
    handle(() => updateSubject(id, input))
  )
  ipcMain.handle('subjects:delete', (_event, id: number) => handle(() => deleteSubject(id)))
  ipcMain.handle('classes:list', (_event, start: string, end: string) =>
    handle(() => listClasses(start, end))
  )
  ipcMain.handle('classes:create', (_event, input: ClassInput) => handle(() => createClass(input)))
  ipcMain.handle('classes:update', (_event, id: number, input: ClassInput) =>
    handle(() => updateClass(id, input))
  )
  ipcMain.handle('classes:delete', (_event, id: number) => handle(() => deleteClass(id)))
  ipcMain.handle('classes:attendance', (_event, id: number, update: AttendanceUpdate) =>
    handle(() => setAttendance(id, update))
  )
  ipcMain.handle('holidays:list', (_event, start: string, end: string) =>
    handle(() => listHolidays(start, end))
  )
  ipcMain.handle('holidays:save', (_event, input: HolidayInput) => handle(() => saveHolidays(input)))
  ipcMain.handle('holidays:remove', (_event, date: string) => handle(() => removeHolidayDate(date)))
  ipcMain.handle('summary:month', (_event, year: number, month: number) =>
    handle(() => getMonthSummary(year, month))
  )
}
