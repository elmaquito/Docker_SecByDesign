
import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { API_V1_BASE_URL } from '../config/api'

export const useFeedStore = defineStore('feed', () => {
  const notes = ref<any[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const page = ref(1)
  const total = ref(0)
  const hasMore = ref(true)
  
  const filters = reactive({
    tags: [] as string[],
    search: ''
  })

  const fetchFeed = async (reset = false) => {
    if (reset) {
      page.value = 1
      notes.value = []
      hasMore.value = true
    }
    
    if (!hasMore.value && !reset) return

    loading.value = true
    error.value = null

    try {
      const params = new URLSearchParams()
      params.append('page', page.value.toString())
      params.append('limit', '10')
      
      if (filters.tags.length > 0) {
        params.append('tags', filters.tags.join(','))
      }
      
      if (filters.search) params.append('search', filters.search)

      const res = await fetch(`${API_V1_BASE_URL}/feed?${params.toString()}`, {
        credentials: 'include'
      })

      if (!res.ok) throw new Error('Failed to fetch feed')

      const json = await res.json()
      
      if (reset) {
        notes.value = json.data
      } else {
        notes.value = [...notes.value, ...json.data]
      }
      
      total.value = json.meta.total
      hasMore.value = page.value < json.meta.totalPages
      if (hasMore.value) page.value++
      
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  const setFilter = (key: 'tag' | 'search', value: string) => {
    filters[key] = value
    fetchFeed(true)
  }

  return {
    notes,
    loading,
    error,
    hasMore,
    filters,
    fetchFeed,
    setFilter
  }
})
