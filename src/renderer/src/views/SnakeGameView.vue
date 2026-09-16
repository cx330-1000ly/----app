<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'

// 棋盘 20×20 格，每 150 毫秒前进一步
const SIZE = 20
const SPEED = 150

interface Point {
  x: number
  y: number
}

// 蛇身坐标，第一项是蛇头
const snake = ref<Point[]>([])
// 当前方向与「下一步方向」分开存放：一步之内多次按键只改方向，不掉头自杀
const direction = ref<Point>({ x: 1, y: 0 })
const nextDirection = ref<Point>({ x: 1, y: 0 })
// 食物初始放在棋盘外（-1,-1），游戏开始后才出现
const food = ref<Point>({ x: -1, y: -1 })
const score = ref(0)
// 游戏状态：ready = 待开始（显示开始按钮）/ playing = 进行中 / over = 已结束
const status = ref<'ready' | 'playing' | 'over'>('ready')

let timer: ReturnType<typeof setInterval> | null = null

/** 随机生成一个不在蛇身上的食物 */
function spawnFood(): void {
  for (;;) {
    const p = { x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) }
    if (!snake.value.some((s) => s.x === p.x && s.y === p.y)) {
      food.value = p
      return
    }
  }
}

/** 开始 / 重新开始一局 */
function startGame(): void {
  // 蛇初始 3 节，横在棋盘中间，向右前进
  snake.value = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ]
  direction.value = { x: 1, y: 0 }
  nextDirection.value = { x: 1, y: 0 }
  score.value = 0
  status.value = 'playing'
  spawnFood()
  if (timer) clearInterval(timer)
  timer = setInterval(tick, SPEED)
}

/** 蛇前进一步 */
function tick(): void {
  if (status.value !== 'playing') return
  direction.value = nextDirection.value
  const head = snake.value[0]
  const newHead = { x: head.x + direction.value.x, y: head.y + direction.value.y }

  // 撞墙
  if (newHead.x < 0 || newHead.x >= SIZE || newHead.y < 0 || newHead.y >= SIZE) {
    endGame()
    return
  }
  // 撞到自己（尾巴那节马上会移开，不算撞）
  const body = snake.value.slice(0, -1)
  if (body.some((s) => s.x === newHead.x && s.y === newHead.y)) {
    endGame()
    return
  }

  snake.value.unshift(newHead)
  if (newHead.x === food.value.x && newHead.y === food.value.y) {
    score.value += 1
    // 蛇占满整个棋盘：通关，直接结束（此时已无处可放食物，不能继续找）
    if (snake.value.length === SIZE * SIZE) {
      endGame()
      return
    }
    spawnFood()
  } else {
    snake.value.pop()
  }
}

function endGame(): void {
  status.value = 'over'
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

/** 键盘控制方向：不允许 180 度掉头（例如往右走时按左无效） */
function onKeydown(e: KeyboardEvent): void {
  const keyMap: Record<string, Point> = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 }
  }
  const dir = keyMap[e.key]
  if (!dir) return
  e.preventDefault() // 防止方向键滚动页面
  if (dir.x === -direction.value.x && dir.y === -direction.value.y) return
  nextDirection.value = dir
}

window.addEventListener('keydown', onKeydown)
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  if (timer) clearInterval(timer)
})

// 棋盘全部格子，渲染用
const cells = computed(() =>
  Array.from({ length: SIZE * SIZE }, (_, i) => ({ x: i % SIZE, y: Math.floor(i / SIZE) }))
)

function isSnake(x: number, y: number): boolean {
  return snake.value.some((s) => s.x === x && s.y === y)
}

function isHead(x: number, y: number): boolean {
  const h = snake.value[0]
  // 尚未开始时蛇是空的，没有蛇头
  return !!h && h.x === x && h.y === y
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">贪吃蛇</h1>
    <p class="page-sub">工作间隙放松一下，游戏得分不保存</p>

    <div class="game-card">
      <div class="game-header">
        <span class="score">得分：{{ score }}</span>
      </div>
      <div class="board">
        <div
          v-for="cell in cells"
          :key="`${cell.x}-${cell.y}`"
          class="cell"
          :class="{
            snake: isSnake(cell.x, cell.y),
            head: isHead(cell.x, cell.y),
            food: cell.x === food.x && cell.y === food.y
          }"
        ></div>
        <div v-if="status === 'ready'" class="over-mask">
          <p>准备好了吗？</p>
          <button class="restart-btn" @click="startGame">开始游戏</button>
        </div>
        <div v-if="status === 'over'" class="over-mask">
          <p>游戏结束</p>
          <p class="final-score">得分 {{ score }}</p>
          <button class="restart-btn" @click="startGame">重新开始</button>
        </div>
      </div>
      <p class="tips">用键盘 ↑ ↓ ← → 方向键控制蛇的移动</p>
    </div>
  </div>
</template>

<style scoped>
.game-card {
  background: var(--card);
  border-radius: 12px;
  padding: 16px;
  display: inline-block;
}

.game-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
}

.score {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.board {
  position: relative;
  display: grid;
  grid-template-columns: repeat(20, 1fr);
  grid-template-rows: repeat(20, 1fr);
  width: 420px;
  height: 420px;
  background: var(--primary-soft);
  border: 2px solid var(--primary);
  border-radius: 8px;
  overflow: hidden;
}

.cell {
  box-shadow: inset 0 0 0 1px rgba(16, 185, 129, 0.08);
}

.cell.snake {
  background: var(--primary-strong);
  border-radius: 3px;
}

.cell.head {
  background: #065f46;
}

.cell.food {
  background: #ef4444;
  border-radius: 50%;
}

.over-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #fff;
  font-size: 20px;
  font-weight: 700;
}

.final-score {
  font-size: 15px;
  font-weight: 500;
  opacity: 0.9;
}

.restart-btn {
  margin-top: 8px;
  padding: 8px 24px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.restart-btn:hover {
  background: var(--primary-strong);
}

.tips {
  margin-top: 10px;
  font-size: 12px;
  color: var(--text-muted, #888);
  text-align: center;
}
</style>
