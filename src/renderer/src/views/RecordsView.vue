<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import Modal from '../components/Modal.vue'
import RecordForm from '../components/RecordForm.vue'
import { toast } from '../toast'
import { errMsg, fmtCents } from '../utils'
import type { Category, RecordItem, RecordType } from '../../../shared/types'

const emit = defineEmits<{
  'goto-add': []
}>()

const PAGE_SIZE = 20

// 筛选条件
const month = ref('') // '' = 全部
const typeFilter = ref<'all' | RecordType>('all')
const parentFilter = ref<number | null>(null)
const keyword = ref('')
const page = ref(1)

const items = ref<RecordItem[]>([])
const total = ref(0)
const loading = ref(false)

// 分类选项（根据类型筛选动态取）
const expenseParents = ref<Category[]>([])
const incomeParents = ref<Category[]>([])

const filterParentOptions = computed(() => {
  if (typeFilter.value === 'expense') return expenseParents.value
  if (typeFilter.value === 'income') return incomeParents.value
  return [...expenseParents.value, ...incomeParents.value]
})

// 编辑 / 删除弹窗
const editing = ref<RecordItem | null>(null)
const deleting = ref<RecordItem | null>(null)
const deleteBusy = ref(false)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

async function loadCategories(): Promise<void> {
  const [exp, inc] = await Promise.all([
    window.api.getCategories('expense'),
    window.api.getCategories('income')
  ])
  expenseParents.value = exp
  incomeParents.value = inc
}

async function load(): Promise<void> {
  loading.value = true
  try {
    const res = await window.api.listRecords({
      month: month.value || undefined,
      type: typeFilter.value,
      parentCategoryId: parentFilter.value || undefined,
      keyword: keyword.value || undefined,
      page: page.value,
      pageSize: PAGE_SIZE
    })
    items.value = res.items
    total.value = res.total
    if (res.total > 0 && page.value > Math.ceil(res.total / PAGE_SIZE)) {
      page.value = Math.ceil(res.total / PAGE_SIZE)
      await load()
    }
  } catch (err) {
    toast(errMsg(err), 'error')
  } finally {
    loading.value = false
  }
}

// 筛选条件变化 → 回到第一页并重新加载
watch([month, typeFilter, parentFilter], () => {
  page.value = 1
  load()
})

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(keyword, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 300)
})

function onSaved(): void {
  editing.value = null
  toast('已保存 ✓')
  load()
}

async function confirmDelete(): Promise<void> {
  if (!deleting.value) return
  deleteBusy.value = true
  try {
    await window.api.deleteRecord(deleting.value.id)
    deleting.value = null
    toast('已删除')
    load()
  } catch (err) {
    toast(errMsg(err), 'error')
  } finally {
    deleteBusy.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadCategories(), load()])
})
</script>

<template>
  <div class="page">
    <h1 class="page-title">明细</h1>
    <p class="page-sub">共 {{ total }} 条记录</p>

    <!-- 筛选栏 -->
    <div class="card filter-bar">
      <input v-model="month" class="input" type="month" title="按月份筛选" />
      <select v-model="typeFilter" class="select">
        <option value="all">全部类型</option>
        <option value="expense">仅支出</option>
        <option value="income">仅收入</option>
      </select>
      <select v-model="parentFilter" class="select">
        <option :value="null">全部分类</option>
        <option v-for="c in filterParentOptions" :key="c.id" :value="c.id">
          {{ c.type === 'income' ? '收入·' : '' }}{{ c.name }}
        </option>
      </select>
      <input v-model="keyword" class="input" type="text" placeholder="搜索备注或金额…" />
      <button class="btn btn-primary" @click="emit('goto-add')">＋ 记一笔</button>
    </div>

    <!-- 列表 -->
    <div class="card list-card">
      <div v-if="loading" class="empty"><div class="empty-icon">⏳</div>加载中…</div>

      <div v-else-if="!items.length" class="empty">
        <div class="empty-icon">📭</div>
        <div>还没有符合条件的记录</div>
        <button class="btn btn-primary" @click="emit('goto-add')">去记一笔</button>
      </div>

      <template v-else>
        <table class="table">
          <thead>
            <tr>
              <th>日期</th>
              <th>类型</th>
              <th>分类</th>
              <th>备注</th>
              <th class="ta-r">金额</th>
              <th class="ta-r">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in items" :key="r.id">
              <td class="date-cell">{{ r.date }}</td>
              <td>
                <span class="badge" :class="r.type === 'expense' ? 'badge-expense' : 'badge-income'">
                  {{ r.type === 'expense' ? '支出' : '收入' }}
                </span>
              </td>
              <td>
                <span class="cat-cell">
                  {{ r.parentCategoryName ? `${r.parentCategoryName} / ${r.categoryName}` : r.categoryName }}
                </span>
              </td>
              <td class="note-cell">{{ r.note || '—' }}</td>
              <td class="ta-r">
                <span class="amount" :class="r.type === 'expense' ? 'expense' : 'income'">
                  {{ r.type === 'expense' ? '-' : '+' }}¥{{ fmtCents(r.amountCents) }}
                </span>
              </td>
              <td class="ta-r ops">
                <button class="btn-text" @click="editing = r">编辑</button>
                <button class="btn-text danger" @click="deleting = r">删除</button>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="pager">
          <button class="btn" :disabled="page <= 1" @click="page--; load()">上一页</button>
          <span class="pager-info">第 {{ page }} / {{ totalPages }} 页</span>
          <button class="btn" :disabled="page >= totalPages" @click="page++; load()">下一页</button>
        </div>
      </template>
    </div>

    <!-- 编辑弹窗 -->
    <Modal v-if="editing" :title="`编辑${editing.type === 'expense' ? '支出' : '收入'}`" @close="editing = null">
      <RecordForm :initial="editing" submit-text="保存修改" @saved="onSaved" />
    </Modal>

    <!-- 删除确认 -->
    <Modal v-if="deleting" title="删除记录" @close="deleting = null">
      <p class="confirm-text">
        确定删除这条{{ deleting.type === 'expense' ? '支出' : '收入'}}记录吗？
        <strong>{{ deleting.parentCategoryName ? `${deleting.parentCategoryName} / ` : '' }}{{ deleting.categoryName }}</strong>
        ·
        <strong class="amount" :class="deleting.type">
          ¥{{ fmtCents(deleting.amountCents) }}
        </strong>
      </p>
      <p class="confirm-hint">删除后不可恢复</p>
      <div class="confirm-actions">
        <button class="btn" @click="deleting = null">取消</button>
        <button class="btn btn-danger" :disabled="deleteBusy" @click="confirmDelete">确认删除</button>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.filter-bar .input,
.filter-bar .select {
  flex: 1;
  min-width: 130px;
}

.filter-bar .btn {
  flex-shrink: 0;
}

.list-card {
  padding: 8px 20px 16px;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th {
  text-align: left;
  font-size: 12px;
  color: var(--text-3);
  font-weight: 500;
  padding: 10px 8px;
  border-bottom: 1px solid var(--border);
}

.table td {
  padding: 11px 8px;
  border-bottom: 1px solid var(--bg);
  font-size: 14px;
}

.table tr:hover td {
  background: var(--primary-faint);
}

.date-cell {
  color: var(--text-2);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.cat-cell {
  white-space: nowrap;
}

.note-cell {
  color: var(--text-2);
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ta-r {
  text-align: right;
}

.amount {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.amount.expense {
  color: var(--expense);
}

.amount.income {
  color: var(--income);
}

.ops {
  white-space: nowrap;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 14px 0 4px;
}

.pager-info {
  color: var(--text-2);
  font-size: 13px;
}

.confirm-text {
  margin: 0 0 6px;
  line-height: 1.7;
}

.confirm-hint {
  margin: 0;
  color: var(--text-3);
  font-size: 13px;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}
</style>
