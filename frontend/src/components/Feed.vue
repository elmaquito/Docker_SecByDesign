<template>
  <div class="feed-container">
    <div class="feed-header">
      <div class="search-bar">
        <input 
          v-model="feedStore.filters.search" 
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
            <input type="checkbox" :value="tag.name" v-model="feedStore.filters.tags" />
            <span>{{ tag.name }}</span>
          </label>
        </div>
      </div>

      <!-- Spécialités -->
      <div v-if="tagStore.specialites.length > 0" class="filter-section">
        <h4>📚 Spécialités</h4>
        <div class="filter-options">
          <label v-for="tag in tagStore.specialites" :key="tag.id" class="filter-checkbox">
            <input type="checkbox" :value="tag.name" v-model="feedStore.filters.tags" />
            <span :style="{ color: tag.meta?.color }">{{ tag.name }}</span>
          </label>
        </div>
      </div>

      <!-- Groupes -->
      <div v-if="tagStore.groupes.length > 0" class="filter-section">
        <h4>👥 Groupes</h4>
        <div class="filter-options">
          <label v-for="tag in tagStore.groupes" :key="tag.id" class="filter-checkbox">
            <input type="checkbox" :value="tag.name" v-model="feedStore.filters.tags" />
            <span>{{ tag.name }}</span>
          </label>
        </div>
      </div>

      <!-- Catégories -->
      <div v-if="tagStore.categories.length > 0" class="filter-section">
        <h4>📂 Catégories</h4>
        <div class="filter-options">
          <label v-for="tag in tagStore.categories" :key="tag.id" class="filter-checkbox">
            <input type="checkbox" :value="tag.name" v-model="feedStore.filters.tags" />
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
      <div v-if="loading && notes.length === 0" class="loading">Chargement...</div>
      <div v-else-if="notes.length === 0" class="empty-state">
        <p>📝 Aucune note à afficher</p>
      </div>
      <div v-else class="notes-grid">
        <NoteCard 
          v-for="note in notes" 
          :key="note.id" 
          :note="note"
          @comment="handleComment"
          @view="handleView"
        />
      </div>

      <div v-if="hasMore && !loading && notes.length > 0" class="pagination-controls">
         <button class="btn-load-more" @click="loadMore">Charger plus de notes</button>
      </div>
      <div v-if="loading && notes.length > 0" class="loading-more">Chargement plus...</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import NoteCard from './NoteCard.vue'
import { useFeedStore } from '../stores/feed'
import { useTagStore } from '../stores/tag'

const props = defineProps(['user'])
const emit = defineEmits(['view-note'])

const feedStore = useFeedStore()
const tagStore = useTagStore()
const { notes, loading, hasMore } = storeToRefs(feedStore)

const showFilters = ref(false)

// Watch search (debounced)
let searchTimeout: ReturnType<typeof setTimeout>
watch(() => feedStore.filters.search, (newVal) => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    feedStore.fetchFeed(true)
  }, 500)
})

// Watch tags (immediate)
watch(() => feedStore.filters.tags, () => {
    feedStore.fetchFeed(true)
}, { deep: true })

const resetFilters = () => {
  feedStore.filters.search = ''
  feedStore.filters.tags = []
}

const loadMore = () => {
  feedStore.page++
  feedStore.fetchFeed(false)
}

const handleComment = (id: number) => {
  emit('view-note', id)
}

const handleView = (id: number) => {
  emit('view-note', id)
}

onMounted(() => {
  if (notes.value.length === 0) {
    feedStore.fetchFeed(true)
  }
  tagStore.fetchTags()
})
</script>

<style scoped>
.feed-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 1rem;
}

.feed-header {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  align-items: center;
}

.search-bar {
  flex: 1;
}

.search-input {
  width: 100%;
  padding: 0.8rem 1rem;
  border-radius: 20px;
  border: 1px solid #ddd;
  font-size: 1rem;
}

.filter-btn {
  padding: 0.8rem 1.2rem;
  border-radius: 20px;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn:hover {
  background: #f5f5f5;
}

.filters-panel {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
}

.filter-section {
  margin-bottom: 1.5rem;
}

.filter-section h4 {
  margin-bottom: 0.8rem;
  color: #666;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
}

.filter-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.4rem 0.8rem;
  background: #f8f9fa;
  border-radius: 15px;
  transition: all 0.2s;
}

.filter-checkbox:hover {
  background: #e9ecef;
}

.filter-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
  border-top: 1px solid #eee;
  padding-top: 1rem;
}

.btn-apply, .btn-reset {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  border: none;
}

.btn-apply {
  background: #007bff;
  color: white;
}

.btn-reset {
  background: #6c757d;
  color: white;
}

.notes-grid {
  display: grid;
  gap: 1.5rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #666;
  background: white;
  border-radius: 12px;
}

.loading, .loading-more {
  text-align: center;
  padding: 2rem;
  color: #666;
  font-weight: 500;
}

.btn-load-more {
    display: block;
    width: 100%;
    padding: 1rem;
    margin-top: 1.5rem;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    color: #007bff;
    transition: background 0.2s;
}

.btn-load-more:hover {
    background: #f8f9fa;
}

.pagination-controls {
    text-align: center;
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
