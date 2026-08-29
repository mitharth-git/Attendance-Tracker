import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { AppApi } from '@shared/types'

declare global {
  interface Window {
    electron: typeof electronAPI
    api: AppApi
  }
}

const api: AppApi = {
  listSubjects: () => ipcRenderer.invoke('subjects:list'),
  createSubject: (input) => ipcRenderer.invoke('subjects:create', input),
  updateSubject: (id, input) => ipcRenderer.invoke('subjects:update', id, input),
  deleteSubject: (id) => ipcRenderer.invoke('subjects:delete', id),
  listClasses: (start, end) => ipcRenderer.invoke('classes:list', start, end),
  createClass: (input) => ipcRenderer.invoke('classes:create', input),
  updateClass: (id, input) => ipcRenderer.invoke('classes:update', id, input),
  deleteClass: (id) => ipcRenderer.invoke('classes:delete', id),
  setAttendance: (id, update) => ipcRenderer.invoke('classes:attendance', id, update),
  listHolidays: (start, end) => ipcRenderer.invoke('holidays:list', start, end),
  saveHolidays: (input) => ipcRenderer.invoke('holidays:save', input),
  removeHolidayDate: (date) => ipcRenderer.invoke('holidays:remove', date),
  getMonthSummary: (year, month) => ipcRenderer.invoke('summary:month', year, month)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
