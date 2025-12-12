<template>
  <div class="main-dashboard">
    <!-- Quick Actions Bar -->
    <div class="quick-actions">
      <button @click="activeView = 'feed'" :class="{ active: activeView === 'feed' }" class="action-btn">
        📰 Feed d'Actualités
      </button>
      <button @click="activeView = 'my-notes'" :class="{ active: activeView === 'my-notes' }" class="action-btn">
        📝 Mes Notes
      </button>
      <button @click="showCreateModal = true" class="action-btn action-btn-primary">
        ➕ Créer une Note
      </button>
      <button v-if="canManageUsers" @click="activeView = 'admin'" :class="{ active: activeView === 'admin' }" class="action-btn">
        👥 Gestion Utilisateurs
      </button>
      <button @click="activeView = 'account'" :class="{ active: activeView === 'account' }" class="action-btn">
        ⚙️ Mon Compte
      </button>
    </div>

    <!-- User Profile Info -->
    <div class="user-profile-card">
      <div class="profile-info">
        <div class="avatar">{{ user.username.charAt(0).toUpperCase() }}</div>
        <div class="profile-details">
          <h3>{{ user.username }}</h3>
          <span class="role-badge" :class="'role-' + user.role">{{ getRoleLabel(user.role) }}</span>
        </div>
      </div>
      <div class="profile-stats">
        <div class="stat-item">
          <div class="stat-value">{{ notes.length }}</div>
          <div class="stat-label">Notes</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ totalComments }}</div>
          <div class="stat-label">Commentaires</div>
        </div>
      </div>
    </div>

    <!-- Feed View -->
    <div v-if="activeView === 'feed'" class="view-container">
      <Feed :user="user" @view-note="viewNote" />
    </div>

    <!-- My Notes View -->
    <div v-else-if="activeView === 'my-notes'" class="view-container">
      <div class="section-header">
        <h2>📝 Mes Notes</h2>
      </div>
      
      <div v-if="notes.length === 0" class="empty-state">
        <p>Aucune note pour le moment.</p>
        <button @click="showCreateModal = true" class="btn-create">Créer votre première note</button>
      </div>
      
      <div v-else class="notes-list">
        <div v-for="note in notes" :key="note.id" class="note-card">
          <div class="note-header">
            <div style="display:flex; gap:12px; align-items:center">
              <h4 v-if="!note._editing">{{ note.title }}</h4>
              <input v-if="note._editing" v-model="note._editedTitle" class="edit-input" />
              <small style="color:#666">{{ new Date(note.created_at).toLocaleString('fr-FR') }}</small>
            </div>
            <div class="note-actions">
              <button v-if="canEdit(note) && !note._editing" @click="startEdit(note)" class="btn-icon">✏️</button>
              <button v-if="note._editing" @click="saveEdit(note)" :disabled="note._saving" class="btn-icon">
                {{ note._saving ? '⏳' : '💾' }}
              </button>
              <button v-if="note._editing" @click="cancelEdit(note)" class="btn-icon">❌</button>
              <button @click="deleteNote(note.id)" class="btn-icon delete">🗑️</button>
            </div>
          </div>
          <div v-if="!note._editing" class="note-content">
            <p>{{ note.content }}</p>
          </div>
          <div v-else>
            <textarea v-model="note._editedContent" class="edit-textarea"></textarea>
          </div>

          <!-- Comments -->
          <div class="comments-section">
            <h5>💬 Commentaires ({{ note._comments?.length || 0 }})</h5>
            <div v-if="note._comments && note._comments.length === 0" class="empty-comments">Aucun commentaire</div>
            <div v-for="c in note._comments" :key="c.id" class="comment">
              <strong>{{ c.username }}</strong>: {{ c.content }}
              <small>— {{ new Date(c.created_at).toLocaleString('fr-FR') }}</small>
            </div>

            <div class="comment-form">
              <input v-model="note._newComment" placeholder="Écrire un commentaire..." class="comment-input" />
              <button @click="postComment(note)" class="btn-comment">Publier</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Admin Panel -->
    <div v-else-if="activeView === 'admin' && canManageUsers" class="view-container">
      <div class="section-header">
        <h2>👥 Gestion des Utilisateurs</h2>
      </div>
      
      <div class="admin-section">
        <div class="create-user-form">
          <h3>Créer un Utilisateur</h3>
          <form @submit.prevent="createUser" class="user-form">
            <input v-model="newUser.username" placeholder="Nom d'utilisateur" required class="form-input" />
            <input v-model="newUser.password" type="password" placeholder="Mot de passe" required class="form-input" />
            <select v-model="newUser.role" class="form-select">
              <option value="student">Étudiant</option>
              <option value="teacher">Enseignant</option>
              <option value="technician">Technicien</option>
              <option value="admin">Administrateur</option>
            </select>
            <button type="submit" class="btn-submit">Ajouter</button>
          </form>
        </div>
        
        <div class="users-list">
          <h3>Liste des Utilisateurs</h3>
          <div class="users-grid">
            <div v-for="u in users" :key="u.id" class="user-card">
              <div class="user-avatar">{{ u.username.charAt(0).toUpperCase() }}</div>
              <div class="user-info">
                <strong>{{ u.username }}</strong>
                <span class="role-badge" :class="'role-' + u.role">{{ getRoleLabel(u.role) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Account Settings View -->
    <div v-else-if="activeView === 'account'" class="view-container">
      <AccountSettings :user="user" @close="activeView = 'feed'" @updated="activeView = 'feed'" />
    </div>

    <!-- Create Note Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click="showCreateModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>📝 Créer une Nouvelle Note</h3>
          <button @click="showCreateModal = false" class="modal-close">×</button>
        </div>
        <form @submit.prevent="createNote" class="note-form">
          <input v-model="newNote.title" placeholder="Titre de la note" required class="form-input" />
          <textarea v-model="newNote.content" placeholder="Contenu de la note (chiffré en transit)" required class="form-textarea"></textarea>
          <div class="modal-actions">
            <button type="button" @click="showCreateModal = false" class="btn-cancel">Annuler</button>
            <button type="submit" :disabled="isSaving" class="btn-submit">
              {{ isSaving ? 'Enregistrement...' : 'Enregistrer' }}
            </button>
          </div>
          <div v-if="saveError" class="error-message">{{ saveError }}</div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import Feed from './Feed.vue'
import AccountSettings from './AccountSettings.vue'
import { initializeNoteState } from '../utils/theme.js'

const props = defineProps(['user'])
const notes = ref([])
const users = ref([])
const newNote = reactive({ title: '', content: '' })
const newUser = reactive({ username: '', password: '', role: 'student' })
const activeView = ref('feed')
const showCreateModal = ref(false)
const isSaving = ref(false)
const saveError = ref('')

const canManageUsers = computed(() => ['admin', 'technician'].includes(props.user.role))
const totalComments = computed(() => {
  return notes.value.reduce((sum, note) => sum + (note._comments?.length || 0), 0)
})

const getRoleLabel = (role) => {
  const labels = {
    admin: 'Administrateur',
    technician: 'Technicien',
    teacher: 'Enseignant',
    student: 'Étudiant'
  }
  return labels[role] || role
}

const viewNote = (noteId) => {
  // Switch to my-notes view and potentially scroll to the note
  activeView.value = 'my-notes'
}

const fetchUsers = async () => {
  if (!canManageUsers.value) return
  try {
    const res = await fetch('http://127.0.0.1:3001/api/v1/users', { credentials: 'include' })
    if (res.ok) {
      users.value = await res.json()
    }
  } catch (e) {
    console.error(e)
  }
}

const createUser = async () => {
  try {
    const res = await fetch('http://127.0.0.1:3001/api/v1/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
      credentials: 'include'
    })
    
    if (res.ok) {
      const savedUser = await res.json()
      users.value.push(savedUser)
      newUser.username = ''
      newUser.password = ''
      newUser.role = 'student'
    } else {
      const data = await res.json()
      alert(data.error || 'Failed to create user')
    }
  } catch (e) {
    alert('Failed to create user')
  }
}

const fetchNotes = async () => {
  try {
    const res = await fetch('http://127.0.0.1:3001/api/v1/notes', { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      // initialize editing/comments state using helper
      notes.value = data.map(initializeNoteState)
      // fetch comments for visible notes
      for (const n of notes.value) {
        await fetchComments(n)
      }
    }
  } catch (e) {
    console.error('Failed to fetch notes:', e)
  }
}

const createNote = async () => {
  isSaving.value = true
  saveError.value = ''
  
  try {
    const res = await fetch('http://127.0.0.1:3001/api/v1/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newNote),
      credentials: 'include'
    })
    
    if (res.ok) {
      const savedNote = await res.json()
      notes.value.unshift(initializeNoteState(savedNote))
      newNote.title = ''
      newNote.content = ''
      showCreateModal.value = false
      activeView.value = 'my-notes'
    } else {
      const data = await res.json()
      saveError.value = data.error || 'Erreur lors de l\'enregistrement'
      console.error('Échec de l\'enregistrement:', data.error || 'Erreur inconnue')
    }
  } catch (e) {
    saveError.value = 'Erreur de connexion au serveur'
    console.error('Échec de l\'enregistrement de la note:', e)
  } finally {
    isSaving.value = false
  }
}

const deleteNote = async (id) => {
  if (!confirm('Delete this note?')) return
  try {
    const res = await fetch(`http://127.0.0.1:3001/api/v1/notes/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    if (res.ok) {
      notes.value = notes.value.filter(n => n.id !== id)
    } else {
      alert('Failed to delete (Permission denied?)')
    }
  } catch (e) {
    console.error(e)
  }
}

const canEdit = (note) => {
  // admin can edit everything; owner can edit; teacher can edit student notes
  const role = props.user.role
  if (role === 'admin' || role === 'technician') return true
  if (note.user_id === props.user.id) return true
  if (role === 'teacher' && note.owner_role === 'student') return true
  return false
}

const startEdit = (note) => {
  note._editing = true
  note._editedTitle = note.title
  note._editedContent = note.content
}

const cancelEdit = (note) => {
  note._editing = false
}

const saveEdit = async (note) => {
  if (note._saving) return // Prevent double-submit
  
  note._saving = true
  note._saveError = ''
  
  try {
    const res = await fetch(`http://127.0.0.1:3001/api/v1/notes/${note.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title: note._editedTitle, content: note._editedContent })
    })
    if (res.ok) {
      const updated = await res.json()
      note.title = updated.title
      note.content = updated.content
      note._editing = false
    } else {
      const data = await res.json()
      note._saveError = data.error || 'Échec de l\'enregistrement'
      alert(note._saveError)
    }
  } catch (e) {
    note._saveError = 'Erreur de connexion au serveur'
    alert(note._saveError)
  } finally {
    note._saving = false
  }
}

const fetchComments = async (note) => {
  try {
    const res = await fetch(`http://127.0.0.1:3001/api/v1/notes/${note.id}/comments`, { credentials: 'include' })
    if (res.ok) {
      note._comments = await res.json()
    }
  } catch (e) {
    console.error('Failed to load comments', e)
  }
}

const postComment = async (note) => {
  if (!note._newComment || note._newComment.trim() === '') return
  try {
    const res = await fetch(`http://127.0.0.1:3001/api/v1/notes/${note.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content: note._newComment })
    })
    if (res.ok) {
      const c = await res.json()
      // append and clear
      note._comments.push({ ...c, username: (props.user && props.user.username) || 'you' })
      note._newComment = ''
    } else {
      const data = await res.json()
      alert(data.error || 'Failed to post comment')
    }
  } catch (e) {
    alert('Failed to post comment')
  }
}

onMounted(() => {
  fetchNotes()
  fetchUsers()
})
</script>

<style scoped>
.main-dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.quick-actions {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  padding: 1rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.action-btn {
  padding: 10px 20px;
  border: 2px solid #e9ecef;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.3s;
  color: #495057;
}

.action-btn:hover {
  border-color: #3498db;
  color: #3498db;
  background: #e3f2fd;
}

.action-btn.active {
  background: #3498db;
  color: white;
  border-color: #3498db;
}

.action-btn-primary {
  background: #2ecc71;
  color: white;
  border-color: #2ecc71;
}

.action-btn-primary:hover {
  background: #27ae60;
  border-color: #27ae60;
}

.user-profile-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1.5rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.profile-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: bold;
}

.profile-details h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1.5rem;
}

.role-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  display: inline-block;
}

.role-admin {
  background: #e74c3c;
  color: white;
}

.role-technician {
  background: #3498db;
  color: white;
}

.role-teacher {
  background: #2ecc71;
  color: white;
}

.role-student {
  background: #f39c12;
  color: white;
}

.profile-stats {
  display: flex;
  gap: 2rem;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.85rem;
  opacity: 0.9;
}

.view-container {
  margin-top: 1.5rem;
}

.section-header {
  margin-bottom: 1.5rem;
}

.section-header h2 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.75rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.empty-state p {
  color: #6c757d;
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.btn-create {
  padding: 12px 24px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.3s;
}

.btn-create:hover {
  background: #2980b9;
}

.notes-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.note-card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border-left: 4px solid #3498db;
}

.note-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 1rem;
}

.note-header h4 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.25rem;
}

.note-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-icon {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem;
  transition: transform 0.2s;
}

.btn-icon:hover {
  transform: scale(1.2);
}

.btn-icon.delete:hover {
  filter: brightness(0.8);
}

.note-content {
  color: #495057;
  line-height: 1.6;
  margin-bottom: 1rem;
}

.note-content p {
  margin: 0;
}

.edit-input {
  padding: 8px 12px;
  border: 2px solid #3498db;
  border-radius: 6px;
  font-size: 1rem;
  width: 100%;
  max-width: 400px;
}

.edit-textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid #3498db;
  border-radius: 6px;
  font-size: 1rem;
  min-height: 100px;
  font-family: inherit;
  resize: vertical;
}

.comments-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e9ecef;
}

.comments-section h5 {
  margin: 0 0 0.75rem 0;
  color: #495057;
  font-size: 1rem;
}

.empty-comments {
  color: #6c757d;
  font-style: italic;
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
}

.comment {
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.comment strong {
  color: #2c3e50;
}

.comment small {
  color: #6c757d;
  font-size: 0.8rem;
}

.comment-form {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.comment-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 0.9rem;
}

.btn-comment {
  padding: 8px 16px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.3s;
}

.btn-comment:hover {
  background: #2980b9;
}

.admin-section {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.admin-section h3 {
  margin-top: 0;
  color: #2c3e50;
}

.create-user-form {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.user-form {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.form-input, .form-select {
  padding: 10px 12px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 0.95rem;
}

.form-input {
  flex: 1;
  min-width: 200px;
}

.btn-submit {
  padding: 10px 20px;
  background: #2ecc71;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  transition: background 0.3s;
}

.btn-submit:hover {
  background: #27ae60;
}

.users-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #3498db;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  max-width: 600px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.modal-header h3 {
  margin: 0;
  color: #2c3e50;
}

.modal-close {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #6c757d;
  line-height: 1;
  transition: color 0.3s;
}

.modal-close:hover {
  color: #e74c3c;
}

.note-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-textarea {
  padding: 12px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 1rem;
  min-height: 150px;
  font-family: inherit;
  resize: vertical;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.btn-cancel {
  padding: 10px 20px;
  background: #e9ecef;
  color: #495057;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: background 0.3s;
}

.btn-cancel:hover {
  background: #dee2e6;
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  margin-top: 12px;
  padding: 10px;
  background: #fee;
  border-left: 3px solid #f44;
  color: #c33;
  border-radius: 4px;
  font-size: 14px;
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
