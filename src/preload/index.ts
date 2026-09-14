import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { HeimaApi } from '../shared/types'

// 界面可调用的接口（与 src/shared/types.ts 中的 HeimaApi 保持一致）
const api: HeimaApi = {
  addRecord: (input) => ipcRenderer.invoke('records:add', input),
  updateRecord: (id, input) => ipcRenderer.invoke('records:update', id, input),
  deleteRecord: (id) => ipcRenderer.invoke('records:delete', id),
  listRecords: (params) => ipcRenderer.invoke('records:list', params),
  getCategories: (type) => ipcRenderer.invoke('categories:list', type),
  addCategory: (type, parentId, name) => ipcRenderer.invoke('categories:add', type, parentId, name),
  renameCategory: (id, name) => ipcRenderer.invoke('categories:rename', id, name),
  deleteCategory: (id) => ipcRenderer.invoke('categories:delete', id),
  getMonthlySummary: (month) => ipcRenderer.invoke('stats:monthly', month),
  getCategoryPie: (month, type) => ipcRenderer.invoke('stats:pie', month, type),
  getTrend: (months) => ipcRenderer.invoke('stats:trend', months),
  getDataInfo: () => ipcRenderer.invoke('data:info'),
  openDataDir: () => ipcRenderer.invoke('data:open-dir'),
  exportBackup: () => ipcRenderer.invoke('data:export')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
