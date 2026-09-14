import { reactive } from 'vue'

export interface ToastItem {
  id: number
  text: string
  type: 'success' | 'error'
}

export const toasts = reactive<ToastItem[]>([])

let seq = 0

/** 弹出轻提示，2.5 秒后自动消失 */
export function toast(text: string, type: 'success' | 'error' = 'success'): void {
  const id = ++seq
  toasts.push({ id, text, type })
  setTimeout(() => {
    const i = toasts.findIndex((t) => t.id === id)
    if (i >= 0) toasts.splice(i, 1)
  }, 2500)
}
