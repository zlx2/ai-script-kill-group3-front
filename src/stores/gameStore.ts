import { reactive } from 'vue'

// 简单全局状态
export const gameStore = reactive({
  user: null as any | null,
  currentRoom: null as any | null,
  roomPlayers: [] as any[],
  events: [] as any[],
  lastEventId: 0,

  setUser(u: any) {
    this.user = u
  },

  setRoom(room: any) {
    this.currentRoom = room
  },

  setPlayers(players: any[]) {
    this.roomPlayers = players
  },

  addEvent(ev: any) {
    this.events.push(ev)
    if (ev.eventId > this.lastEventId) {
      this.lastEventId = ev.eventId
    }
  },

  reset() {
    this.currentRoom = null
    this.roomPlayers = []
    this.events = []
    this.lastEventId = 0
  }
})
