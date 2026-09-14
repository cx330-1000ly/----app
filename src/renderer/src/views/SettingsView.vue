<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import Modal from '../components/Modal.vue'
import { toast } from '../toast'
import { errMsg } from '../utils'
import type { Category, DataInfo, RecordType } from '../../../shared/types'

const tabType = ref<RecordType>('expense')
const categories = ref<Category[]>([])

const dataInfo = ref<DataInfo | null>(null)
const exporting = ref(false)

// 分类弹窗状态
type NameDialogMode = 'add-parent' | 'add-child' | 'rename'
interface NameDialogState {
  mode: NameDialogMode
  parentId?: number | null
  categoryId?: number
  name: string
}
const nameDialog = ref<NameDialogState | null>(null)
const nameBusy = ref(false)

interface DeleteState {
  category: Category
}
const deleteDialog = ref<DeleteState | null>(null)
const deleteBusy = ref(false)

async function loadCategories(): Promise<void> {
  categories.value = await window.api.getCategories(tabType.value)
}

watch(tabType, loadCategories)

async function loadDataInfo(): Promise<void> {
  dataInfo.value = await window.api.getDataInfo()
}

onMounted(async () => {
  await Promise.all([loadCategories(), loadDataInfo()])
})

function openNameDialog(mode: NameDialogMode, parentId?: number | null, categoryId?: number, name = ''): void {
  nameDialog.value = { mode, parentId, categoryId, name }
}

async function submitName(): Promise<void> {
  const d = nameDialog.value
  if (!d) return
  nameBusy.value = true
  try {
    if (d.mode === 'add-parent') {
      await window.api.addCategory(tabType.value, null, d.name)
      toast('大类已添加 ✓')
    } else if (d.mode === 'add-child') {
      await window.api.addCategory(tabType.value, d.parentId ?? null, d.name)
      toast('小类已添加 ✓')
    } else if (d.categoryId) {
      await window.api.renameCategory(d.categoryId, d.name)
      toast('已重命名 ✓')
    }
    nameDialog.value = null
    await loadCategories()
  } catch (err) {
    toast(errMsg(err), 'error')
  } finally {
    nameBusy.value = false
  }
}

async function confirmDelete(): Promise<void> {
  const d = deleteDialog.value
  if (!d) return
  deleteBusy.value = true
  try {
    await window.api.deleteCategory(d.category.id)
    deleteDialog.value = null
    toast('已删除')
    await loadCategories()
  } catch (err) {
    toast(errMsg(err), 'error')
  } finally {
    deleteBusy.value = false
  }
}

function openDataDir(): void {
  window.api.openDataDir()
}

async function doExport(): Promise<void> {
  exporting.value = true
  try {
    const res = await window.api.exportBackup()
    if (!res.canceled && res.filePath) {
      toast(`备份已导出 ✓`)
    }
  } catch (err) {
    toast(errMsg(err), 'error')
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">设置</h1>
    <p class="page-sub">管理分类与数据</p>

    <!-- 分类管理 -->
    <div class="card section">
      <div class="section-head">
        <div>
          <div class="section-title">分类管理</div>
          <div class="section-sub">可自行增删改分类（有记账记录的分类不能删除）</div>
        </div>
        <div class="head-actions">
          <div class="type-tabs">
            <button
              class="tab"
              :class="{ active: tabType === 'expense' }"
              @click="tabType = 'expense'"
            >
              支出
            </button>
            <button
              class="tab"
              :class="{ active: tabType === 'income' }"
              @click="tabType = 'income'"
            >
              收入
            </button>
          </div>
          <button class="btn btn-primary" @click="openNameDialog('add-parent', null)">＋ 添加大类</button>
        </div>
      </div>

      <div class="cat-tree">
        <div v-for="p in categories" :key="p.id" class="cat-parent">
          <div class="cat-row">
            <span class="cat-name parent">{{ p.name }}</span>
            <span class="cat-ops">
              <button class="btn-text" @click="openNameDialog('add-child', p.id)">＋ 小类</button>
              <button class="btn-text" @click="openNameDialog('rename', null, p.id, p.name)">重命名</button>
              <button class="btn-text danger" @click="deleteDialog = { category: p }">删除</button>
            </span>
          </div>
          <div v-for="c in p.children" :key="c.id" class="cat-row child">
            <span class="cat-name">{{ c.name }}</span>
            <span class="cat-ops">
              <button class="btn-text" @click="openNameDialog('rename', null, c.id, c.name)">重命名</button>
              <button class="btn-text danger" @click="deleteDialog = { category: c }">删除</button>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 数据备份 -->
    <div class="card section">
      <div class="section-head">
        <div>
          <div class="section-title">数据备份</div>
          <div class="section-sub">数据只保存在本机。重装系统前，请先导出备份</div>
        </div>
        <div class="head-actions">
          <button class="btn" @click="openDataDir()">打开数据所在文件夹</button>
          <button class="btn btn-primary" :disabled="exporting" @click="doExport">立即导出备份</button>
        </div>
      </div>
      <div v-if="dataInfo" class="data-path">
        数据文件位置：<code>{{ dataInfo.file }}</code>
      </div>
      <div class="section-sub">
        恢复方法：把备份文件放回上方文件夹，并改名为 heima-jizhang.db（覆盖原文件）后重启软件。
      </div>
    </div>

    <!-- 关于 -->
    <div class="card section">
      <div class="section-title">关于</div>
      <div class="section-sub">黑马记账 v1.0.0 · 运行于 Windows / macOS · 数据仅保存在本机</div>
    </div>

    <!-- 分类名称弹窗 -->
    <Modal
      v-if="nameDialog"
      :title="nameDialog.mode === 'rename' ? '重命名分类' : nameDialog.mode === 'add-parent' ? '添加大类' : '添加小类'"
      @close="nameDialog = null"
    >
      <div class="field">
        <label class="field-label">分类名称（20 字以内）</label>
        <input
          v-model="nameDialog.name"
          class="input"
          type="text"
          maxlength="20"
          placeholder="请输入分类名称"
          @keyup.enter="submitName"
        />
      </div>
      <div class="confirm-actions">
        <button class="btn" @click="nameDialog = null">取消</button>
        <button class="btn btn-primary" :disabled="nameBusy" @click="submitName">确定</button>
      </div>
    </Modal>

    <!-- 删除确认 -->
    <Modal v-if="deleteDialog" title="删除分类" @close="deleteDialog = null">
      <p class="confirm-text">
        确定删除分类「<strong>{{ deleteDialog.category.name }}</strong>」吗？
      </p>
      <p class="confirm-hint">若该分类下已有小类或记账记录，将无法删除。</p>
      <div class="confirm-actions">
        <button class="btn" @click="deleteDialog = null">取消</button>
        <button class="btn btn-danger" :disabled="deleteBusy" @click="confirmDelete">确认删除</button>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.section {
  margin-bottom: 16px;
  padding: 20px 24px;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
}

.section-sub {
  font-size: 13px;
  color: var(--text-2);
  margin-top: 4px;
  line-height: 1.6;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.type-tabs {
  display: flex;
  background: var(--bg);
  border-radius: 8px;
  padding: 3px;
}

.tab {
  border: none;
  background: none;
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-2);
}

.tab.active {
  background: var(--card);
  color: var(--primary-strong);
  font-weight: 600;
  box-shadow: var(--shadow);
}

.cat-parent {
  border-bottom: 1px solid var(--bg);
}

.cat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 4px;
}

.cat-row.child {
  padding-left: 28px;
}

.cat-row.child .cat-name {
  color: var(--text-2);
}

.cat-name {
  font-size: 14px;
}

.cat-name.parent {
  font-weight: 600;
}

.cat-ops {
  display: flex;
  gap: 2px;
}

.data-path {
  font-size: 13px;
  margin-bottom: 6px;
  word-break: break-all;
}

.data-path code {
  background: var(--bg);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-2);
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
