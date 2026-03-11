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
      <!-- Classes -->
      <div v-if="tagStore.classes.length > 0" class="filter-section">
        <h4>🎓 Classes</h4>
        <div class="filter-options">
          <label v-for="tag in tagStore.classes" :key="tag.id" class="filter-checkbox">
            <input type="checkbox" :value="tag.id" v-model="selectedTags" />
            <span>{{ tag.name }}</span>
          </label>
        </div>
      </div>

      <!-- Spécialités -->
      <div v-if="tagStore.specialites.length > 0" class="filter-section">
        <h4>📚 Spécialités</h4>
        <div class="filter-options">
          <label v-for="tag in tagStore.specialites" :key="tag.id" class="filter-checkbox">
            <input type="checkbox" :value="tag.id" v-model="selectedTags" />
            <span :style="{ color: tag.meta?.color }">{{ tag.name }}</span>
          </label>
        </div>
      </div>

      <!-- Groupes -->
      <div v-if="tagStore.groupes.length > 0" class="filter-section">
        <h4>👥 Groupes</h4>
        <div class="filter-options">
          <label v-for="tag in tagStore.groupes" :key="tag.id" class="filter-checkbox">
            <input type="checkbox" :value="tag.id" v-model="selectedTags" />
            <span>{{ tag.name }}</span>
          </label>
        </div>
      </div>

      <!-- Catégories -->
      <div v-if="tagStore.categories.length > 0" class="filter-section">
        <h4>📂 Catégories</h4>
        <div class="filter-options">
          <label v-for="tag in tagStore.categories" :key="tag.id" class="filter-checkbox">
            <input type="checkbox" :value="tag.id" v-model="selectedTags" />
            <span>{{ tag.name }}</span>
          </label>
        </div>
      </div>

      <div class="filter-actions">
        <button @click="showFilters = false" class="btn-apply">Fermer</button>
        <button @click="resetFilters" class="btn-reset">Reset</button>
      </div>
    </div>

    <div class="feed-content">
      <div v-if="noteStore.loading" class="loading">Chargement...</div>
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

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import NoteCard from './NoteCard.vue'
import { useNoteStore } from '../stores/note'
import { useTagStore } from '../stores/tag'

const props = defineProps(['user'])
const emit = defineEmits(['view-note'])

const noteStore = useNoteStore()
const tagStore = useTagStore()
const { notes } = storeToRefs(noteStore)

const searchQuery = ref('')
const showFilters = ref(false)
const selectedTags = ref<number[]>([])

const fetchNotes = async () => {
  await noteStore.fetchNotes()
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
  
  if (selectedTags.value.length > 0) {
    result = result.filter(n => {
      if (!n.tags) return false
      return n.tags.some(t => selectedTags.value.includes(t.id))
    })
  }
  
  return result
})

const resetFilters = () => {
  selectedTags.value = []
}

const handleComment = (noteId: number) => {
  emit('view-note', noteId)
}

const handleView = (noteId: number) => {
  emit('view-note', noteId)
}

onMounted(() => {
  fetchNotes()
  tagStore.fetchTags()
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
  border: 1px solid var(--border-color);
  background: var(--input-bg);
  color: var(--text-color);
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
  background: var(--bg-color);
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  border: 1px solid var(--border-color);
}

.filter-section {
  margin-bottom: 1rem;
}

.filter-section h4 {
  margin: 0 0 0.75rem 0;
  color: var(--text-color);
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
  background: var(--input-bg);
  border-radius: 6px;
  border: 1px solid var(--border-color);
  transition: all 0.2s;
  color: var(--text-color);
}

.filter-checkbox:hover {
  border-color: #3498db;
  background: rgba(52, 152, 219, 0.1);
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
  background: var(--input-bg);
  color: var(--text-color);
  border: 1px solid var(--border-color);
}

.btn-reset:hover {
  background: var(--border-color);
}

.feed-content {
  min-height: 400px;
}

.loading, .empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
  font-size: 1.1rem;
}

.notes-grid {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
</style>
