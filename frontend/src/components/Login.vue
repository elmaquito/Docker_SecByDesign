<template>
  <div class="auth-box">
    <h2>{{ isRegister ? 'Create Account' : 'Login' }}</h2>
    
    <form @submit.prevent="submit">
      <div class="form-group">
        <label>Username</label>
        <input v-model="form.username" type="text" required minlength="3" />
      </div>
      
      <div class="form-group">
        <label>Password</label>
        <input v-model="form.password" type="password" required minlength="12" />
        <small v-if="isRegister">Min 12 chars, alphanumeric.</small>
      </div>

      <div v-if="error" class="error">{{ error }}</div>

      <button type="submit" :disabled="submitting">
        {{ isRegister ? 'Register' : 'Login' }}
      </button>
    </form>

    <p class="toggle-mode">
      {{ isRegister ? 'Already have an account?' : 'New to Notimatic?' }}
      <a href="#" @click.prevent="isRegister = !isRegister">
        {{ isRegister ? 'Login here' : 'Register here' }}
      </a>
    </p>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'

const emit = defineEmits(['login-success'])

const isRegister = ref(false)
const submitting = ref(false)
const error = ref('')
const form = reactive({ username: '', password: '' })

const submit = async () => {
  submitting.value = true
  error.value = ''
  
  const endpoint = isRegister.value ? '/auth/register' : '/auth/login'
  
  try {
    const res = await fetch(`http://localhost:3000${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
      credentials: 'include' // Important for cookies
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || 'Authentication failed')
    }

    if (isRegister.value) {
      // Auto login after register or ask user to login?
      // Let's switch to login mode
      isRegister.value = false
      error.value = 'Account created! Please login.'
      form.password = ''
    } else {
      emit('login-success', data.user)
    }
  } catch (e) {
    error.value = e.message
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.auth-box { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto; }
.form-group { margin-bottom: 1rem; }
label { display: block; margin-bottom: 0.5rem; font-weight: bold; }
input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
button { width: 100%; padding: 10px; background: #2ed573; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; }
button:disabled { opacity: 0.7; }
.error { color: red; margin-bottom: 1rem; font-size: 0.9rem; }
.toggle-mode { text-align: center; margin-top: 1rem; font-size: 0.9rem; }
</style>
