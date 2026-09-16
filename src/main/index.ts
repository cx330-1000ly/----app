import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {
  initDb,
  addRecord,
  updateRecord,
  deleteRecord,
  listRecords,
  getCategories,
  addCategory,
  renameCategory,
  deleteCategory,
  getMonthlySummary,
  getCategoryPie,
  getTrend,
  getDataInfo,
  exportBackup
} from './db'
import type { ListParams, RecordInput, RecordType } from '../shared/types'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 900,
    minHeight: 620,
    show: false,
    autoHideMenuBar: true,
    title: '记账APP',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // 开发调试：把界面内部的报错转发到日志
  mainWindow.webContents.on('console-message', (_e, _level, message) => {
    console.log('[界面]', message)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/** 注册界面可调用的全部接口 */
function registerIpc(): void {
  ipcMain.handle('records:add', (_e, input: RecordInput) => addRecord(input))
  ipcMain.handle('records:update', (_e, id: number, input: RecordInput) => updateRecord(id, input))
  ipcMain.handle('records:delete', (_e, id: number) => deleteRecord(id))
  ipcMain.handle('records:list', (_e, params: ListParams) => listRecords(params))
  ipcMain.handle('categories:list', (_e, type: RecordType) => getCategories(type))
  ipcMain.handle('categories:add', (_e, type: RecordType, parentId: number | null, name: string) =>
    addCategory(type, parentId, name)
  )
  ipcMain.handle('categories:rename', (_e, id: number, name: string) => renameCategory(id, name))
  ipcMain.handle('categories:delete', (_e, id: number) => deleteCategory(id))
  ipcMain.handle('stats:monthly', (_e, month: string) => getMonthlySummary(month))
  ipcMain.handle('stats:pie', (_e, month: string, type: RecordType) => getCategoryPie(month, type))
  ipcMain.handle('stats:trend', (_e, months: number) => getTrend(months))
  ipcMain.handle('data:info', () => getDataInfo())
  ipcMain.handle('data:open-dir', () => shell.openPath(app.getPath('userData')))
  ipcMain.handle('data:export', () => exportBackup())
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.heima.jizhang')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  try {
    await initDb()
  } catch (err) {
    dialog.showErrorBox(
      '记账APP启动失败',
      `无法初始化数据库：\n${err instanceof Error ? err.message : String(err)}`
    )
    app.quit()
    return
  }

  registerIpc()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
