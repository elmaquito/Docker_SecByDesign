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
* {
  box-sizing: border-box;
}

body { 
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  margin: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1.5rem 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

header h1 {
  margin: 0;
  color: #2c3e50;
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.logout-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  cursor: pointer;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.logout-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

main {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.loading {
  text-align: center;
  padding: 3rem;
  font-size: 1.2rem;
  color: #495057;
}
</style>
