<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '../api'
import { gameStore } from '../stores/gameStore'

const router = useRouter()
const account = ref('')
const password = ref('')
const error = ref('')

async function doLogin() {
  try {
    error.value = ''
    const data = await login(account.value, password.value)
    localStorage.setItem('token', data.refreshToken)
    localStorage.setItem('userId', String(data.userId))
    gameStore.setUser(data)
    router.push('/lobby')
  } catch (e: any) {
    error.value = e.message || '登录失败'
  }
}
</script>

<template>
  <div class="page login-page">
    <div class="login-card">
      <h1>🎭 剧本杀</h1>
      <p class="subtitle">AI 狼人杀·角色扮演</p>
      <div class="form">
        <input v-model="account" placeholder="账号" @keyup.enter="doLogin" />
        <input v-model="password" type="password" placeholder="密码" @keyup.enter="doLogin" />
        <button @click="doLogin">登录</button>
        <p v-if="error" class="error">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  display: flex; align-items: center; justify-content: center;
  min-height: 100vh; background: #1a1a2e;
}
.login-card {
  background: #16213e; padding: 40px; border-radius: 16px;
  width: 340px; text-align: center; color: #e0e0e0;
}
.login-card h1 { margin: 0 0 4px; font-size: 28px; }
.subtitle { color: #888; margin: 0 0 24px; font-size: 14px; }
.form input {
  display: block; width: 100%; margin-bottom: 12px;
  padding: 12px; border: 1px solid #333; border-radius: 8px;
  background: #0f3460; color: #fff; font-size: 14px; box-sizing: border-box;
}
.form button {
  width: 100%; padding: 12px; border: none; border-radius: 8px;
  background: #e94560; color: #fff; font-size: 16px; cursor: pointer;
}
.form button:hover { background: #d63851; }
.error { color: #e94560; font-size: 13px; margin-top: 12px; }
</style>
