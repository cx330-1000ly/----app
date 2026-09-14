<script setup lang="ts">
import * as echarts from 'echarts'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { toast } from '../toast'
import { errMsg, fmtCents, fmtMonth, thisMonth } from '../utils'
import type { MonthlySummary, PieSlice, TrendPoint } from '../../../shared/types'

const month = ref(thisMonth())
const summary = ref<MonthlySummary | null>(null)
const pie = ref<PieSlice[]>([])
const trend = ref<TrendPoint[]>([])
const loading = ref(false)

const pieEl = ref<HTMLDivElement | null>(null)
const barEl = ref<HTMLDivElement | null>(null)
let pieChart: echarts.ECharts | null = null
let barChart: echarts.ECharts | null = null

const isCurrentMonth = computed(() => month.value === thisMonth())

function shiftMonth(delta: number): void {
  const [y, m] = month.value.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  month.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const PIE_COLORS = [
  '#10b981', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ef4444',
  '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#ec4899'
]

function renderPie(): void {
  if (!pieChart || !pieEl.value) return
  if (!pie.value.length) {
    pieChart.clear()
    pieChart.setOption({
      title: {
        text: '本月暂无支出记录',
        left: 'center',
        top: 'middle',
        textStyle: { color: '#9ca3af', fontSize: 14, fontWeight: 'normal' }
      }
    })
    return
  }
  const data = pie.value.map((p, i) => ({
    name: p.name,
    value: Math.round(p.valueCents) / 100,
    itemStyle: { color: PIE_COLORS[i % PIE_COLORS.length] }
  }))
  pieChart.setOption(
    {
      tooltip: {
        trigger: 'item',
        valueFormatter: (v) => `¥${Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
      },
      legend: {
        orient: 'vertical',
        right: 8,
        top: 'middle',
        type: 'scroll',
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { color: '#6b7280', fontSize: 12 }
      },
      series: [
        {
          type: 'pie',
          radius: ['42%', '70%'],
          center: ['38%', '50%'],
          data,
          label: { show: false },
          emphasis: {
            label: { show: true, fontSize: 14, fontWeight: 600, formatter: '{b}\n{d}%' }
          },
          itemStyle: { borderColor: '#fff', borderWidth: 2 }
        }
      ]
    },
    true
  )
}

function renderBar(): void {
  if (!barChart || !barEl.value) return
  barChart.setOption(
    {
      tooltip: {
        trigger: 'axis',
        valueFormatter: (v) => `¥${Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
      },
      legend: { data: ['支出', '收入'], top: 0, textStyle: { color: '#6b7280' } },
      grid: { left: 50, right: 16, top: 36, bottom: 28 },
      xAxis: {
        type: 'category',
        data: trend.value.map((t) => {
          const m = Number(t.month.slice(5))
          return m === 1 ? `${Number(t.month.slice(2, 4))}年1月` : `${m}月`
        }),
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisLabel: { color: '#6b7280' },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#f0f2f1' } },
        axisLabel: {
          color: '#9ca3af',
          formatter: (v: number) => (v >= 10000 ? `${(v / 10000).toFixed(1)}万` : String(v))
        }
      },
      series: [
        {
          name: '支出',
          type: 'bar',
          data: trend.value.map((t) => Math.round(t.expenseCents) / 100),
          itemStyle: { color: '#ef4444', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 26
        },
        {
          name: '收入',
          type: 'bar',
          data: trend.value.map((t) => Math.round(t.incomeCents) / 100),
          itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 26
        }
      ]
    },
    true
  )
}

async function load(): Promise<void> {
  loading.value = true
  try {
    const [s, p, t] = await Promise.all([
      window.api.getMonthlySummary(month.value),
      window.api.getCategoryPie(month.value, 'expense'),
      window.api.getTrend(6)
    ])
    summary.value = s
    pie.value = p
    trend.value = t
    renderPie()
    renderBar()
  } catch (err) {
    toast(errMsg(err), 'error')
  } finally {
    loading.value = false
  }
}

watch(month, load)

function handleResize(): void {
  pieChart?.resize()
  barChart?.resize()
}

onMounted(() => {
  if (pieEl.value) pieChart = echarts.init(pieEl.value)
  if (barEl.value) barChart = echarts.init(barEl.value)
  window.addEventListener('resize', handleResize)
  load()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  pieChart?.dispose()
  barChart?.dispose()
  pieChart = null
  barChart = null
})
</script>

<template>
  <div class="page">
    <h1 class="page-title">统计</h1>
    <p class="page-sub">看清每一分钱的去向</p>

    <!-- 月份切换 -->
    <div class="month-nav">
      <button class="btn" @click="shiftMonth(-1)">‹ 上月</button>
      <div class="month-label">{{ fmtMonth(month) }}</div>
      <button class="btn" :disabled="isCurrentMonth" @click="shiftMonth(1)">下月 ›</button>
    </div>

    <!-- 汇总卡片 -->
    <div class="cards" v-if="summary">
      <div class="card stat-card">
        <div class="stat-label">本月支出</div>
        <div class="stat-value expense">{{ loading ? '…' : `¥${fmtCents(summary.expenseCents)}` }}</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">本月收入</div>
        <div class="stat-value income">{{ loading ? '…' : `¥${fmtCents(summary.incomeCents)}` }}</div>
      </div>
      <div class="card stat-card">
        <div class="stat-label">本月结余</div>
        <div class="stat-value" :class="summary.balanceCents >= 0 ? 'income' : 'expense'">
          {{ loading ? '…' : `${summary.balanceCents >= 0 ? '+' : '-'}¥${fmtCents(Math.abs(summary.balanceCents))}` }}
        </div>
      </div>
    </div>

    <!-- 图表 -->
    <div class="charts">
      <div class="card chart-card">
        <div class="chart-title">支出分类占比</div>
        <div ref="pieEl" class="chart-box"></div>
      </div>
      <div class="card chart-card">
        <div class="chart-title">近 6 个月收支趋势</div>
        <div ref="barEl" class="chart-box"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.month-nav {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.month-label {
  font-size: 18px;
  font-weight: 700;
  min-width: 110px;
  text-align: center;
}

.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.stat-label {
  font-size: 13px;
  color: var(--text-2);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.stat-value.expense {
  color: var(--expense);
}

.stat-value.income {
  color: var(--income);
}

.charts {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 16px;
}

.chart-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 6px;
}

.chart-box {
  height: 300px;
}

@media (max-width: 980px) {
  .charts {
    grid-template-columns: 1fr;
  }
}
</style>
