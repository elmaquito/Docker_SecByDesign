<template>
  <div class="feed-container">
    <div class="feed-header">
      <div class="search-bar">
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="🔍 Rechercher..."
          class="search-input"
        />
      </div>
      <button @click="showFilters = !showFilters" class="filter-btn">
        {{ showFilters ? 'Masquer filtres' : 'Filtres' }}
      </button>
    </div>

    <div v-if="showFilters" class="filters-panel">
      <div class="filter-section">
        <h4>🏷️ Thèmes</h4>
        <div class="filter-options">
          <label v-for="theme in availableThemes" :key="theme.id" class="filter-checkbox">
            <input type="checkbox" :value="theme.id" v-model="selectedThemes" />
            <span :style="{ color: getThemeColorLocal(theme.color) }">{{ theme.name }}</span>
          </label>
        </div>
      </div>
      <div class="filter-section">
        <h4>📂 Catégories</h4>
        <div class="filter-options">
          <label v-for="cat in availableCategories" :key="cat.id" class="filter-checkbox">
            <input type="checkbox" :value="cat.id" v-model="selectedCategories" />
            <span>{{ cat.name }}</span>
          </label>
        </div>
      </div>
      <div class="filter-actions">
        <button @click="applyFilters" class="btn-apply">Appliquer</button>
        <button @click="resetFilters" class="btn-reset">Reset</button>
      </div>
    </div>

    <div class="feed-content">
      <div v-if="loading" class="loading">Chargement...</div>
      <div v-else-if="filteredNotes.length === 0" class="empty-state">
        <p>📝 Aucune note à afficher</p>
      </div>
      <div v-else class="notes-grid">
        <NoteCard 
          v-for="note in filteredNotes" 
          :key="note.id" 
          :note="note"
          @comment="handleComment"
          @view="handleView"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import NoteCard from './NoteCard.vue'
import { getThemeColor } from '../utils/theme.js'

const props = defineProps(['user'])
const emit = defineEmits(['view-note'])

const notes = ref([])
const loading = ref(false)
const searchQuery = ref('')
const showFilters = ref(false)
const selectedThemes = ref([])
const selectedCategories = ref([])
const availableThemes = ref([])
const availableCategories = ref([])

const fetchNotes = async () => {
  loading.value = true
  try {
    const res = await fetch('http://127.0.0.1:3001/api/v1/notes', { credentials: 'include' })
    if (res.ok) {
      notes.value = await res.json()
    }
  } catch (e) {
    console.error('Failed to load notes', e)
  } finally {
    loading.value = false
  }
}

const fetchThemes = async () => {
  try {
    const res = await fetch('http://127.0.0.1:3001/api/v1/themes', { credentials: 'include' })
    if (res.ok) {
      availableThemes.value = await res.json()
    }
  } catch (e) {
    console.error('Failed to load themes', e)
  }
}

const fetchCategories = async () => {
  try {
    const res = await fetch('http://127.0.0.1:3001/api/v1/categories', { credentials: 'include' })
    if (res.ok) {
      availableCategories.value = await res.json()
    }
  } catch (e) {
    console.error('Failed to load categories', e)
  }
}

const filteredNotes = computed(() => {
  let result = notes.value
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(n => 
      n.title.toLowerCase().includes(query) || 
      (n.content && n.content.toLowerCase().includes(query))
    )
  }
  
  // Apply theme filters
  if (selectedThemes.value.length > 0) {
    result = result.filter(n => 
      n.themes && n.themes.some(t => selectedThemes.value.includes(t.id))
    )
  }
  
  // Apply category filters
  if (selectedCategories.value.length > 0) {
    result = result.filter(n => 
      n.categories && n.categories.some(c => selectedCategories.value.includes(c.id))
    )
  }
  
  return result
})

const getThemeColorLocal = getThemeColor

const applyFilters = () => {
  // Filters would be applied here
  showFilters.value = false
}

const resetFilters = () => {
  selectedThemes.value = []
  selectedCategories.value = []
}

const handleComment = (noteId) => {
  emit('view-note', noteId)
}

const handleView = (noteId) => {
  emit('view-note', noteId)
}

onMounted(() => {
  fetchNotes()
  fetchThemes()
  fetchCategories()
})
</script>

<style scoped>
.feed-container {
  max-width: 900px;
  margin: 0 auto;
}

.feed-header {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  align-items: center;
}

.search-bar {
  flex: 1;
}

.search-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: #3498db;
}

.filter-btn {
  padding: 12px 24px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: background 0.3s;
}

.filter-btn:hover {
  background: #2980b9;
}

.filters-panel {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  border: 1px solid #e9ecef;
}

.filter-section {
  margin-bottom: 1rem;
}

.filter-section h4 {
  margin: 0 0 0.75rem 0;
  color: #2c3e50;
  font-size: 0.95rem;
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.filter-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 6px 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #dee2e6;
  transition: all 0.2s;
}

.filter-checkbox:hover {
  border-color: #3498db;
  background: #e3f2fd;
}

.filter-checkbox input {
  cursor: pointer;
}

.filter-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.btn-apply, .btn-reset {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s;
}

.btn-apply {
  background: #2ecc71;
  color: white;
}

.btn-apply:hover {
  background: #27ae60;
}

.btn-reset {
  background: #e9ecef;
  color: #495057;
}

.btn-reset:hover {
  background: #dee2e6;
}

.feed-content {
  min-height: 400px;
}

.loading, .empty-state {
  text-align: center;
  padding: 3rem;
  color: #6c757d;
  font-size: 1.1rem;
}

.notes-grid {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
</style>
