<template>
  <div class="note-card">
    <div class="note-header">
      <div class="note-title-section">
        <span class="note-icon">{{ getNoteIcon }}</span>
        <h3 class="note-title">{{ note.title }}</h3>
      </div>
      <div class="note-meta">
        <span class="author">Par {{ getAuthorName }}</span>
        <span class="separator">•</span>
        <span class="date">{{ formatDate(note.created_at) }}</span>
      </div>
    </div>

    <div class="note-content">
      <p>{{ getExcerpt }}</p>
    </div>

    <div v-if="note.themes && note.themes.length > 0" class="note-tags">
      <span class="tag-label">🏷️</span>
      <span 
        v-for="theme in displayThemes" 
        :key="theme.id" 
        class="theme-badge"
        :style="{ backgroundColor: getThemeColorLocal(theme.color) }"
      >
        {{ theme.name }}
      </span>
      <span v-if="note.themes.length > 3" class="more-tags">+{{ note.themes.length - 3 }}</span>
    </div>

    <div class="note-footer">
      <div class="note-stats">
        <Reactions 
          :noteId="note.id" 
          :initialUpCount="note.reactions_up || 0"
          :initialDownCount="note.reactions_down || 0"
        />
        <span class="stat">💬 {{ note.comment_count || 0 }} commentaire(s)</span>
        <span class="stat">👁️ {{ note.view_count || 0 }} vue(s)</span>
      </div>
      <div class="note-actions">
        <button @click="$emit('view', note.id)" class="btn-action btn-view">
          Voir plus
        </button>
        <button @click="$emit('comment', note.id)" class="btn-action btn-comment">
          💬 Commenter
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getThemeColor } from '../utils/theme.js'
import Reactions from './Reactions.vue'

const props = defineProps({
  note: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['view', 'comment'])

const getNoteIcon = computed(() => {
  if (props.note.is_pinned) return '📌'
  if (props.note.is_urgent) return '🔔'
  return '📝'
})

const getAuthorName = computed(() => {
  return props.note.author_name || props.note.username || 'Utilisateur anonyme'
})

const getExcerpt = computed(() => {
  if (!props.note.content) return 'Aucun contenu...'
  const maxLength = 150
  if (props.note.content.length <= maxLength) return props.note.content
  return props.note.content.substring(0, maxLength) + '...'
})

const displayThemes = computed(() => {
  if (!props.note.themes) return []
  return props.note.themes.slice(0, 3)
})

const formatDate = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "à l'instant"
  if (diffMins < 60) return `il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`
  if (diffHours < 24) return `il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`
  if (diffDays === 1) return 'hier'
  if (diffDays < 7) return `il y a ${diffDays} jours`
  
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

const getThemeColorLocal = getThemeColor
</script>

<style scoped>
.note-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border-left: 4px solid #3498db;
  transition: all 0.3s ease;
}

.note-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.note-header {
  margin-bottom: 1rem;
}

.note-title-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.note-icon {
  font-size: 1.5rem;
}

.note-title {
  margin: 0;
  font-size: 1.25rem;
  color: #2c3e50;
  font-weight: 600;
}

.note-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #6c757d;
}

.separator {
  color: #dee2e6;
}

.author {
  font-weight: 500;
  color: #495057;
}

.note-content {
  margin-bottom: 1rem;
  color: #495057;
  line-height: 1.6;
}

.note-content p {
  margin: 0;
}

.note-tags {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.tag-label {
  font-size: 1rem;
}

.theme-badge {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 500;
  color: white;
  display: inline-block;
}

.more-tags {
  color: #6c757d;
  font-size: 0.85rem;
}

.note-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  border-top: 1px solid #e9ecef;
}

.note-stats {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: #6c757d;
}

.note-actions {
  display: flex;
  gap: 0.75rem;
}

.btn-action {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.3s;
}

.btn-view {
  background: #e3f2fd;
  color: #1976d2;
}

.btn-view:hover {
  background: #bbdefb;
}

.btn-comment {
  background: #f3e5f5;
  color: #7b1fa2;
}

.btn-comment:hover {
  background: #e1bee7;
}
</style>
