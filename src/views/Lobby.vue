<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getRoomList, createRoom, joinRoom } from '../api'
import { useWebSocket } from '../composables/useWebSocket'

const router = useRouter()
const rooms = ref<any[]>([])
const ws = useWebSocket()

// 大厅连接
onMounted(async () => {
  ws.connect('lobby')
  await loadRooms()
})

async function loadRooms() {
  try {
    rooms.value = await getRoomList()
  } catch (e) {
    console.warn(e)
  }
}

// 创建房间
const showCreate = ref(false)
const roomName = ref('')
const password = ref('')
const scriptId = ref(2)

async function doCreate() {
  try {
    const result = await createRoom(scriptId.value, roomName.value || '默认房间', password.value)
    ws.disconnect()
    router.push(`/room/${result.roomId}`)
  } catch (e: any) {
    alert(e.message)
  }
}

// 加入房间
const showJoin = ref(false)
const joinNo = ref('')
const joinPwd = ref('')

async function doJoin() {
  try {
    const roomId = await joinRoom(joinNo.value, joinPwd.value)
    ws.disconnect()
    router.push(`/room/${roomId}`)
  } catch (e: any) {
    alert(e.message)
  }
}

async function enterRoom(room: any) {
  if (room.roomStatus !== 0) return
  if (room.roomStatus === 2) return
  
  if (room.hasPassword) {
    joinNo.value = room.roomNo
    showJoin.value = true
    return
  }
  
  try {
    const roomId = await joinRoom(room.roomNo, '')
    ws.disconnect()
    router.push(`/room/${roomId}`)
  } catch (e: any) {
    alert(e.message || '加入房间失败')
  }
}
</script>

<template>
  <div class="page lobby-page">
    <header>
      <h1>🎭 游戏大厅</h1>
      <div class="actions">
        <button class="btn" @click="showCreate = true">创建房间</button>
        <button class="btn" @click="showJoin = true">加入房间</button>
        <button class="btn btn-refresh" @click="loadRooms">刷新</button>
      </div>
    </header>

    <!-- 房间列表 -->
    <div class="room-list">
      <div v-for="room in rooms" :key="room.roomId" class="room-card" @click="enterRoom(room)">
        <div class="room-info">
          <h3>{{ room.roomName }}</h3>
          <p class="meta">{{ room.scriptName || '未知剧本' }} · {{ room.currentPlayer }}/{{ room.playerCount || '?' }}人</p>
        </div>
        <div class="room-status">
          <span :class="'badge badge-' + room.roomStatus">
            {{ room.roomStatus === 0 ? '等待中' : room.roomStatus === 1 ? '游戏中' : '已结束' }}
          </span>
          <span v-if="room.hasPassword" class="lock">🔒</span>
        </div>
      </div>
      <div v-if="rooms.length === 0" class="empty">暂无房间，创建或加入一个吧~</div>
    </div>

    <!-- 创建房间弹窗 -->
    <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
      <div class="modal">
        <h2>创建房间</h2>
        <input v-model="roomName" placeholder="房间名称" />
        <input v-model="password" placeholder="密码（可选）" />
        <div class="modal-actions">
          <button class="btn" @click="doCreate">创建</button>
          <button class="btn btn-cancel" @click="showCreate = false">取消</button>
        </div>
      </div>
    </div>

    <!-- 加入房间弹窗 -->
    <div v-if="showJoin" class="modal-overlay" @click.self="showJoin = false">
      <div class="modal">
        <h2>加入房间</h2>
        <input v-model="joinNo" placeholder="房间号" />
        <input v-model="joinPwd" placeholder="密码（可选）" />
        <div class="modal-actions">
          <button class="btn" @click="doJoin">加入</button>
          <button class="btn btn-cancel" @click="showJoin = false">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lobby-page { max-width: 800px; margin: 0 auto; padding: 20px; color: #e0e0e0; }
header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
header h1 { margin: 0; }
.actions { display: flex; gap: 8px; }
.btn {
  padding: 8px 16px; border: none; border-radius: 8px;
  background: #e94560; color: #fff; cursor: pointer; font-size: 14px;
}
.btn-cancel { background: #333; }
.btn-refresh { background: #0f3460; }
.room-list { display: flex; flex-direction: column; gap: 8px; }
.room-card {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px; background: #16213e; border-radius: 12px;
  cursor: pointer; transition: background 0.2s;
}
.room-card:hover { background: #1a2746; }
.room-info h3 { margin: 0 0 4px; font-size: 16px; }
.room-info .meta { margin: 0; color: #888; font-size: 13px; }
.room-status { display: flex; align-items: center; gap: 8px; }
.badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; }
.badge-0 { background: #2d6a4f; }
.badge-1 { background: #e07c24; }
.badge-2 { background: #555; }
.lock { font-size: 16px; }
.empty { text-align: center; padding: 40px; color: #666; }

.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6);
  display: flex; align-items: center; justify-content: center;
}
.modal {
  background: #16213e; padding: 24px; border-radius: 16px;
  width: 320px; color: #e0e0e0;
}
.modal input {
  display: block; width: 100%; margin-bottom: 12px;
  padding: 10px; border: 1px solid #333; border-radius: 8px;
  background: #0f3460; color: #fff; box-sizing: border-box;
}
.modal-actions { display: flex; gap: 8px; justify-content: flex-end; }
</style>
