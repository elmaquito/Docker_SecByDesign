import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { API_V1_BASE_URL } from '../config/api'
import type { Tag, TagType } from '../types/models'

export const useTagStore = defineStore('tag', () => {
  const tags = ref<Tag[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const classes = computed(() => tags.value.filter(t => t.type === 'classe'))
  const specialites = computed(() => tags.value.filter(t => t.type === 'specialite'))
  const groupes = computed(() => tags.value.filter(t => t.type === 'groupe'))
  const categories = computed(() => tags.value.filter(t => t.type === 'categorie'))

  const defaultStudentTags = computed(() => tags.value.filter(t => t.is_default_for_student_view))

  // Actions
  async function fetchTags() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_V1_BASE_URL}/tags`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch tags')
      tags.value = await res.json()
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function createTag(tag: Partial<Tag>) {
    try {
      const res = await fetch(`${API_V1_BASE_URL}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tag),
        credentials: 'include'
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create tag')
      }
      const newTag = await res.json()
      tags.value.push(newTag)
      return newTag
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  async function updateTag(id: number, updates: Partial<Tag>) {
    try {
      const res = await fetch(`${API_V1_BASE_URL}/tags/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Failed to update tag')
      
      const updatedTag = await res.json()
      const index = tags.value.findIndex(t => t.id === id)
      if (index !== -1) {
        tags.value[index] = updatedTag
      }
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  async function deleteTag(id: number) {
    try {
      const res = await fetch(`${API_V1_BASE_URL}/tags/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Failed to delete tag')
      
      tags.value = tags.value.filter(t => t.id !== id)
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  return {
    tags,
    loading,
    error,
    classes,
    specialites,
    groupes,
    categories,
    defaultStudentTags,
    fetchTags,
    createTag,
    updateTag,
    deleteTag
  }
})
