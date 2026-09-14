<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { Category, RecordItem, RecordType } from '../../../shared/types'
import { errMsg, today } from '../utils'

const props = defineProps<{
  /** 编辑时传入原记录，新增时不传 */
  initial?: RecordItem | null
  submitText?: string
}>()

const emit = defineEmits<{
  saved: []
}>()

const type = ref<RecordType>(props.initial?.type ?? 'expense')
// 注意：type="number" 的输入框 v-model 返回的是数字而非字符串
const amountText = ref<string | number>(props.initial ? String(props.initial.amountCents / 100) : '')
const date = ref(props.initial?.date ?? today())
const parentId = ref<number | null>(null)
const childId = ref<number | null>(null)
const note = ref(props.initial?.note ?? '')
const categories = ref<Category[]>([])
const errorMsg = ref('')
const saving = ref(false)

const childrenOfSelected = (): Category[] =>
  categories.value.find((c) => c.id === parentId.value)?.children ?? []

async function loadCategories(): Promise<void> {
  categories.value = await window.api.getCategories(type.value)
  // 编辑模式：定位原记录所属分类
  if (props.initial) {
    const cat = props.initial.categoryId
    const parent = categories.value.find((c) => c.id === cat)
    const parentOfChild = categories.value.find((c) => c.children?.some((ch) => ch.id === cat))
    if (parent) {
      parentId.value = cat
      childId.value = null
    } else if (parentOfChild) {
      parentId.value = parentOfChild.id
      childId.value = cat
    }
  }
}

// 切换收支类型时重新加载对应分类并清空选择
watch(type, async () => {
  parentId.value = null
  childId.value = null
  await loadCategories()
})

onMounted(loadCategories)

async function submit(): Promise<void> {
  errorMsg.value = ''
  try {
    const amountRaw = String(amountText.value ?? '').trim()
    const amount = Number(amountRaw)
    if (!amountRaw || !Number.isFinite(amount) || amount <= 0) {
      errorMsg.value = '请输入正确的金额（大于 0）'
      return
    }
    if (amount > 9999999.99) {
      errorMsg.value = '单笔金额不能超过 999 万元'
      return
    }
    const cents = Math.round(amount * 100)
    if (!date.value) {
      errorMsg.value = '请选择日期'
      return
    }
    if (!parentId.value) {
      errorMsg.value = '请选择分类'
      return
    }
    const categoryId = childId.value ?? parentId.value
    const payload = {
      type: type.value,
      amountCents: cents,
      categoryId,
      date: date.value,
      note: note.value.trim()
    }
    saving.value = true
    if (props.initial) {
      await window.api.updateRecord(props.initial.id, payload)
    } else {
      await window.api.addRecord(payload)
    }
    emit('saved')
  } catch (err) {
    errorMsg.value = errMsg(err)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="record-form" @submit.prevent="submit">
    <div class="type-toggle">
      <button
        type="button"
        class="type-btn"
        :class="{ active: type === 'expense' }"
        @click="type = 'expense'"
      >
        支出
      </button>
      <button
        type="button"
        class="type-btn"
        :class="{ active: type === 'income' }"
        @click="type = 'income'"
      >
        收入
      </button>
    </div>

    <div class="field">
      <label class="field-label">金额（元）</label>
      <div class="amount-box">
        <span class="amount-symbol" :class="type">¥</span>
        <input
          v-model="amountText"
          class="amount-input"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="0.00"
          autofocus
        />
      </div>
    </div>

    <div class="field">
      <label class="field-label">日期</label>
      <input v-model="date" class="input" type="date" />
    </div>

    <div class="field">
      <label class="field-label">分类</label>
      <div class="cat-row">
        <select v-model="parentId" class="select">
          <option :value="null" disabled>请选择大类</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <select v-if="childrenOfSelected().length" v-model="childId" class="select">
          <option :value="null" disabled>请选择小类</option>
          <option v-for="c in childrenOfSelected()" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
    </div>

    <div class="field">
      <label class="field-label">备注（选填）</label>
      <input v-model="note" class="input" type="text" maxlength="200" placeholder="比如：和同事聚餐" />
    </div>

    <p v-if="errorMsg" class="form-error">{{ errorMsg }}</p>

    <button class="btn btn-primary submit-btn" type="submit" :disabled="saving">
      {{ saving ? '保存中…' : (submitText ?? '保存') }}
    </button>
  </form>
</template>

<style scoped>
.record-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.type-toggle {
  display: flex;
  gap: 10px;
}

.type-btn {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--card);
  font-size: 15px;
  color: var(--text-2);
  transition: all 0.15s;
}

.type-btn.active {
  border-color: var(--danger);
  background: var(--danger-soft);
  color: var(--danger-strong);
  font-weight: 600;
}

.type-btn:last-child.active {
  border-color: var(--income);
  background: var(--primary-soft);
  color: var(--primary-strong);
}

.amount-box {
  display: flex;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.amount-box:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
}

.amount-symbol {
  font-size: 22px;
  font-weight: 700;
  padding: 0 4px 0 14px;
  color: var(--text-3);
}

.amount-symbol.expense {
  color: var(--expense);
}

.amount-symbol.income {
  color: var(--income);
}

.amount-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 10px 14px 10px 4px;
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
  background: transparent;
  min-width: 0;
}

.cat-row {
  display: flex;
  gap: 10px;
}

.cat-row .select {
  flex: 1;
}

.form-error {
  margin: 0;
  color: var(--danger-strong);
  font-size: 13px;
  background: var(--danger-soft);
  border-radius: 8px;
  padding: 8px 12px;
}

.submit-btn {
  justify-content: center;
  padding: 12px;
  font-size: 16px;
  font-weight: 600;
}
</style>
