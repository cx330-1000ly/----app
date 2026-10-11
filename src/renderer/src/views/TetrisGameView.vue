<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'

type Cell = 0 | 1
type Piece = { shape: number[][]; color: string }
type ActivePiece = Piece & { x: number; y: number; rotation: number }

const WIDTH = 10
const HEIGHT = 20
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']
const SHAPES = [
  [[1, 1, 1, 1]],
  [[1, 1], [1, 1]],
  [[0, 1, 0], [1, 1, 1]],
  [[1, 0, 0], [1, 1, 1]],
  [[0, 0, 1], [1, 1, 1]],
  [[0, 1, 1], [1, 1, 0]],
  [[1, 1, 0], [0, 1, 1]]
]

const board = ref<Cell[][]>(emptyBoard())
const current = ref<ActivePiece | null>(null)
const next = ref<Piece>(makePiece())
const score = ref(0)
const lines = ref(0)
const level = computed(() => Math.floor(lines.value / 10) + 1)
const status = ref<'ready' | 'playing' | 'paused' | 'over'>('ready')
let timer: ReturnType<typeof setInterval> | null = null

function emptyBoard(): Cell[][] {
  return Array.from({ length: HEIGHT }, () => Array<Cell>(WIDTH).fill(0))
}

function makePiece(): Piece {
  const index = Math.floor(Math.random() * SHAPES.length)
  return { shape: SHAPES[index], color: COLORS[index] }
}

function rotate(shape: number[][]): number[][] {
  return shape[0].map((_, x) => shape.map((row) => row[x]).reverse())
}

function fits(piece: ActivePiece, dx = 0, dy = 0, shape = piece.shape): boolean {
  return shape.every((row, y) =>
    row.every((filled, x) => {
      if (!filled) return true
      const nx = piece.x + x + dx
      const ny = piece.y + y + dy
      return nx >= 0 && nx < WIDTH && ny < HEIGHT && (ny < 0 || !board.value[ny][nx])
    })
  )
}

function spawn(): void {
  const piece = { ...next.value, x: Math.floor((WIDTH - next.value.shape[0].length) / 2), y: 0, rotation: 0 }
  next.value = makePiece()
  current.value = piece
  if (!fits(piece)) endGame()
}

function startGame(): void {
  board.value = emptyBoard()
  score.value = 0
  lines.value = 0
  status.value = 'playing'
  spawn()
  resetTimer()
}

function resetTimer(): void {
  if (timer) clearInterval(timer)
  timer = setInterval(tick, Math.max(100, 700 - (level.value - 1) * 55))
}

function tick(): void {
  if (status.value !== 'playing' || !current.value) return
  if (fits(current.value, 0, 1)) current.value.y++
  else lockPiece()
}

function lockPiece(): void {
  if (!current.value) return
  current.value.shape.forEach((row, y) =>
    row.forEach((filled, x) => {
      const by = current.value!.y + y
      const bx = current.value!.x + x
      if (filled && by >= 0) board.value[by][bx] = 1
    })
  )
  clearLines()
  spawn()
  resetTimer()
}

function clearLines(): void {
  const remaining = board.value.filter((row) => row.some((cell) => !cell))
  const cleared = HEIGHT - remaining.length
  if (!cleared) return
  board.value = [...Array.from({ length: cleared }, () => Array<Cell>(WIDTH).fill(0)), ...remaining]
  lines.value += cleared
  score.value += [0, 100, 300, 500, 800][cleared] * level.value
}

function move(dx: number): void {
  if (status.value === 'playing' && current.value && fits(current.value, dx)) current.value.x += dx
}

function hardDrop(): void {
  if (status.value !== 'playing' || !current.value) return
  while (fits(current.value, 0, 1)) current.value.y++
  lockPiece()
}

function turn(): void {
  if (status.value !== 'playing' || !current.value) return
  const shape = rotate(current.value.shape)
  if (fits(current.value, 0, 0, shape)) {
    current.value.shape = shape
    current.value.rotation = (current.value.rotation + 1) % 4
  } else if (fits(current.value, -1, 0, shape)) {
    current.value.x--
    current.value.shape = shape
  }
}

function togglePause(): void {
  if (status.value === 'playing') status.value = 'paused'
  else if (status.value === 'paused') status.value = 'playing'
}

function endGame(): void {
  status.value = 'over'
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function occupied(x: number, y: number): boolean {
  if (current.value) {
    const px = x - current.value.x
    const py = y - current.value.y
    if (py >= 0 && py < current.value.shape.length && px >= 0 && px < current.value.shape[0].length) {
      if (current.value.shape[py][px]) return true
    }
  }
  return !!board.value[y]?.[x]
}

function onKeydown(e: KeyboardEvent): void {
  if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' ', 'p', 'P'].includes(e.key)) e.preventDefault()
  if (e.key === 'ArrowLeft') move(-1)
  else if (e.key === 'ArrowRight') move(1)
  else if (e.key === 'ArrowDown') tick()
  else if (e.key === 'ArrowUp') turn()
  else if (e.key === ' ') hardDrop()
  else if (e.key === 'p' || e.key === 'P') togglePause()
}

window.addEventListener('keydown', onKeydown)
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="page">
    <h1 class="page-title">俄罗斯方块</h1>
    <p class="page-sub">移动、旋转并消除整行，游戏得分不保存</p>
    <div class="tetris-layout">
      <div class="tetris-card">
        <div class="board">
          <div v-for="y in HEIGHT" :key="y" class="row">
            <div
              v-for="x in WIDTH"
              :key="x"
              class="cell"
              :class="{ filled: occupied(x - 1, y - 1) }"
            ></div>
          </div>
          <div v-if="status !== 'playing'" class="over-mask">
            <p>{{ status === 'ready' ? '准备好了吗？' : status === 'paused' ? '游戏已暂停' : '游戏结束' }}</p>
            <p v-if="status === 'over'" class="final-score">得分 {{ score }}</p>
            <button class="restart-btn" @click="status === 'paused' ? togglePause() : startGame()">
              {{ status === 'paused' ? '继续游戏' : status === 'ready' ? '开始游戏' : '重新开始' }}
            </button>
          </div>
        </div>
        <p class="tips">← → 移动 · ↑ 旋转 · ↓ 加速 · 空格落下 · P 暂停</p>
      </div>
      <div class="info-card">
        <div><span>得分</span><strong>{{ score }}</strong></div>
        <div><span>消行</span><strong>{{ lines }}</strong></div>
        <div><span>等级</span><strong>{{ level }}</strong></div>
        <button class="pause-btn" :disabled="status === 'ready' || status === 'over'" @click="togglePause">
          {{ status === 'paused' ? '继续' : '暂停' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tetris-layout { display: flex; align-items: flex-start; gap: 18px; }
.tetris-card, .info-card { background: var(--card); border-radius: 12px; padding: 16px; }
.board { position: relative; width: 250px; height: 500px; padding: 2px; background: #d1fae5; border: 2px solid var(--primary); border-radius: 8px; overflow: hidden; }
.row { display: grid; grid-template-columns: repeat(10, 1fr); height: 5%; }
.cell { box-shadow: inset 0 0 0 1px rgba(16, 185, 129, .08); }
.cell.filled { background: var(--primary-strong); border: 1px solid #047857; border-radius: 3px; }
.info-card { width: 120px; display: flex; flex-direction: column; gap: 16px; }
.info-card div { display: flex; flex-direction: column; gap: 3px; color: var(--text-2); }
.info-card strong { color: var(--text); font-size: 22px; }
.pause-btn, .restart-btn { padding: 8px 16px; background: var(--primary); color: #fff; border: 0; border-radius: 6px; font-weight: 600; cursor: pointer; }
.pause-btn:disabled { opacity: .5; cursor: not-allowed; }
.over-mask { position: absolute; inset: 0; background: rgba(0, 0, 0, .55); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; color: #fff; font-size: 19px; font-weight: 700; }
.final-score { font-size: 14px; font-weight: 500; }
.tips { margin: 10px 0 0; color: var(--text-2); font-size: 12px; text-align: center; }
</style>
