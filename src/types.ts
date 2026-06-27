// 共享类型定义
export interface UserInfo {
  id: number
  nickname: string
  avatar?: string
}

export interface RoomInfo {
  roomId: string
  roomNo: string
  roomName: string
  roomStatus: number
  currentStage: string
  currentRound: number
  scriptId: number
  hostId: number
  hostNickname?: string
  hasPassword: boolean
  scriptName?: string
  scriptCover?: string
  playerCount?: number
  currentPlayer: number
  players: PlayerInfo[]
}

export interface PlayerInfo {
  userId: number
  nickname: string
  avatar?: string
  roleId?: number
  roleName?: string
  isReady: boolean
  isHost: boolean
  online: boolean
}

export interface ScriptRole {
  roleId: number
  roleName: string
  description?: string
}

export interface GameEvent {
  eventId: number
  type: string
  userId?: number
  visibility: string
  payload: any
  serverTime: number
}

export interface SyncResult {
  roomState: {
    roomId: string
    roomStatus: number
    currentStage: string
    currentRound: number
    scriptId: number
    hostId: number
  }
  players: PlayerInfo[]
  missedEvents: GameEvent[]
  serverTime: number
}

export const GamePhases = [
  'waiting',
  'select_role',
  'reading',
  'discussion_1',
  'searching',
  'discussion_2',
  'voting',
  'review',
  'finished'
] as const

export type GamePhase = typeof GamePhases[number]
