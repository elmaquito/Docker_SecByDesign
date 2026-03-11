import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { API_V1_BASE_URL } from '../config/api'
import type { Note } from '../types/models'
import { initializeNoteState } from '../utils/theme'

export const useNoteStore = defineStore('note', () => {
  const notes = ref<Note[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Actions
  async function fetchNotes() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_V1_BASE_URL}/notes`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch notes')
      const data = await res.json()
      // Initialize internal state (editing, comments, etc.)
      notes.value = data.map((n: any) => initializeNoteState(n))
    } catch (e: any) {
      error.value = e.message
      console.error('Error fetching notes:', e)
    } finally {
      loading.value = false
    }
  }

  async function createNote(noteData: Partial<Note>) {
    loading.value = true
    try {
      const res = await fetch(`${API_V1_BASE_URL}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData),
        credentials: 'include'
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create note')
      }
      const newNote = await res.json()
      const initializedNote = initializeNoteState(newNote)
      notes.value.unshift(initializedNote)
      return initializedNote
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateNote(id: number, updates: Partial<Note>) {
    try {
      const res = await fetch(`${API_V1_BASE_URL}/notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        credentials: 'include'
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update note')
      }
      const updatedNote = await res.json()
      const index = notes.value.findIndex(n => n.id === id)
      if (index !== -1) {
        // Merge updates while preserving client-side state like _editing
        notes.value[index] = { ...notes.value[index], ...updatedNote }
      }
      return updatedNote
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  async function deleteNote(id: number) {
    try {
      const res = await fetch(`${API_V1_BASE_URL}/notes/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Failed to delete note')
      notes.value = notes.value.filter(n => n.id !== id)
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  async function fetchComments(noteId: number) {
    try {
      const res = await fetch(`${API_V1_BASE_URL}/notes/${noteId}/comments`, { credentials: 'include' })
      if (res.ok) {
        const comments = await res.json()
        const note = notes.value.find(n => n.id === noteId)
        if (note) {
          (note as any)._comments = comments
        }
        return comments
      }
    } catch (e) {
      console.error(`Failed to fetch comments for note ${noteId}`, e)
    }
  }

  async function addComment(noteId: number, content: string) {
    try {
      const res = await fetch(`${API_V1_BASE_URL}/notes/${noteId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Failed to post comment')
      const comment = await res.json()
      
      const note = notes.value.find(n => n.id === noteId)
      if (note) {
        (note as any)._comments = (note as any)._comments || [];
        (note as any)._comments.push(comment)
      }
      return comment
    } catch (e: any) {
      throw e
    }
  }

  return {
    notes,
    loading,
    error,
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,
    fetchComments,
    addComment
  }
})
