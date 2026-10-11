<script setup lang="ts">
import { ref } from 'vue'
import SnakeGameView from './SnakeGameView.vue'
import TetrisGameView from './TetrisGameView.vue'

const mode = ref<'snake' | 'tetris'>('snake')
</script>

<template>
  <div class="games">
    <div class="game-tabs">
      <button :class="{ active: mode === 'snake' }" @click="mode = 'snake'">🐍 贪吃蛇</button>
      <button :class="{ active: mode === 'tetris' }" @click="mode = 'tetris'">🧱 俄罗斯方块</button>
    </div>
    <SnakeGameView v-if="mode === 'snake'" />
    <TetrisGameView v-else />
  </div>
</template>

<style scoped>
.games { height: 100%; }
.game-tabs { display: flex; gap: 8px; padding: 22px 28px 0; }
.game-tabs button { border: 1px solid var(--border); border-radius: 8px; background: var(--card); color: var(--text-2); padding: 8px 14px; cursor: pointer; }
.game-tabs button.active { border-color: var(--primary); background: var(--primary-faint); color: var(--primary-strong); font-weight: 600; }
</style>
