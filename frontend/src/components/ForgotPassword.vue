<template>
  <div class="forgot-password-container">
    <div class="forgot-password-card">
      <h2>🔑 Mot de passe oublié</h2>
      <p class="subtitle">Entrez votre nom d'utilisateur pour recevoir un lien de réinitialisation.</p>
      
      <form v-if="!sent" @submit.prevent="requestReset" class="reset-form">
        <div class="form-group">
          <label for="username">Nom d'utilisateur</label>
          <input
            id="username"
            v-model="username"
            type="text"
            placeholder="Votre nom d'utilisateur"
            required
            class="form-input"
          />
        </div>
        
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
        
        <div class="form-actions">
          <button type="button" @click="$emit('back')" class="btn-secondary">
            Retour à la connexion
          </button>
          <button type="submit" :disabled="loading" class="btn-primary">
            {{ loading ? 'Envoi...' : 'Envoyer le lien' }}
          </button>
        </div>
      </form>
      
      <div v-else class="success-message">
        <div class="success-icon">✅</div>
        <h3>Lien envoyé !</h3>
        <p>Si un compte existe avec ce nom d'utilisateur, vous recevrez un lien de réinitialisation.</p>
        <p v-if="resetLink" class="dev-link">
          <strong>Lien de développement:</strong><br/>
          <a :href="resetLink">{{ resetLink }}</a>
        </p>
        <button @click="$emit('back')" class="btn-primary">
          Retour à la connexion
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['back'])

const username = ref('')
const loading = ref(false)
const error = ref('')
const sent = ref(false)
const resetLink = ref('')

const requestReset = async () => {
  if (!username.value.trim()) {
    error.value = 'Veuillez entrer votre nom d\'utilisateur'
    return
  }
  
  loading.value = true
  error.value = ''
  
  try {
    const res = await fetch('http://127.0.0.1:3001/api/v1/auth/password-reset/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value }),
      credentials: 'include'
    })
    
    const data = await res.json()
    
    if (res.ok) {
      sent.value = true
      resetLink.value = data.resetLink || '' // Only in dev
    } else {
      error.value = data.error || 'Une erreur est survenue'
    }
  } catch (err) {
    error.value = 'Erreur de connexion au serveur'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.forgot-password-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.forgot-password-card {
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

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 10px;
}

.btn-primary,
.btn-secondary {
  flex: 1;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
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

.btn-secondary {
  background: #f5f5f5;
  color: #666;
}

.btn-secondary:hover {
  background: #e0e0e0;
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
  margin-bottom: 15px;
  line-height: 1.6;
}

.dev-link {
  background: #f9f9f9;
  padding: 15px;
  border-radius: 8px;
  font-size: 12px;
  word-break: break-all;
}

.dev-link a {
  color: #667eea;
  text-decoration: none;
}

.dev-link a:hover {
  text-decoration: underline;
}
</style>
