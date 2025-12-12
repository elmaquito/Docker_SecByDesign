<template>
  <div class="container">
    <header>
      <h1>Notimatic</h1>
      <button v-if="user" @click="logout" class="logout-btn">Logout ({{ user.username }})</button>
    </header>

    <main>
      <div v-if="loading" class="loading">Loading...</div>
      
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

// Check if user is already logged in (via cookie)
const checkAuth = async () => {
  try {
    const res = await fetch('http://127.0.0.1:3001/api/v1/notes', { 
      credentials: 'include'
    })

    if (res.ok) {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        user.value = JSON.parse(storedUser)
      }
    }
  } catch (e) {
    console.error('Auth check failed:', e)
  } finally {
    loading.value = false
  }
}

const handleLogin = (userData) => {
  user.value = userData
  localStorage.setItem('user', JSON.stringify(userData))
}

const logout = async () => {
  await fetch('http://127.0.0.1:3001/api/v1/auth/logout', { method: 'POST', credentials: 'include' })
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
