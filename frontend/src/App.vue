<template>
  <div class="container">
    <header>
      <h1>Notimatic</h1>
      <button v-if="user" @click="logout" class="logout-btn">Logout ({{ user.username }})</button>
    </header>

    <main>
      <div v-if="errorMsg" style="color: red; background: white; padding: 10px; margin-bottom: 10px; border: 1px solid red;">
        Debug Error: {{ errorMsg }}
      </div>

      <div v-if="loading" class="loading">
        Loading authentication status... (Check console if stuck)
      </div>
      
      <div v-else-if="!user">
        <Login @login-success="handleLogin" />
      </div>

      <div v-else>
        <Dashboard :user="user" />
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Login from './components/Login.vue'
import Dashboard from './components/Dashboard.vue'

const user = ref(null)
const loading = ref(true)
const errorMsg = ref('')

// Check if user is already logged in (via cookie)
const checkAuth = async () => {
  console.log('Checking auth...')
  try {
    // Add a timeout to prevent infinite loading
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000) // 2 second timeout

    const res = await fetch('http://localhost:3000/notes', { 
      credentials: 'include',
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    console.log('Auth response:', res.status)
    if (res.ok) {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        user.value = JSON.parse(storedUser)
      }
    }
  } catch (e) {
    console.error('Auth check failed:', e)
    errorMsg.value = e.message
  } finally {
    loading.value = false
  }
}

const handleLogin = (userData) => {
  user.value = userData
  localStorage.setItem('user', JSON.stringify(userData))
}

const logout = async () => {
  await fetch('http://localhost:3000/auth/logout', { method: 'POST', credentials: 'include' })
  user.value = null
  localStorage.removeItem('user')
}

onMounted(() => {
  checkAuth()
})
</script>

<style>
body { font-family: sans-serif; margin: 0; background: #f0f2f5; }
.container { max-width: 800px; margin: 0 auto; padding: 20px; }
header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.logout-btn { background: #ff4757; color: white; border: none; padding: 8px 16px; cursor: pointer; border-radius: 4px; }
</style>
