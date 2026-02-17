<template>
  <div class="account-settings">
    <div class="settings-header">
      <h2>⚙️ Paramètres du compte</h2>
      <button @click="$emit('close')" class="close-btn">×</button>
    </div>
    
    <div v-if="user.role === 'student'" class="access-denied">
      <p>Les étudiants ne peuvent pas modifier leurs informations de compte.</p>
      <button @click="$emit('close')" class="btn-primary">Fermer</button>
    </div>
    
    <form v-else @submit.prevent="updateAccount" class="settings-form">
      <div class="form-section">
        <h3>Informations personnelles</h3>
        
        <div class="form-group">
          <label for="username">Nom d'utilisateur</label>
          <input
            id="username"
            v-model="accountInfo.username"
            type="text"
            disabled
            class="form-input"
          />
          <div class="input-hint">Le nom d'utilisateur ne peut pas être modifié</div>
        </div>
        
        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            placeholder="votre.email@exemple.com"
            class="form-input"
          />
        </div>
        
        <div class="form-group">
          <label for="phone">Téléphone</label>
          <input
            id="phone"
            v-model="form.phone"
            type="tel"
            placeholder="+33 6 XX XX XX XX"
            maxlength="20"
            class="form-input"
          />
        </div>
      </div>
      
      <div class="form-section">
        <h3>Changer le mot de passe</h3>
        
        <div class="form-group">
          <label for="password">Nouveau mot de passe (optionnel)</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            placeholder="Minimum 12 caractères"
            minlength="12"
            class="form-input"
          />
          <div class="input-hint">Laissez vide pour conserver le mot de passe actuel</div>
        </div>
        
        <div v-if="form.password" class="form-group">
          <label for="confirmPassword">Confirmer le nouveau mot de passe</label>
          <input
            id="confirmPassword"
            v-model="form.confirmPassword"
            type="password"
            placeholder="Répétez le mot de passe"
            class="form-input"
          />
        </div>
      </div>
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
      
      <div v-if="success" class="success-message">
        {{ success }}
      </div>
      
      <div class="form-actions">
        <button type="button" @click="$emit('close')" class="btn-secondary">
          Annuler
        </button>
        <button type="submit" :disabled="saving" class="btn-primary">
          {{ saving ? 'Enregistrement...' : 'Enregistrer les modifications' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { API_V1_BASE_URL } from '../config/api.js'

const props = defineProps({
  user: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'updated'])

const accountInfo = ref({})
const saving = ref(false)
const error = ref('')
const success = ref('')

const form = reactive({
  email: '',
  phone: '',
  password: '',
  confirmPassword: ''
})

const fetchAccountInfo = async () => {
  try {
    const res = await fetch(`${API_V1_BASE_URL}/account`, {
      credentials: 'include'
    })
    
    if (res.ok) {
      accountInfo.value = await res.json()
      form.email = accountInfo.value.email || ''
      form.phone = accountInfo.value.phone || ''
    }
  } catch (err) {
    console.error('Error fetching account info:', err)
  }
}

const updateAccount = async () => {
  error.value = ''
  success.value = ''
  
  if (form.password && form.password.length < 12) {
    error.value = 'Le mot de passe doit contenir au moins 12 caractères'
    return
  }
  
  if (form.password && form.password !== form.confirmPassword) {
    error.value = 'Les mots de passe ne correspondent pas'
    return
  }
  
  saving.value = true
  
  try {
    const payload = {}
    
    if (form.email !== accountInfo.value.email) {
      payload.email = form.email
    }
    
    if (form.phone !== accountInfo.value.phone) {
      payload.phone = form.phone
    }
    
    if (form.password) {
      payload.password = form.password
    }
    
    if (Object.keys(payload).length === 0) {
      error.value = 'Aucune modification à enregistrer'
      saving.value = false
      return
    }
    
    const res = await fetch(`${API_V1_BASE_URL}/account`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    })
    
    const data = await res.json()
    
    if (res.ok) {
      success.value = 'Modifications enregistrées avec succès !'
      accountInfo.value = data
      form.password = ''
      form.confirmPassword = ''
      
      setTimeout(() => {
        emit('updated')
      }, 1500)
    } else {
      error.value = data.error || 'Une erreur est survenue'
    }
  } catch (err) {
    error.value = 'Erreur de connexion au serveur'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  if (props.user.role !== 'student') {
    fetchAccountInfo()
  }
})
</script>

<style scoped>
.account-settings {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 0;
  max-width: 600px;
  margin: 0 auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  color: var(--text-color);
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  border-bottom: 1px solid var(--border-color);
}

.settings-header h2 {
  margin: 0;
  color: var(--header-text);
  font-size: 24px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 32px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.2s;
}

.close-btn:hover {
  color: var(--text-color);
}

.access-denied {
  padding: 32px;
  text-align: center;
}

.access-denied p {
  color: var(--text-secondary);
  margin-bottom: 20px;
  line-height: 1.6;
}

.settings-form {
  padding: 32px;
}

.form-section {
  margin-bottom: 32px;
}

.form-section h3 {
  margin: 0 0 20px 0;
  color: var(--header-text);
  font-size: 18px;
  font-weight: 600;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--text-color);
  font-size: 14px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid var(--border-color);
  background: var(--input-bg);
  color: var(--text-color);
  border-radius: 8px;
  font-size: 15px;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-input:disabled {
  background: #f5f5f5;
  color: #999;
  cursor: not-allowed;
}

.input-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 6px;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--border-color);
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
  background: var(--input-bg);
  color: var(--text-color);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--border-color);
}

.error-message {
  padding: 12px;
  background: rgba(231, 76, 60, 0.1);
  border-left: 4px solid #f44;
  color: #e74c3c;
  border-radius: 4px;
  font-size: 14px;
  margin-bottom: 20px;
}

.success-message {
  padding: 12px;
  background: rgba(46, 204, 113, 0.1);
  border-left: 4px solid #4c4;
  color: #2ecc71;
  border-radius: 4px;
  font-size: 14px;
  margin-bottom: 20px;
}
</style>
