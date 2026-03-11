<template>
  <div class="reset-password-container">
    <div class="reset-password-card">
      <h2>🔒 Réinitialiser le mot de passe</h2>
      <p class="subtitle">Entrez votre nouveau mot de passe</p>
      
      <form v-if="!success" @submit.prevent="resetPassword" class="reset-form">
        <div class="form-group">
          <label for="password">Nouveau mot de passe</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="Minimum 12 caractères"
            required
            minlength="12"
            class="form-input"
          />
          <div class="password-hint">
            Le mot de passe doit contenir au moins 12 caractères
          </div>
        </div>
        
        <div class="form-group">
          <label for="confirmPassword">Confirmer le mot de passe</label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            placeholder="Répétez le mot de passe"
            required
            class="form-input"
          />
        </div>
        
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
        
        <div class="form-actions">
          <button type="submit" :disabled="loading" class="btn-primary">
            {{ loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe' }}
          </button>
        </div>
      </form>
      
      <div v-else class="success-message">
        <div class="success-icon">✅</div>
        <h3>Mot de passe réinitialisé !</h3>
        <p>Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
        <button @click="goToLogin" class="btn-primary">
          Se connecter
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { API_V1_BASE_URL } from '../config/api'

const emit = defineEmits(['success'])

const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const success = ref(false)
const token = ref('')

onMounted(() => {
  // Extract token from URL query params
  const params = new URLSearchParams(window.location.search)
  token.value = params.get('token') || ''
  
  if (!token.value) {
    error.value = 'Lien de réinitialisation invalide'
  }
})

const resetPassword = async () => {
  error.value = ''
  
  if (password.value.length < 12) {
    error.value = 'Le mot de passe doit contenir au moins 12 caractères'
    return
  }
  
  if (password.value !== confirmPassword.value) {
    error.value = 'Les mots de passe ne correspondent pas'
    return
  }
  
  loading.value = true
  
  try {
    const res = await fetch(`${API_V1_BASE_URL}/auth/password-reset/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: token.value,
        newPassword: password.value
      }),
      credentials: 'include'
    })
    
    const data = await res.json()
    
    if (res.ok) {
      success.value = true
    } else {
      error.value = data.error || 'Une erreur est survenue'
    }
  } catch (err) {
    error.value = 'Erreur de connexion au serveur'
  } finally {
    loading.value = false
  }
}

const goToLogin = () => {
  emit('success')
  window.location.href = '/'
}
</script>

<style scoped>
.reset-password-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.reset-password-card {
  background: white;
  border-radius: 12px;
  padding: 40px;
  max-width: 450px;
  width: 100%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

h2 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 28px;
  text-align: center;
}

.subtitle {
  color: #666;
  text-align: center;
  margin-bottom: 30px;
  font-size: 14px;
}

.reset-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.form-input {
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 15px;
  transition: all 0.3s ease;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.password-hint {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.form-actions {
  margin-top: 10px;
}

.btn-primary {
  width: 100%;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  padding: 12px;
  background: #fee;
  border-left: 4px solid #f44;
  color: #c33;
  border-radius: 4px;
  font-size: 14px;
}

.success-message {
  text-align: center;
}

.success-icon {
  font-size: 60px;
  margin-bottom: 20px;
}

.success-message h3 {
  margin: 0 0 15px 0;
  color: #333;
}

.success-message p {
  color: #666;
  margin-bottom: 25px;
  line-height: 1.6;
}
</style>
