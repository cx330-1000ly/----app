// 主进程与界面共用的数据类型定义

/** 收支类型 */
export type RecordType = 'expense' | 'income'

/** 分类（一级大类含 children 二级小类） */
export interface Category {
  id: number
  type: RecordType
  parentId: number | null
  name: string
  sortOrder: number
  builtin: number
  children?: Category[]
}

/** 一条记账记录（含分类名称） */
export interface RecordItem {
  id: number
  type: RecordType
  amountCents: number
  categoryId: number
  date: string
  note: string
  categoryName: string
  parentCategoryId: number | null
  parentCategoryName: string | null
}

/** 新增/修改记录时的输入 */
export interface RecordInput {
  type: RecordType
  amountCents: number
  categoryId: number
  date: string
  note: string
}

/** 明细列表查询参数 */
export interface ListParams {
  month?: string // 'YYYY-MM'，可选
  type?: RecordType | 'all'
  parentCategoryId?: number | null
  keyword?: string
  page: number
  pageSize: number
}

export interface ListResult {
  total: number
  items: RecordItem[]
}

/** 月度汇总 */
export interface MonthlySummary {
  month: string
  expenseCents: number
  incomeCents: number
  balanceCents: number
}

/** 分类占比切片 */
export interface PieSlice {
  name: string
  valueCents: number
}

/** 趋势点 */
export interface TrendPoint {
  month: string
  expenseCents: number
  incomeCents: number
}

/** 数据文件信息 */
export interface DataInfo {
  dir: string
  file: string
  exists: boolean
}

export interface ExportResult {
  canceled: boolean
  filePath?: string
}

/** 界面通过 window.api 调用的全部接口 */
export interface HeimaApi {
  addRecord(input: RecordInput): Promise<number>
  updateRecord(id: number, input: RecordInput): Promise<void>
  deleteRecord(id: number): Promise<void>
  listRecords(params: ListParams): Promise<ListResult>
  getCategories(type: RecordType): Promise<Category[]>
  addCategory(type: RecordType, parentId: number | null, name: string): Promise<number>
  renameCategory(id: number, name: string): Promise<void>
  deleteCategory(id: number): Promise<void>
  getMonthlySummary(month: string): Promise<MonthlySummary>
  getCategoryPie(month: string, type: RecordType): Promise<PieSlice[]>
  getTrend(months: number): Promise<TrendPoint[]>
  getDataInfo(): Promise<DataInfo>
  openDataDir(): Promise<string>
  exportBackup(): Promise<ExportResult>
}
