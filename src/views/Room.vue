<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getRoomDetail, getAvailableRoles, selectRole, startGame, readyRoom, sendCommand, syncRoom } from '../api'
import { useWebSocket } from '../composables/useWebSocket'
import { gameStore } from '../stores/gameStore'

const route = useRoute()
const router = useRouter()
const roomId = route.params.id as string

// 状态
const room = ref<any>(null)
const players = ref<any[]>([])
const roles = ref<any[]>([])
const events = ref<any[]>([])
const userId = parseInt(localStorage.getItem('userId') || '0')
const myRole = computed(() => players.value.find(p => p.userId === userId))

const ws = useWebSocket()

// 连接 WebSocket
onMounted(async () => {
  ws.connect(roomId)
  await loadRoom()
})

watch(() => gameStore.roomPlayers, (val) => {
  players.value = val
}, { immediate: true })

watch(() => gameStore.currentRoom, (val) => {
  if (val) room.value = val
}, { immediate: true })

watch(() => gameStore.events.length, () => {
  events.value = [...gameStore.events]
})

const currentPhase = computed(() => room.value?.currentStage || 'waiting')
const isHost = computed(() => room.value?.hostId === userId)
const isReady = computed(() => myRole.value?.isReady ?? false)

async function loadRoom() {
  try {
    const data = await getRoomDetail(roomId)
    room.value = data
    players.value = data.players || []
    gameStore.setRoom(data)
    gameStore.setPlayers(data.players || [])
  } catch (e: any) {
    alert('房间不存在或已结束')
    router.push('/lobby')
  }
}

async function doReady() {
  try {
    await readyRoom(roomId)
    await loadRoom()
  } catch (e: any) { alert(e.message) }
}

async function doStart() {
  try {
    await startGame(roomId)
    await loadRoom()
  } catch (e: any) { alert(e.message) }
}

async function doSelectRole(roleId: number) {
  try {
    await selectRole(roomId, roleId)
    await loadRoom()
  } catch (e: any) { alert(e.message) }
}

async function doAdvance() {
  try {
    await sendCommand(roomId, 'ADVANCE_PHASE', {})
    await loadRoom()
  } catch (e: any) { alert(e.message) }
}

async function doVote(targetRoleId: number) {
  try {
    await sendCommand(roomId, 'SUBMIT_VOTE', { targetRoleId })
    await loadRoom()
  } catch (e: any) { alert(e.message) }
}

async function doSearchClue(clueId: number) {
  try {
    await sendCommand(roomId, 'SEARCH_CLUE', { clueId })
  } catch (e: any) { alert(e.message) }
}

// 离开
async function doLeave() {
  ws.disconnect()
  gameStore.reset()
  router.push('/lobby')
}

function phaseLabel(): string {
  const map: Record<string, string> = {
    waiting: '⏳ 等待玩家',
    select_role: '🎭 选择角色',
    reading: '📖 阅读剧本',
    discussion_1: '💬 第一轮讨论',
    searching: '🔍 搜证阶段',
    discussion_2: '💬 第二轮讨论',
    voting: '🗳️ 投票阶段',
    review: '📝 复盘',
    finished: '🏁 游戏结束'
  }
  return map[currentPhase.value] || currentPhase.value
}
</script>

<template>
  <div class="page room-page">
    <!-- 顶栏 -->
    <header>
      <div class="header-left">
        <h2>{{ room?.roomName || '房间' }}</h2>
        <span class="phase-badge">{{ phaseLabel() }}</span>
      </div>
      <div class="header-right">
        <span class="player-count">👥 {{ players.length }}人</span>
        <button class="btn btn-leave" @click="doLeave">退出</button>
      </div>
    </header>

    <!-- 房间号 -->
    <div class="room-no" v-if="room">房间号：<strong>{{ room.roomNo }}</strong></div>

    <!-- ============ 等待阶段 ============ -->
    <div v-if="currentPhase === 'waiting'" class="phase-waiting">
      <div class="player-grid">
        <div v-for="p in players" :key="p.userId" class="player-card" :class="{ host: p.isHost, ready: p.isReady }">
          <div class="avatar">{{ p.nickname?.[0] || '?' }}</div>
          <div class="name">{{ p.nickname }}</div>
          <div class="status">{{ p.isHost ? '👑房主' : p.isReady ? '✅ 已准备' : '⏳ 未准备' }}</div>
        </div>
      </div>
      <div class="actions">
        <button class="btn btn-primary" @click="doReady">{{ isReady ? '取消准备' : '准备' }}</button>
        <button v-if="isHost" class="btn btn-start" @click="doStart">开始游戏</button>
      </div>
    </div>

    <!-- ============ 选择角色 ============ -->
    <div v-if="currentPhase === 'select_role'" class="phase-select-role">
      <h3>选择你的角色</h3>
      <div class="role-grid">
        <div v-for="r in roles" :key="r.roleId" class="role-card" @click="doSelectRole(r.roleId)">
          <div class="role-name">{{ r.roleName }}</div>
          <div class="role-desc">{{ r.description || '' }}</div>
        </div>
      </div>
      <button v-if="roles.length === 0" class="btn" @click="loadRoom(); (async () => { roles.value = await getAvailableRoles(roomId) })()">加载可选角色</button>
    </div>

    <!-- ============ 游戏阶段通用 ============ -->
    <div v-if="!['waiting', 'select_role'].includes(currentPhase)" class="phase-game">
      <!-- 玩家列表 -->
      <div class="players-row">
        <div v-for="p in players" :key="p.userId" class="player-tag" :class="{ active: p.roleId }">
          {{ p.nickname }} {{ p.roleName ? '(' + p.roleName + ')' : '' }}
        </div>
      </div>

      <!-- 阶段操作 -->
      <div class="phase-content">
        <!-- 讨论阶段 -->
        <div v-if="currentPhase.startsWith('discussion')" class="phase-chat">
          <p class="hint">💬 讨论阶段，和其他玩家交流吧</p>
          <div class="chat-box">
            <div v-for="ev in events.filter(e => e.type === 'CHAT_SENT').slice(-20)" :key="ev.eventId" class="chat-msg">
              <strong>{{ ev.userId }}:</strong> {{ ev.payload?.content || '' }}
            </div>
          </div>
        </div>

        <!-- 搜证阶段 -->
        <div v-if="currentPhase === 'searching'" class="phase-search">
          <p class="hint">🔍 搜证阶段，点击线索进行搜证</p>
          <button class="btn" @click="doSearchClue(1)">搜证</button>
        </div>

        <!-- 投票阶段 -->
        <div v-if="currentPhase === 'voting'" class="phase-vote">
          <p class="hint">🗳️ 投票阶段，选择你怀疑的人</p>
          <div class="vote-grid">
            <div v-for="p in players.filter(pl => pl.userId !== userId)" :key="p.userId" class="vote-card" @click="doVote(p.roleId || 0)">
              <div class="vote-name">{{ p.nickname }}</div>
              <div class="vote-role">{{ p.roleName || '?' }}</div>
            </div>
          </div>
        </div>

        <!-- 复盘/结束 -->
        <div v-if="currentPhase === 'review' || currentPhase === 'finished'" class="phase-review">
          <p class="hint">📝 游戏结束，查看复盘</p>
        </div>
      </div>

      <!-- 房主推进按钮 -->
      <div class="actions" v-if="isHost && !['review', 'finished'].includes(currentPhase)">
        <button class="btn btn-primary" @click="doAdvance">推进到下一阶段</button>
      </div>
    </div>

    <!-- 事件日志 -->
    <div class="event-log">
      <div v-for="ev in events.slice(-10)" :key="ev.eventId" class="event-item">
        [{{ ev.type }}] {{ ev.payload ? JSON.stringify(ev.payload).slice(0, 60) : '' }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.room-page { max-width: 900px; margin: 0 auto; padding: 16px; color: #e0e0e0; }
header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.header-left h2 { margin: 0; font-size: 20px; }
.header-right { display: flex; align-items: center; gap: 12px; }
.phase-badge { background: #e94560; padding: 4px 12px; border-radius: 12px; font-size: 13px; }
.player-count { font-size: 14px; color: #888; }
.room-no { margin-bottom: 16px; color: #888; font-size: 14px; }

.btn {
  padding: 8px 16px; border: none; border-radius: 8px;
  background: #0f3460; color: #fff; cursor: pointer; font-size: 14px;
}
.btn-primary { background: #e94560; }
.btn-start { background: #2d6a4f; }
.btn-leave { background: #555; }
.actions { display: flex; gap: 8px; margin-top: 16px; justify-content: center; }

/* 玩家网格 */
.player-grid, .role-grid, .vote-grid { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px; }
.player-card, .role-card, .vote-card {
  background: #16213e; border-radius: 12px; padding: 16px;
  text-align: center; width: 120px; cursor: pointer; transition: background 0.2s;
}
.player-card:hover, .role-card:hover, .vote-card:hover { background: #1a2746; }
.player-card.host { border: 2px solid #f0c040; }
.player-card.ready { border: 2px solid #2d6a4f; }
.avatar {
  width: 48px; height: 48px; border-radius: 50%; background: #0f3460;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 8px; font-size: 20px;
}
.name, .role-name { font-size: 14px; font-weight: bold; }
.status { font-size: 12px; color: #888; margin-top: 4px; }
.role-desc { font-size: 11px; color: #666; margin-top: 4px; }

/* 玩家标签 */
.players-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.player-tag {
  padding: 4px 12px; background: #16213e; border-radius: 16px; font-size: 13px;
}
.player-tag.active { border: 1px solid #e94560; }

/* 聊天 */
.chat-box {
  background: #111; border-radius: 12px; padding: 12px; height: 200px; overflow-y: auto;
  margin-top: 8px;
}
.chat-msg { margin-bottom: 6px; font-size: 14px; }

.hint { color: #888; font-size: 14px; text-align: center; margin: 20px 0; }

/* 事件日志 */
.event-log {
  margin-top: 16px; padding: 8px; background: #111; border-radius: 8px;
  max-height: 150px; overflow-y: auto; font-size: 11px; color: #666;
}
.event-item { margin-bottom: 2px; }
</style>
