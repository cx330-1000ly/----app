import { ElectronAPI } from '@electron-toolkit/preload'
import type { HeimaApi } from '../shared/types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: HeimaApi
  }
}
