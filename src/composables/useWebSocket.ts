import { ref, onUnmounted } from 'vue'
import { gameStore } from '../stores/gameStore'
import { syncRoom } from '../api'

export function useWebSocket() {
  const ws = ref<WebSocket | null>(null)
  const connected = ref(false)

  function connect(roomId: string) {
    const userId = localStorage.getItem('userId')
    if (!userId) return

    // 关旧连接
    if (ws.value) {
      ws.value.close()
    }

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${location.host}/ws/game?userId=${userId}&roomId=${roomId}`
    const socket = new WebSocket(url)

    socket.onopen = () => {
      connected.value = true
      // 连接后拉同步
      doSync(roomId)
    }

    socket.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'pong') return
        if (msg.type === 'sync_state') return

        // 存入事件列表
        if (msg.data) {
          gameStore.addEvent({
            eventId: msg.data.eventId || Date.now(),
            type: msg.type,
            userId: msg.data.senderId,
            visibility: msg.data.visibility || 'PUBLIC',
            payload: msg.data.payload,
            serverTime: msg.data.serverTime
          })
        }

        // 特定事件触发页面刷新
        handleEvent(msg)
      } catch (err) {
        console.warn('WS parse error', err)
      }
    }

    socket.onclose = () => {
      connected.value = false
      // 自动重连
      setTimeout(() => connect(roomId), 3000)
    }

    ws.value = socket
  }

  function handleEvent(msg: any) {
    // 页面硬刷新由具体组件监听 store.events 实现
  }

  async function doSync(roomId: string) {
    try {
      const data = await syncRoom(roomId, gameStore.lastEventId || undefined)
      if (data.roomState) {
        gameStore.setRoom(data.roomState)
      }
      if (data.players) {
        gameStore.setPlayers(data.players)
      }
      if (data.missedEvents) {
        for (const ev of data.missedEvents) {
          gameStore.addEvent(ev)
        }
      }
    } catch (e) {
      console.warn('Sync failed', e)
    }
  }

  function disconnect() {
    if (ws.value) {
      ws.value.close()
      ws.value = null
    }
    connected.value = false
  }

  onUnmounted(() => {
    disconnect()
  })

  return { ws, connected, connect, disconnect, doSync }
}
