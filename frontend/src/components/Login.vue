<template>
  <div class="auth-box">
    <h2>{{ isSetup ? 'Setup Admin' : 'Login' }}</h2>
    
    <form @submit.prevent="submit">
      <div class="form-group">
        <label>Username</label>
        <input v-model="form.username" type="text" required minlength="3" />
      </div>
      
      <div class="form-group">
        <label>Password</label>
        <input v-model="form.password" type="password" required minlength="12" />
      </div>

      <div v-if="isSetup" class="form-group">
        <label>Confirm Password</label>
        <input v-model="form.confirmPassword" type="password" required minlength="12" />
      </div>

      <div v-if="isSetup" class="info-box">
        Create the initial Administrator account.
      </div>

      <div v-if="error" class="error">{{ error }}</div>
      <div v-if="success" class="success">{{ success }}</div>

      <button type="submit" :disabled="submitting">
        {{ isSetup ? 'Create Admin' : 'Login' }}
      </button>
    </form>

    <p v-if="!isSetup" class="forgot-password">
      <a href="#" @click.prevent="$emit('forgot-password')">
        Mot de passe oublié ?
      </a>
    </p>

    <p class="toggle-mode">
      <a href="#" @click.prevent="toggleMode">
        {{ isSetup ? 'Back to Login' : 'First time? Run Setup' }}
      </a>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { API_BASE_URL } from '../config/api'

const emit = defineEmits<{
  (e: 'login-success', user: any): void
  (e: 'forgot-password'): void
}>()

const isSetup = ref(false)
const submitting = ref(false)
const error = ref('')
const success = ref('')
const form = reactive({ username: '', password: '', confirmPassword: '' })

const toggleMode = () => {
  isSetup.value = !isSetup.value
  error.value = ''
  success.value = ''
  form.password = ''
  form.confirmPassword = ''
}

const submit = async () => {
  submitting.value = true
  error.value = ''
  success.value = ''

  if (isSetup.value && form.password !== form.confirmPassword) {
    error.value = "Passwords do not match"
    submitting.value = false
    return
  }
  
  const endpoint = isSetup.value ? '/api/v1/setup' : '/api/v1/auth/login'
  
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
      credentials: 'include'
    })
    
    const data = await res.json()
    
    if (!res.ok) throw new Error(data.error || 'Request failed')
    
    if (isSetup.value) {
      success.value = 'Admin created! Please login.'
      setTimeout(() => { isSetup.value = false }, 2000)
    } else {
      emit('login-success', data.user)
    }
  } catch (e: any) {
    error.value = e.message || 'An error occurred'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.auth-box { 
  background: var(--card-bg); 
  padding: 2rem; 
  border-radius: 8px; 
  box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
  max-width: 400px; 
  margin: 0 auto; 
  color: var(--text-color);
}
.form-group { margin-bottom: 1rem; }
label { display: block; margin-bottom: 0.5rem; font-weight: bold; }
input { 
  width: 100%; 
  padding: 8px; 
  border: 1px solid var(--border-color); 
  border-radius: 4px; 
  background: var(--input-bg);
  color: var(--text-color);
  box-sizing: border-box; 
}
button { 
  width: 100%; 
  padding: 10px; 
  background: var(--secondary-color); 
  color: white; 
  border: none; 
  border-radius: 4px; 
  cursor: pointer; 
  font-size: 1rem; 
  transition: opacity 0.2s;
}
button:disabled { opacity: 0.7; cursor: not-allowed; }
.error { color: #e74c3c; margin-bottom: 1rem; font-size: 0.9rem; }
.success { color: #2ecc71; margin-bottom: 1rem; font-size: 0.9rem; }
.info-box { 
  background: rgba(52, 152, 219, 0.1); 
  padding: 10px; 
  margin-bottom: 10px; 
  border-radius: 4px; 
  color: var(--primary-color); 
  font-size: 0.9rem; 
  border: 1px solid var(--primary-color);
}
.toggle-mode { text-align: center; margin-top: 1rem; font-size: 0.9rem; }
.toggle-mode a { color: var(--secondary-color); text-decoration: none; }
.forgot-password { text-align: center; margin-top: 0.75rem; font-size: 0.9rem; }
.forgot-password a { color: var(--secondary-color); text-decoration: none; }
.forgot-password a:hover { text-decoration: underline; }
</style>
