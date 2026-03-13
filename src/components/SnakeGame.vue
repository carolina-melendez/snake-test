<template>
  <section class="game-layout">
    <aside class="game-panel">
      <h1>Snake de Animalitos</h1>
      <p class="description">
        Come todos los animalitos que puedas. Si tocas los bordes o tu propio cuerpo, pierdes.
      </p>

      <div class="stats-card">
        <div class="stat-row">
          <span>Puntaje</span>
          <strong>{{ score }}</strong>
        </div>
        <div class="stat-row">
          <span>Mejor puntaje</span>
          <strong class="best-score">{{ highScore }}</strong>
        </div>
        <div class="stat-row">
          <span>Estado</span>
          <strong :class="statusClass">{{ statusLabel }}</strong>
        </div>
        <div class="stat-row">
          <span>Velocidad</span>
          <strong>{{ tickRate }} ms</strong>
        </div>
      </div>

      <div class="message-box" :class="overlayClass">
        <p v-if="gameState === 'lost'">Game Over. Intenta otra vez.</p>
        <p v-else-if="gameState === 'paused'">Juego en pausa. Presiona reanudar para continuar.</p>
        <p v-else-if="gameState === 'running'">Usa las flechas del teclado para moverte.</p>
        <p v-else>Presiona el botón para comenzar la partida.</p>
      </div>
      
    </aside>

    <div class="canvas-shell">
      <div class="canvas-actions">
        <button class="game-button" type="button" @click="toggleGame">
          {{ buttonLabel }}
        </button>
        <button
          class="game-button secondary"
          type="button"
          :disabled="!hasStarted || gameState === 'lost'"
          @click="togglePause"
        >
          {{ pauseButtonLabel }}
        </button>
      </div>
      <canvas
        ref="canvasRef"
        :width="canvasSize"
        :height="canvasSize"
        class="game-canvas"
      />
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const GRID_SIZE = 18
const CELL_SIZE = 28
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE
const BASE_TICK_RATE = 190
const SPEED_STEP = 15
const POINTS_PER_LEVEL = 5
const MIN_TICK_RATE = 85
const HIGH_SCORE_STORAGE_KEY = 'snake-best-score'
const ANIMALS = ['🐭', '🐸', '🐤', '🐟', '🐇']

const DIRECTIONS = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }
}

const canvasRef = ref(null)
const score = ref(0)
const highScore = ref(0)
const gameState = ref('idle')
const snake = ref([])
const direction = ref({ x: 1, y: 0 })
const nextDirection = ref({ x: 1, y: 0 })
const food = ref(null)
const loopId = ref(null)
const hasStarted = ref(false)
let audioContext = null

const canvasSize = CANVAS_SIZE
const tickRate = computed(() => {
  const earnedLevels = Math.floor(score.value / POINTS_PER_LEVEL)
  return Math.max(BASE_TICK_RATE - earnedLevels * SPEED_STEP, MIN_TICK_RATE)
})

const statusLabel = computed(() => {
  if (gameState.value === 'running') return 'Jugando'
  if (gameState.value === 'paused') return 'Pausado'
  if (gameState.value === 'lost') return 'Game Over'
  return 'En espera'
})

const statusClass = computed(() => {
  return {
    running: gameState.value === 'running',
    paused: gameState.value === 'paused',
    lost: gameState.value === 'lost',
    idle: gameState.value === 'idle'
  }
})

const buttonLabel = computed(() => {
  return hasStarted.value ? 'Reiniciar juego' : 'Iniciar juego'
})

const pauseButtonLabel = computed(() => {
  return gameState.value === 'paused' ? 'Reanudar juego' : 'Pausar juego'
})

const overlayClass = computed(() => ({
  danger: gameState.value === 'lost',
  active: gameState.value === 'running',
  paused: gameState.value === 'paused'
}))

function initGame() {
  score.value = 0
  gameState.value = 'idle'
  direction.value = { x: 1, y: 0 }
  nextDirection.value = { x: 1, y: 0 }
  // La serpiente empieza centrada y con espacio suficiente para maniobrar.
  snake.value = [
    { x: 5, y: 9 },
    { x: 4, y: 9 },
    { x: 3, y: 9 }
  ]
  food.value = spawnFood()
  drawGame()
}

function startGame() {
  clearGameLoop()
  ensureAudioContext()

  if (!food.value) {
    food.value = spawnFood()
  }

  hasStarted.value = true
  gameState.value = 'running'
  loopId.value = window.setInterval(updateGame, tickRate.value)
}

function resetGame() {
  clearGameLoop()
  initGame()
  startGame()
}

function toggleGame() {
  if (!hasStarted.value || gameState.value === 'lost') {
    resetGame()
    return
  }

  resetGame()
}

function togglePause() {
  if (!hasStarted.value || gameState.value === 'lost') {
    return
  }

  if (gameState.value === 'paused') {
    resumeGame()
    return
  }

  pauseGame()
}

function updateGame() {
  if (gameState.value !== 'running') {
    return
  }

  direction.value = { ...nextDirection.value }
  const head = snake.value[0]
  const newHead = {
    x: head.x + direction.value.x,
    y: head.y + direction.value.y
  }

  if (checkCollision(newHead)) {
    gameState.value = 'lost'
    playLoseSound()
    clearGameLoop()
    drawGame()
    return
  }

  snake.value.unshift(newHead)

  if (food.value && newHead.x === food.value.x && newHead.y === food.value.y) {
    const previousTickRate = tickRate.value
    score.value += 1
    updateHighScore(score.value)
    playEatSound()
    food.value = spawnFood()
    syncGameSpeed(previousTickRate)
  } else {
    snake.value.pop()
  }

  drawGame()
}

function drawGame() {
  const canvas = canvasRef.value
  if (!canvas) {
    return
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }

  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  drawBoard(ctx)
  drawSnake(ctx)
  drawFood(ctx)
  drawOverlay(ctx)
}

function drawBoard(ctx) {
  ctx.fillStyle = '#07111f'
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      ctx.fillStyle = (row + col) % 2 === 0 ? '#0c1a2b' : '#11233a'
      ctx.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE)
    }
  }
}

function drawSnake(ctx) {
  snake.value.forEach((segment, index) => {
    const x = segment.x * CELL_SIZE
    const y = segment.y * CELL_SIZE

    ctx.fillStyle = index === 0 ? '#7dff9b' : '#39c66d'
    roundRect(ctx, x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4, 8)
    ctx.fill()

    if (index === 0) {
      ctx.fillStyle = '#03110a'
      ctx.beginPath()
      ctx.arc(x + 10, y + 10, 2.5, 0, Math.PI * 2)
      ctx.arc(x + CELL_SIZE - 10, y + 10, 2.5, 0, Math.PI * 2)
      ctx.fill()
    }
  })
}

function drawFood(ctx) {
  if (!food.value) {
    return
  }

  const centerX = food.value.x * CELL_SIZE + CELL_SIZE / 2
  const centerY = food.value.y * CELL_SIZE + CELL_SIZE / 2

  ctx.fillStyle = '#ffcf5a'
  ctx.beginPath()
  ctx.arc(centerX, centerY, CELL_SIZE / 2.8, 0, Math.PI * 2)
  ctx.fill()

  ctx.font = '22px "Segoe UI Emoji", "Apple Color Emoji", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(food.value.emoji, centerX, centerY + 1)
}

function drawOverlay(ctx) {
  if (gameState.value !== 'lost') {
    return
  }

  ctx.fillStyle = 'rgba(2, 10, 18, 0.58)'
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  ctx.fillStyle = '#f8fafc'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = 'bold 34px Arial'
  ctx.fillText('Game Over', CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 12)

  ctx.font = '18px Arial'
  ctx.fillStyle = '#c9d5e4'
  ctx.fillText('Presiona reiniciar para jugar otra vez', CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 26)
}

function spawnFood() {
  const availableCells = []

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      // La comida solo puede aparecer en casillas libres.
      const isOnSnake = snake.value.some((segment) => segment.x === x && segment.y === y)
      if (!isOnSnake) {
        availableCells.push({ x, y })
      }
    }
  }

  if (availableCells.length === 0) {
    return null
  }

  const randomCell = availableCells[Math.floor(Math.random() * availableCells.length)]
  const randomEmoji = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]

  return {
    ...randomCell,
    emoji: randomEmoji
  }
}

function checkCollision(head) {
  const hitWall =
    head.x < 0 ||
    head.y < 0 ||
    head.x >= GRID_SIZE ||
    head.y >= GRID_SIZE

  if (hitWall) {
    return true
  }

  return snake.value.some((segment) => segment.x === head.x && segment.y === head.y)
}

function handleKeydown(event) {
  const newDirection = DIRECTIONS[event.key]
  if (!newDirection) {
    return
  }

  event.preventDefault()

  if (gameState.value !== 'running') {
    return
  }

  const isReverse =
    newDirection.x === direction.value.x * -1 &&
    newDirection.y === direction.value.y * -1

  // Evita que la serpiente se invierta en el mismo tick.
  if (isReverse) {
    return
  }

  nextDirection.value = newDirection
}

function clearGameLoop() {
  if (loopId.value) {
    window.clearInterval(loopId.value)
    loopId.value = null
  }
}

function pauseGame() {
  if (gameState.value !== 'running') {
    return
  }

  gameState.value = 'paused'
  clearGameLoop()
}

function resumeGame() {
  if (gameState.value !== 'paused') {
    return
  }

  gameState.value = 'running'
  clearGameLoop()
  loopId.value = window.setInterval(updateGame, tickRate.value)
}

function loadHighScore() {
  const storedValue = window.localStorage.getItem(HIGH_SCORE_STORAGE_KEY)
  const parsedValue = Number.parseInt(storedValue ?? '0', 10)
  highScore.value = Number.isNaN(parsedValue) ? 0 : parsedValue
}

function updateHighScore(nextScore) {
  if (nextScore <= highScore.value) {
    return
  }

  highScore.value = nextScore
  window.localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(nextScore))
}

function syncGameSpeed(previousTickRate) {
  if (gameState.value !== 'running' || tickRate.value === previousTickRate) {
    return
  }

  clearGameLoop()
  loopId.value = window.setInterval(updateGame, tickRate.value)
}

function ensureAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (AudioContextClass) {
      audioContext = new AudioContextClass()
    }
  }

  if (audioContext?.state === 'suspended') {
    audioContext.resume().catch(() => {})
  }
}

function playTone({ frequency, duration, type, volume, rampTo = 0.0001 }) {
  if (!audioContext) {
    return
  }

  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()
  const now = audioContext.currentTime

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, now)

  gainNode.gain.setValueAtTime(volume, now)
  gainNode.gain.exponentialRampToValueAtTime(rampTo, now + duration)

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  oscillator.start(now)
  oscillator.stop(now + duration)
}

function playEatSound() {
  ensureAudioContext()
  playTone({ frequency: 660, duration: 0.08, type: 'square', volume: 0.05 })

  window.setTimeout(() => {
    playTone({ frequency: 880, duration: 0.07, type: 'square', volume: 0.04 })
  }, 45)
}

function playLoseSound() {
  ensureAudioContext()
  playTone({ frequency: 260, duration: 0.18, type: 'sawtooth', volume: 0.06 })

  window.setTimeout(() => {
    playTone({ frequency: 140, duration: 0.28, type: 'triangle', volume: 0.05 })
  }, 110)
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

onMounted(() => {
  loadHighScore()
  initGame()
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  clearGameLoop()
  window.removeEventListener('keydown', handleKeydown)
  if (audioContext) {
    audioContext.close().catch(() => {})
    audioContext = null
  }
})
</script>

<style scoped>
.game-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 2rem;
  align-items: stretch;
}

.game-panel {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  height: 100%;
  padding: 2rem;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(8, 15, 28, 0.94));
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
}

.eyebrow {
  margin: 0;
  color: #7dd3fc;
  font-size: 0.85rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: #f8fafc;
  font-size: 2.3rem;
  line-height: 1;
}

.description,
.controls-card p {
  margin: 0;
  color: #cbd5e1;
  line-height: 1.6;
}

.stats-card,
.controls-card,
.message-box {
  padding: 1rem 1.1rem;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(148, 163, 184, 0.14);
}

.stat-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  color: #dbeafe;
}

.stat-row + .stat-row {
  margin-top: 0.85rem;
}

.stat-row strong {
  color: #f8fafc;
}

.stat-row strong.best-score {
  color: #facc15;
}

.stat-row strong.running {
  color: #7dff9b;
}

.stat-row strong.paused {
  color: #fbbf24;
}

.stat-row strong.won {
  color: #facc15;
}

.stat-row strong.lost {
  color: #fb7185;
}

.stat-row strong.idle {
  color: #93c5fd;
}

.game-button {
  border: none;
  border-radius: 16px;
  padding: 1rem 1.25rem;
  background: linear-gradient(135deg, #22c55e, #15803d);
  color: #f8fafc;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.18s ease, filter 0.18s ease;
}

.game-button:hover {
  transform: translateY(-1px);
  filter: brightness(1.06);
}

.game-button.secondary {
  background: linear-gradient(135deg, #f59e0b, #b45309);
}

.game-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  transform: none;
  filter: none;
}

.message-box {
  color: #dbeafe;
}

.message-box.active {
  border-color: rgba(34, 197, 94, 0.35);
}

.message-box.paused {
  border-color: rgba(245, 158, 11, 0.45);
  color: #fde68a;
}

.message-box.success {
  border-color: rgba(250, 204, 21, 0.45);
  color: #fef08a;
}

.message-box.danger {
  border-color: rgba(244, 63, 94, 0.45);
  color: #fecdd3;
}

.message-box p,
.controls-card h2 {
  margin: 0;
}

.controls-card h2 {
  margin-bottom: 0.5rem;
  color: #f8fafc;
  font-size: 1rem;
}

.canvas-shell {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  height: 100%;
  padding: 1.4rem;
  border-radius: 28px;
  background:
    radial-gradient(circle at top, rgba(34, 197, 94, 0.1), transparent 28%),
    linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(3, 9, 18, 0.98));
  border: 1px solid rgba(148, 163, 184, 0.16);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.canvas-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  width: 100%;
}

.game-canvas {
  display: block;
  max-width: 100%;
  border: 2px solid rgba(125, 211, 252, 0.18);
  border-radius: 18px;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.3);
}

@media (max-width: 980px) {
  .game-layout {
    grid-template-columns: 1fr;
  }

  .game-panel {
    order: 2;
  }

  .canvas-shell {
    order: 1;
  }

  .canvas-actions {
    grid-template-columns: 1fr;
    order: 2;
    width: 100%;
  }

  .game-canvas {
    order: 1;
  }

  .game-button {
    padding: 0.8rem 1rem;
    font-size: 0.95rem;
    border-radius: 14px;
  }
}
</style>
