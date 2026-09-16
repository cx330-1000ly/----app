<script setup lang="ts">
import { ref } from 'vue'
import AddRecordView from './views/AddRecordView.vue'
import RecordsView from './views/RecordsView.vue'
import StatsView from './views/StatsView.vue'
import SettingsView from './views/SettingsView.vue'
import SnakeGameView from './views/SnakeGameView.vue'
import ToastHost from './components/ToastHost.vue'

const navItems = [
  { key: 'add', label: '记一笔', icon: '✏️' },
  { key: 'records', label: '明细', icon: '📋' },
  { key: 'stats', label: '统计', icon: '📊' },
  { key: 'game', label: '小游戏', icon: '🎮' },
  { key: 'settings', label: '设置', icon: '⚙️' }
] as const

type NavKey = (typeof navItems)[number]['key']

const active = ref<NavKey>('add')
</script>

<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="logo">
        <div class="logo-mark">¥</div>
        <div class="logo-text">记账APP</div>
      </div>
      <nav class="nav">
        <button
          v-for="item in navItems"
          :key="item.key"
          class="nav-item"
          :class="{ active: active === item.key }"
          @click="active = item.key"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </button>
      </nav>
      <div class="sidebar-footer">数据仅保存在本机</div>
    </aside>

    <main class="main">
      <AddRecordView v-if="active === 'add'" />
      <RecordsView v-else-if="active === 'records'" @goto-add="active = 'add'" />
      <StatsView v-else-if="active === 'stats'" />
      <SnakeGameView v-else-if="active === 'game'" />
      <SettingsView v-else />
    </main>

    <ToastHost />
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  height: 100%;
}

.sidebar {
  width: 180px;
  flex-shrink: 0;
  background: var(--sidebar-bg);
  display: flex;
  flex-direction: column;
  padding: 20px 12px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 8px 22px;
}

.logo-mark {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: var(--primary);
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-text {
  color: #fff;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 1px;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
  border: none;
  background: none;
  color: var(--sidebar-text);
  font-size: 14px;
  border-radius: 8px;
  text-align: left;
  transition: all 0.15s;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.07);
  color: #fff;
}

.nav-item.active {
  background: var(--sidebar-active-bg);
  color: #fff;
  font-weight: 600;
}

.nav-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.sidebar-footer {
  color: rgba(255, 255, 255, 0.35);
  font-size: 11px;
  padding: 0 8px;
}

.main {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
</style>
