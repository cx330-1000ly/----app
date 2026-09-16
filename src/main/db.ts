import initSqlJs from 'sql.js'
import type { Database, SqlJsStatic } from 'sql.js'
import { app, dialog } from 'electron'
import { copyFileSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type {
  Category,
  DataInfo,
  ExportResult,
  ListParams,
  ListResult,
  MonthlySummary,
  PieSlice,
  RecordInput,
  RecordItem,
  RecordType,
  TrendPoint
} from '../shared/types'

let db: Database | null = null

/** 内置分类（与 CLAUDE.md 产品文档一致） */
const SEED_CATEGORIES: Record<RecordType, { name: string; children: string[] }[]> = {
  expense: [
    { name: '餐饮', children: ['早餐', '午餐', '晚餐', '外卖', '零食饮料', '咖啡奶茶', '聚餐请客'] },
    { name: '交通', children: ['公交地铁', '打车', '共享单车', '加油充电', '停车费', '长途出行'] },
    { name: '购物', children: ['服饰鞋包', '日用品', '数码电器', '美妆护肤', '母婴用品', '其他购物'] },
    { name: '居住', children: ['房租/房贷', '水电燃气', '物业费', '宽带话费', '家居维修', '家具家纺'] },
    { name: '娱乐', children: ['电影演出', '游戏', '运动健身', '旅行', 'KTV/酒吧', '其他娱乐'] },
    { name: '医疗', children: ['门诊', '购药', '住院', '体检', '保健'] },
    { name: '教育', children: ['书籍', '课程培训', '学费', '文具'] },
    { name: '人情', children: ['红包礼金', '送礼'] },
    { name: '其他', children: ['其他支出'] }
  ],
  income: [
    { name: '工资', children: ['基本工资', '奖金', '补贴'] },
    { name: '理财', children: ['利息', '基金股票收益'] },
    { name: '兼职', children: ['副业收入'] },
    { name: '红包', children: ['收到的红包礼金'] },
    { name: '其他', children: ['其他收入'] }
  ]
}

function dbPath(): string {
  return join(app.getPath('userData'), 'heima-jizhang.db')
}

/** 定位 SQLite 引擎文件（开发时在 node_modules，打包后在 resources） */
function findWasm(): string {
  const candidates = app.isPackaged
    ? [join(process.resourcesPath, 'sql-wasm.wasm')]
    : [
        join(app.getAppPath(), 'node_modules/sql.js/dist/sql-wasm.wasm'),
        join(app.getAppPath(), '..', 'node_modules/sql.js/dist/sql-wasm.wasm'),
        join(__dirname, '../../node_modules/sql.js/dist/sql-wasm.wasm')
      ]
  const found = candidates.find((p) => existsSync(p))
  if (!found) throw new Error('找不到 SQLite 引擎文件（sql-wasm.wasm）')
  return found
}

function requireDb(): Database {
  if (!db) throw new Error('数据库尚未初始化')
  return db
}

/** 启动时初始化：打开已有数据文件，或新建并写入内置分类 */
export async function initDb(): Promise<void> {
  const SQL: SqlJsStatic = await initSqlJs({ locateFile: () => findWasm() })
  const file = dbPath()
  if (existsSync(file)) {
    db = new SQL.Database(readFileSync(file))
  } else {
    db = new SQL.Database()
    createSchema()
    seedCategories()
  }
  createSchema() // 幂等，保证旧数据文件升级后表结构完整
  persist()
}

function createSchema(): void {
  const d = requireDb()
  d.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
    parent_id INTEGER,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    builtin INTEGER NOT NULL DEFAULT 0
  )`)
  d.run(`CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
    amount_cents INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  )`)
  d.run(`CREATE INDEX IF NOT EXISTS idx_records_date ON records(date)`)
}

function seedCategories(): void {
  const d = requireDb()
  d.run('BEGIN')
  try {
    for (const type of ['expense', 'income'] as RecordType[]) {
      SEED_CATEGORIES[type].forEach((parent, pi) => {
        d.run(
          'INSERT INTO categories (type, parent_id, name, sort_order, builtin) VALUES (?, NULL, ?, ?, 1)',
          [type, parent.name, pi]
        )
        const parentId = lastInsertId(d)
        parent.children.forEach((child, ci) => {
          d.run(
            'INSERT INTO categories (type, parent_id, name, sort_order, builtin) VALUES (?, ?, ?, ?, 1)',
            [type, parentId, child, ci]
          )
        })
      })
    }
    d.run('COMMIT')
  } catch (err) {
    d.run('ROLLBACK')
    throw err
  }
}

function lastInsertId(d: Database): number {
  const res = d.exec('SELECT last_insert_rowid() AS id')
  return Number(res[0].values[0][0])
}

/** 把内存数据写入硬盘（先写临时文件再改名，避免写一半损坏数据文件） */
export function persist(): void {
  const d = requireDb()
  const file = dbPath()
  const tmp = `${file}.tmp`
  writeFileSync(tmp, Buffer.from(d.export()))
  renameSync(tmp, file)
}

// ---------- 校验 ----------

function validateMonth(month: string): void {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('月份格式无效')
}

function getCategoryRow(id: number): { id: number; type: RecordType; parentId: number | null; name: string } | null {
  const d = requireDb()
  const res = d.exec('SELECT id, type, parent_id, name FROM categories WHERE id = ?', [id])
  if (!res.length || !res[0].values.length) return null
  const row = res[0].values[0]
  return {
    id: Number(row[0]),
    type: row[1] as RecordType,
    parentId: row[2] === null ? null : Number(row[2]),
    name: String(row[3])
  }
}

function validateInput(input: RecordInput): void {
  if (!input || (input.type !== 'expense' && input.type !== 'income')) throw new Error('收支类型无效')
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0 || input.amountCents > 999999999) {
    throw new Error('金额无效（需大于 0 且不超过 999 万元）')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error('日期格式无效')
  if (Number.isNaN(new Date(`${input.date}T00:00:00`).getTime())) throw new Error('日期无效')
  if (typeof input.note !== 'string' || input.note.length > 200) throw new Error('备注不能超过 200 字')
  const cat = getCategoryRow(input.categoryId)
  if (!cat) throw new Error('所选分类不存在')
  if (cat.type !== input.type) throw new Error('分类与收支类型不匹配')
}

// ---------- 记账记录 ----------

export function addRecord(input: RecordInput): number {
  const d = requireDb()
  validateInput(input)
  d.run(
    'INSERT INTO records (type, amount_cents, category_id, date, note) VALUES (?, ?, ?, ?, ?)',
    [input.type, input.amountCents, input.categoryId, input.date, input.note.trim()]
  )
  persist()
  return lastInsertId(d)
}

export function updateRecord(id: number, input: RecordInput): void {
  const d = requireDb()
  validateInput(input)
  const res = d.exec('SELECT id FROM records WHERE id = ?', [id])
  if (!res.length || !res[0].values.length) throw new Error('记录不存在')
  d.run(
    "UPDATE records SET type = ?, amount_cents = ?, category_id = ?, date = ?, note = ?, updated_at = datetime('now', 'localtime') WHERE id = ?",
    [input.type, input.amountCents, input.categoryId, input.date, input.note.trim(), id]
  )
  persist()
}

export function deleteRecord(id: number): void {
  const d = requireDb()
  const res = d.exec('SELECT id FROM records WHERE id = ?', [id])
  if (!res.length || !res[0].values.length) throw new Error('记录不存在')
  d.run('DELETE FROM records WHERE id = ?', [id])
  persist()
}

export function listRecords(params: ListParams): ListResult {
  const d = requireDb()
  const where: string[] = []
  const args: (string | number)[] = []
  if (params.month) {
    if (!/^\d{4}-\d{2}$/.test(params.month)) throw new Error('月份格式无效')
    where.push('r.date LIKE ?')
    args.push(`${params.month}%`)
  }
  if (params.type && params.type !== 'all') {
    where.push('r.type = ?')
    args.push(params.type)
  }
  if (params.parentCategoryId) {
    where.push('(c.parent_id = ? OR c.id = ?)')
    args.push(params.parentCategoryId, params.parentCategoryId)
  }
  const keyword = params.keyword?.trim()
  if (keyword) {
    where.push("(r.note LIKE ? OR printf('%.2f', r.amount_cents / 100.0) LIKE ?)")
    const kw = `%${keyword}%`
    args.push(kw, kw)
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const countRes = d.exec(
    `SELECT COUNT(*) AS n FROM records r JOIN categories c ON c.id = r.category_id ${whereSql}`,
    args
  )
  const total = Number(countRes[0].values[0][0])

  const page = Math.max(1, Math.floor(params.page || 1))
  const pageSize = Math.min(100, Math.max(1, Math.floor(params.pageSize || 20)))
  const listRes = d.exec(
    `SELECT r.id, r.type, r.amount_cents, r.category_id, r.date, r.note,
            c.name AS category_name, p.id AS parent_id, p.name AS parent_name
     FROM records r
     JOIN categories c ON c.id = r.category_id
     LEFT JOIN categories p ON p.id = c.parent_id
     ${whereSql}
     ORDER BY r.date DESC, r.id DESC
     LIMIT ? OFFSET ?`,
    [...args, pageSize, (page - 1) * pageSize]
  )
  const rows = listRes.length ? listRes[0].values : []
  const items: RecordItem[] = rows.map((row) => ({
    id: Number(row[0]),
    type: row[1] as RecordType,
    amountCents: Number(row[2]),
    categoryId: Number(row[3]),
    date: String(row[4]),
    note: String(row[5]),
    categoryName: String(row[6]),
    parentCategoryId: row[7] === null ? null : Number(row[7]),
    parentCategoryName: row[8] === null ? null : String(row[8])
  }))
  return { total, items }
}

// ---------- 分类管理 ----------

export function getCategories(type: RecordType): Category[] {
  if (type !== 'expense' && type !== 'income') throw new Error('类型无效')
  const d = requireDb()
  const res = d.exec(
    'SELECT id, type, parent_id, name, sort_order, builtin FROM categories WHERE type = ? ORDER BY sort_order, id',
    [type]
  )
  const rows = res.length ? res[0].values : []
  const flat: Category[] = rows.map((row) => ({
    id: Number(row[0]),
    type: row[1] as RecordType,
    parentId: row[2] === null ? null : Number(row[2]),
    name: String(row[3]),
    sortOrder: Number(row[4]),
    builtin: Number(row[5])
  }))
  const parents = flat.filter((c) => c.parentId === null)
  parents.forEach((p) => {
    p.children = flat.filter((c) => c.parentId === p.id)
  })
  return parents
}

function validateCategoryName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('分类名称不能为空')
  if (trimmed.length > 20) throw new Error('分类名称不能超过 20 个字')
  return trimmed
}

function ensureNoDuplicate(type: RecordType, parentId: number | null, name: string, excludeId?: number): void {
  const d = requireDb()
  const res = d.exec(
    'SELECT id FROM categories WHERE type = ? AND parent_id IS ? AND name = ?',
    [type, parentId, name]
  )
  const dup = res.length ? res[0].values : []
  if (dup.some((row) => Number(row[0]) !== excludeId)) {
    throw new Error(parentId === null ? '已存在同名大类' : '该大类下已存在同名小类')
  }
}

export function addCategory(type: RecordType, parentId: number | null, name: string): number {
  const d = requireDb()
  if (type !== 'expense' && type !== 'income') throw new Error('类型无效')
  const trimmed = validateCategoryName(name)
  if (parentId !== null) {
    const parent = getCategoryRow(parentId)
    if (!parent || parent.parentId !== null) throw new Error('上级分类无效')
    if (parent.type !== type) throw new Error('分类类型不匹配')
  }
  ensureNoDuplicate(type, parentId, trimmed)
  const orderRes = d.exec(
    'SELECT COALESCE(MAX(sort_order), -1) AS m FROM categories WHERE type = ? AND parent_id IS ?',
    [type, parentId]
  )
  const nextOrder = Number(orderRes[0].values[0][0]) + 1
  d.run('INSERT INTO categories (type, parent_id, name, sort_order, builtin) VALUES (?, ?, ?, ?, 0)', [
    type,
    parentId,
    trimmed,
    nextOrder
  ])
  persist()
  return lastInsertId(d)
}

export function renameCategory(id: number, name: string): void {
  const d = requireDb()
  const cat = getCategoryRow(id)
  if (!cat) throw new Error('分类不存在')
  const trimmed = validateCategoryName(name)
  ensureNoDuplicate(cat.type, cat.parentId, trimmed, id)
  d.run('UPDATE categories SET name = ? WHERE id = ?', [trimmed, id])
  persist()
}

export function deleteCategory(id: number): void {
  const d = requireDb()
  const cat = getCategoryRow(id)
  if (!cat) throw new Error('分类不存在')
  const childRes = d.exec('SELECT COUNT(*) AS n FROM categories WHERE parent_id = ?', [id])
  if (Number(childRes[0].values[0][0]) > 0) throw new Error('请先删除该分类下的小类')
  const usedRes = d.exec('SELECT COUNT(*) AS n FROM records WHERE category_id = ?', [id])
  if (Number(usedRes[0].values[0][0]) > 0) throw new Error('该分类下已有记账记录，不能删除')
  d.run('DELETE FROM categories WHERE id = ?', [id])
  persist()
}

// ---------- 统计 ----------

export function getMonthlySummary(month: string): MonthlySummary {
  validateMonth(month)
  const d = requireDb()
  const res = d.exec('SELECT type, COALESCE(SUM(amount_cents), 0) FROM records WHERE date LIKE ? GROUP BY type', [
    `${month}%`
  ])
  let expenseCents = 0
  let incomeCents = 0
  if (res.length) {
    for (const row of res[0].values) {
      if (row[0] === 'expense') expenseCents = Number(row[1])
      else incomeCents = Number(row[1])
    }
  }
  return { month, expenseCents, incomeCents, balanceCents: incomeCents - expenseCents }
}

export function getCategoryPie(month: string, type: RecordType): PieSlice[] {
  validateMonth(month)
  if (type !== 'expense' && type !== 'income') throw new Error('类型无效')
  const d = requireDb()
  const res = d.exec(
    `SELECT COALESCE(p.name, c.name) AS name, COALESCE(SUM(r.amount_cents), 0) AS total
     FROM records r
     JOIN categories c ON c.id = r.category_id
     LEFT JOIN categories p ON p.id = c.parent_id
     WHERE r.date LIKE ? AND r.type = ?
     GROUP BY COALESCE(p.id, c.id)
     ORDER BY total DESC`,
    [`${month}%`, type]
  )
  const rows = res.length ? res[0].values : []
  return rows
    .filter((row) => Number(row[1]) > 0)
    .map((row) => ({ name: String(row[0]), valueCents: Number(row[1]) }))
}

export function getTrend(months: number): TrendPoint[] {
  const n = Math.min(24, Math.max(1, Math.floor(months || 6)))
  const points: TrendPoint[] = []
  const now = new Date()
  const d = requireDb()
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const month = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`
    const res = d.exec('SELECT type, COALESCE(SUM(amount_cents), 0) FROM records WHERE date LIKE ? GROUP BY type', [
      `${month}%`
    ])
    let expenseCents = 0
    let incomeCents = 0
    if (res.length) {
      for (const row of res[0].values) {
        if (row[0] === 'expense') expenseCents = Number(row[1])
        else incomeCents = Number(row[1])
      }
    }
    points.push({ month, expenseCents, incomeCents })
  }
  return points
}

// ---------- 数据文件与备份 ----------

export function getDataInfo(): DataInfo {
  return { dir: app.getPath('userData'), file: dbPath(), exists: existsSync(dbPath()) }
}

export async function exportBackup(): Promise<ExportResult> {
  const now = new Date()
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: '导出数据备份',
    defaultPath: `记账APP数据备份-${stamp}.db`,
    filters: [{ name: '数据库备份文件', extensions: ['db'] }]
  })
  if (canceled || !filePath) return { canceled: true }
  copyFileSync(dbPath(), filePath)
  return { canceled: false, filePath }
}
