/** 分 → 元字符串（保留两位小数，千分位） */
export function fmtCents(cents: number): string {
  return (cents / 100).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

/** 今天日期 'YYYY-MM-DD' */
export function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 当前月份 'YYYY-MM' */
export function thisMonth(): string {
  return today().slice(0, 7)
}

/** 月份显示：'2026-09' → '2026年9月' */
export function fmtMonth(month: string): string {
  const [y, m] = month.split('-')
  return `${y}年${Number(m)}月`
}

/** 提取后端返回的错误信息（去掉 IPC 包装前缀） */
export function errMsg(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)
  return raw.replace(/^Error invoking remote method '[^']+': Error: /, '')
}
