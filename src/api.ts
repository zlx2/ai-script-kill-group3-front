// API wrapper — 用 fetch 封装后端接口
const BASE = '' // 开发环境通过 proxy 转发

function getToken(): string | null {
  return localStorage.getItem('token')
}

function getUserId(): number | null {
  const uid = localStorage.getItem('userId')
  return uid ? parseInt(uid) : null
}

async function request<T>(method: string, url: string, body?: any): Promise<T> {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers['Authorization'] = token
  const userId = getUserId()
  if (userId) headers['userId'] = String(userId)
  if (body) headers['Content-Type'] = 'application/json'

  const res = await fetch(BASE + url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })
  const json = await res.json()
  if (json.code !== 200) throw new Error(json.msg || '请求失败')
  return json.data as T
}

// ============ 用户相关 ============
export async function login(account: string, password: string): Promise<{ token: string; userinfo: any }> {
  return request<any>('POST', '/api/auth/login', { account, password })
}

// ============ 房间相关 ============
export async function getRoomList(): Promise<any[]> {
  return request<any[]>('GET', '/api/room/list')
}

export async function createRoom(scriptId: number, roomName: string, password: string): Promise<any> {
  return request<any>('POST', '/api/room/create', { scriptId, roomName, password })
}

export async function joinRoom(roomNo: string, password: string): Promise<string> {
  return request<string>('POST', '/api/room/join', { roomNo, password })
}

export async function leaveRoom(roomId: string): Promise<void> {
  await request<any>('POST', `/api/room/leave?roomId=${roomId}`)
}

export async function readyRoom(roomId: string): Promise<void> {
  await request<any>('POST', `/api/room/ready?roomId=${roomId}`)
}

export async function startGame(roomId: string): Promise<void> {
  await request<any>('POST', `/api/room/start?roomId=${roomId}`)
}

export async function getRoomDetail(roomId: string): Promise<any> {
  return request<any>('GET', `/api/room/${roomId}`)
}

export async function getAvailableRoles(roomId: string): Promise<any[]> {
  return request<any[]>('GET', `/api/room/${roomId}/available-roles`)
}

export async function selectRole(roomId: string, roleId: number): Promise<void> {
  await request<any>('POST', `/api/room/select-role?roomId=${roomId}&roleId=${roleId}`)
}

// ============ 游戏命令 ============
export async function sendCommand(roomId: string, type: string, payload?: any): Promise<void> {
  await request<any>('POST', '/api/game/command', {
    roomId,
    type,
    payload: payload || {}
  })
}

// ============ 同步 ============
export async function syncRoom(roomId: string, lastEventId?: number): Promise<any> {
  let url = `/api/game/sync?roomId=${roomId}`
  if (lastEventId) url += `&lastEventId=${lastEventId}`
  return request<any>('GET', url)
}
