<template>
  <div class="container">
    <header>
      <h1>Notimatic</h1>
      <div class="header-actions">
        <button @click="toggleTheme" class="theme-toggle">
          {{ isDarkMode ? '☀️' : '🌙' }}
        </button>
        <button v-if="user" @click="logout" class="logout-btn">Logout ({{ user.username }})</button>
      </div>
    </header>

    <main>
      <Loader v-if="loading" text="Chargement de Notimatic..." />
      
      <div v-else-if="!user">
        <ForgotPassword v-if="showForgotPassword" @back="showForgotPassword = false" />
        <ResetPassword v-else-if="showResetPassword" @success="handleResetSuccess" />
        <Login v-else @login-success="handleLogin" @forgot-password="showForgotPassword = true" />
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
import ForgotPassword from './components/ForgotPassword.vue'
import ResetPassword from './components/ResetPassword.vue'
import Loader from './components/Loader.vue'
import { API_V1_BASE_URL } from './config/api.js'
import { useTheme } from './composables/useTheme.js'

const { isDarkMode, toggleTheme } = useTheme()
const user = ref(null)
const loading = ref(true)
const showForgotPassword = ref(false)
const showResetPassword = ref(false)

// Check if this is a password reset URL
onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  if (params.get('token')) {
    showResetPassword.value = true
    loading.value = false
  } else {
    checkAuth()
  }
})

// Check if user is already logged in (via cookie)
const checkAuth = async () => {
  try {
    const res = await fetch(`${API_V1_BASE_URL}/notes`, { 
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

const handleResetSuccess = () => {
  showResetPassword.value = false
  // Clear URL params
  window.history.pushState({}, '', '/')
}

const logout = async () => {
  await fetch(`${API_V1_BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' })
  user.value = null
  localStorage.removeItem('user')
}
</script>

<style>
:root {
  --primary-color: #3498db;
  --secondary-color: #667eea;
  --bg-color: #f5f7fa;
  --text-color: #2c3e50;
  --text-secondary: #6c757d;
  --header-text: #2c3e50;
  --card-bg: white;
  --header-bg: white;
  --input-bg: white;
  --border-color: #ddd;
}

:root.dark-mode {
  --bg-color: #1a1a1a;
  --text-color: #e0e0e0;
  --text-secondary: #a0a0a0;
  --header-text: #e0e0e0;
  --card-bg: #2d2d2d;
  --header-bg: #333;
  --input-bg: #333;
  --border-color: #444;
}

* {
  box-sizing: border-box;
}

body { 
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  margin: 0;
  background: var(--bg-color);
  color: var(--text-color);
  min-height: 100vh;
  transition: background-color 0.3s, color 0.3s;
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
  background: var(--header-bg);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: background-color 0.3s;
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

/* Header Actions */
.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.theme-toggle {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 5px;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.theme-toggle:hover {
  background-color: rgba(0, 0, 0, 0.05);
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
  background: var(--card-bg);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  transition: background-color 0.3s;
}

.loading {
  text-align: center;
  padding: 3rem;
  font-size: 1.2rem;
  color: var(--text-color);
}
</style>
