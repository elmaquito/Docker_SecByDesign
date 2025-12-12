<template>
  <div class="main-dashboard">
    <div v-if="canManageUsers" class="admin-toggle">
      <button class="manage-btn" @click="showAdminPanel = !showAdminPanel">
        {{ showAdminPanel ? 'Hide User Management' : 'Manage Users' }}
      </button>
    </div>
    <div v-if="canManageUsers && showAdminPanel" class="admin-section">
      <h3>User Management</h3>
      <div class="admin-controls">
        <form @submit.prevent="createUser" class="user-form">
          <input v-model="newUser.username" placeholder="Username" required />
          <input v-model="newUser.password" type="password" placeholder="Password" required />
          <select v-model="newUser.role">
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="technician">Technician</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit">Add User</button>
        </form>
      </div>
      <div class="users-list">
        <div v-for="u in users" :key="u.id" class="user-tag">
          <strong>{{ u.username }}</strong> <small>({{ u.role }})</small>
        </div>
      </div>
    </div>

    <div class="dashboard">
      <div class="create-note">
      <h3>New Secure Note</h3>
      <form @submit.prevent="createNote">
        <input v-model="newNote.title" placeholder="Title" required />
        <textarea v-model="newNote.content" placeholder="Content (encrypted in transit)" required></textarea>
        <button type="submit">Save Note</button>
      </form>
    </div>

    <div class="notes-list">
      <h3>Your Notes</h3>
      <div v-if="notes.length === 0" class="empty">No notes yet.</div>
      
      <div v-for="note in notes" :key="note.id" class="note-card">
        <div class="note-header">
          <div style="display:flex; gap:12px; align-items:center">
            <h4 v-if="!note._editing">{{ note.title }}</h4>
            <input v-if="note._editing" v-model="note._editedTitle" />
            <small style="color:#666">by {{ note.user_id }}{{ note.owner_role ? ' (' + note.owner_role + ')' : '' }}</small>
          </div>
          <div>
            <button v-if="canEdit(note) && !note._editing" @click="startEdit(note)" class="manage-btn">Edit</button>
            <button v-if="note._editing" @click="saveEdit(note)" class="manage-btn">Save</button>
            <button v-if="note._editing" @click="cancelEdit(note)" class="manage-btn">Cancel</button>
            <button @click="deleteNote(note.id)" class="delete-btn">×</button>
          </div>
        </div>
        <div v-if="!note._editing">
          <p>{{ note.content }}</p>
        </div>
        <div v-else>
          <textarea v-model="note._editedContent"></textarea>
        </div>
        <small>{{ new Date(note.created_at).toLocaleString() }}</small>

        <!-- Comments -->
        <div class="comments">
          <div v-if="note._comments && note._comments.length === 0" class="empty">No comments.</div>
          <div v-for="c in note._comments" :key="c.id" class="comment">
            <strong>{{ c.username }}</strong>: {{ c.content }} <small style="color:#666">— {{ new Date(c.created_at).toLocaleString() }}</small>
          </div>

          <div class="comment-form">
            <input v-model="note._newComment" placeholder="Write a comment..." />
            <button @click="postComment(note)">Comment</button>
          </div>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'

const props = defineProps(['user'])
const notes = ref([])
const users = ref([])
const newNote = reactive({ title: '', content: '' })
const newUser = reactive({ username: '', password: '', role: 'student' })

const canManageUsers = computed(() => ['admin', 'technician'].includes(props.user.role))
const showAdminPanel = ref(true)

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
      // initialize editing/comments state
      notes.value = data.map(n => ({ ...n, _editing: false, _editedTitle: n.title, _editedContent: n.content, _comments: [], _newComment: '' }))
      // fetch comments for visible notes
      for (const n of notes.value) {
        await fetchComments(n)
      }
    }
  } catch (e) {
    console.error(e)
  }
}

const createNote = async () => {
  try {
    const res = await fetch('http://127.0.0.1:3001/api/v1/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newNote),
      credentials: 'include'
    })
    
    if (res.ok) {
      const savedNote = await res.json()
      notes.value.unshift(savedNote)
      newNote.title = ''
      newNote.content = ''
    }
  } catch (e) {
    alert('Failed to save note')
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
      alert(data.error || 'Failed to save')
    }
  } catch (e) {
    alert('Failed to save')
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
.dashboard { display: grid; gap: 2rem; grid-template-columns: 1fr 2fr; }
.create-note { background: white; padding: 1.5rem; border-radius: 8px; height: fit-content; }
.create-note input, .create-note textarea { width: 100%; margin-bottom: 1rem; padding: 8px; box-sizing: border-box; }
.create-note textarea { height: 100px; }
.note-card { background: white; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border-left: 4px solid #3742fa; position: relative; }
.note-header { display: flex; justify-content: space-between; align-items: start; }
.note-card h4 { margin: 0 0 0.5rem 0; }
.delete-btn { background: none; border: none; color: #ff4757; font-size: 1.5rem; cursor: pointer; padding: 0 5px; }
.delete-btn:hover { color: #ff6b81; }

.main-dashboard { display: flex; flex-direction: column; gap: 2rem; }
.admin-section { background: #fff3cd; padding: 1.5rem; border-radius: 8px; border: 1px solid #ffeeba; }
.admin-controls { margin-bottom: 1rem; }
.inline-form { display: flex; gap: 10px; align-items: center; }
.inline-form input, .inline-form select { padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
.users-grid { display: flex; flex-wrap: wrap; gap: 10px; }
.mini-card { background: white; padding: 5px 10px; border-radius: 4px; border: 1px solid #ddd; font-size: 0.9rem; }

.admin-toggle { display: flex; justify-content: flex-end; }
.manage-btn { background: #3742fa; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; }
.manage-btn:hover { opacity: 0.95; }
</style>
