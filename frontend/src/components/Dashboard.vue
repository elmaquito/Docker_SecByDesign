<template>
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
        <h4>{{ note.title }}</h4>
        <p>{{ note.content }}</p>
        <small>{{ new Date(note.created_at).toLocaleString() }}</small>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'

const props = defineProps(['user'])
const notes = ref([])
const newNote = reactive({ title: '', content: '' })

const fetchNotes = async () => {
  try {
    const res = await fetch('http://localhost:3000/notes', { credentials: 'include' })
    if (res.ok) {
      notes.value = await res.json()
    }
  } catch (e) {
    console.error(e)
  }
}

const createNote = async () => {
  try {
    const res = await fetch('http://localhost:3000/notes', {
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

onMounted(() => {
  fetchNotes()
})
</script>

<style scoped>
.dashboard { display: grid; gap: 2rem; grid-template-columns: 1fr 2fr; }
.create-note { background: white; padding: 1.5rem; border-radius: 8px; height: fit-content; }
.create-note input, .create-note textarea { width: 100%; margin-bottom: 1rem; padding: 8px; box-sizing: border-box; }
.create-note textarea { height: 100px; }
.note-card { background: white; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border-left: 4px solid #3742fa; }
.note-card h4 { margin: 0 0 0.5rem 0; }
</style>
