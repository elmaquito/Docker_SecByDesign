<template>
  <div class="category-manager">
    <div class="manager-header">
      <h2>📂 Gestion des Catégories</h2>
      <p class="manager-subtitle">Gérez les catégories utilisées pour cibler les notes vers les étudiants.</p>
    </div>

    <!-- Search + Create Bar -->
    <div class="toolbar">
      <div class="search-wrapper">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Rechercher une catégorie..."
          class="search-input"
          aria-label="Rechercher une catégorie"
        />
      </div>
      <button
        v-if="canCreate"
        class="btn-primary"
        @click="openCreateModal"
        aria-label="Créer une nouvelle catégorie"
      >
        + Créer une catégorie
      </button>
    </div>

    <!-- Error Message -->
    <div v-if="tagStore.error" class="alert alert-error" role="alert">
      {{ tagStore.error }}
    </div>

    <!-- Loading -->
    <div v-if="tagStore.loading" class="loading-state" aria-live="polite">
      <span class="spinner" aria-hidden="true"></span>
      Chargement des catégories...
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredCategories.length === 0" class="empty-state">
      <span class="empty-icon" aria-hidden="true">📂</span>
      <p>{{ searchQuery ? 'Aucune catégorie ne correspond à votre recherche.' : 'Aucune catégorie créée pour l\'instant.' }}</p>
      <button v-if="canCreate && !searchQuery" class="btn-primary" @click="openCreateModal">
        Créer la première catégorie
      </button>
    </div>

    <!-- Categories List -->
    <ul v-else class="categories-list" role="list">
      <li
        v-for="category in filteredCategories"
        :key="category.id"
        class="category-item"
        :style="{ borderLeftColor: category.meta?.color || 'var(--secondary-color)' }"
      >
        <div class="category-info">
          <div class="category-name-row">
            <span
              class="category-badge-dot"
              :style="{ backgroundColor: category.meta?.color || 'var(--secondary-color)' }"
              aria-hidden="true"
            ></span>
            <strong class="category-name">{{ category.name }}</strong>
            <span v-if="category.is_default_for_student_view" class="badge badge-default" title="Visible par défaut pour les étudiants">
              Par défaut
            </span>
          </div>
          <p v-if="category.meta?.description" class="category-description">{{ category.meta.description }}</p>
          <span class="category-meta-label">Catégorie</span>
        </div>
        <div v-if="canCreate" class="category-actions">
          <button
            class="btn-icon"
            :title="`Modifier ${category.name}`"
            :aria-label="`Modifier la catégorie ${category.name}`"
            @click="openEditModal(category)"
          >
            ✏️
          </button>
          <button
            class="btn-icon btn-danger-icon"
            :title="`Supprimer ${category.name}`"
            :aria-label="`Supprimer la catégorie ${category.name}`"
            @click="confirmDelete(category)"
          >
            🗑️
          </button>
        </div>
      </li>
    </ul>

    <!-- Create / Edit Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" role="dialog" aria-modal="true" :aria-labelledby="'modal-title-category'">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3 id="modal-title-category">{{ editingCategory ? 'Modifier la catégorie' : 'Créer une catégorie' }}</h3>
            <button class="btn-close" aria-label="Fermer la modale" @click="closeModal">✕</button>
          </div>

          <form class="modal-form" @submit.prevent="saveCategory" novalidate>
            <!-- Name -->
            <div class="form-group">
              <label for="cat-name" class="form-label">Nom <span class="required" aria-hidden="true">*</span></label>
              <input
                id="cat-name"
                v-model="form.name"
                type="text"
                class="form-input"
                :class="{ 'is-invalid': errors.name }"
                maxlength="100"
                placeholder="Ex: Bac+1, Cyber2, 2024-2025"
                required
                aria-describedby="cat-name-error"
              />
              <span v-if="errors.name" id="cat-name-error" class="error-msg" role="alert">{{ errors.name }}</span>
              <span class="char-count">{{ form.name.length }}/100</span>
            </div>

            <!-- Description -->
            <div class="form-group">
              <label for="cat-desc" class="form-label">Description</label>
              <textarea
                id="cat-desc"
                v-model="form.description"
                class="form-textarea"
                maxlength="500"
                rows="3"
                placeholder="Description optionnelle..."
                aria-describedby="cat-desc-hint"
              ></textarea>
              <span id="cat-desc-hint" class="form-hint">Optionnel · {{ form.description.length }}/500</span>
            </div>

            <!-- Color -->
            <div class="form-group">
              <label class="form-label">Couleur du badge</label>
              <div class="color-picker" role="group" aria-label="Sélectionner une couleur">
                <button
                  v-for="color in COLOR_OPTIONS"
                  :key="color.value"
                  type="button"
                  class="color-swatch"
                  :class="{ selected: form.color === color.value }"
                  :style="{ backgroundColor: color.value }"
                  :title="color.label"
                  :aria-label="color.label"
                  :aria-pressed="form.color === color.value"
                  @click="form.color = color.value"
                ></button>
              </div>
            </div>

            <!-- Default for student view -->
            <div class="form-group form-group-checkbox">
              <input
                id="cat-default"
                v-model="form.isDefault"
                type="checkbox"
                class="form-checkbox"
              />
              <label for="cat-default" class="form-label-inline">
                Visible par défaut dans le feed étudiant
              </label>
            </div>

            <div v-if="saveError" class="alert alert-error" role="alert">{{ saveError }}</div>

            <div class="modal-footer">
              <button type="button" class="btn-secondary" @click="closeModal">Annuler</button>
              <button type="submit" class="btn-primary" :disabled="saving">
                {{ saving ? '⏳ Enregistrement...' : '💾 Enregistrer' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirm Modal -->
    <Teleport to="body">
      <div v-if="categoryToDelete" class="modal-overlay" role="alertdialog" aria-modal="true" aria-labelledby="delete-title-category">
        <div class="modal-content modal-small">
          <div class="modal-header">
            <h3 id="delete-title-category">Confirmer la suppression</h3>
          </div>
          <p class="delete-warning">
            Êtes-vous sûr de vouloir supprimer la catégorie <strong>« {{ categoryToDelete.name }} »</strong> ?
            Cette action est irréversible.
          </p>
          <div v-if="deleteError" class="alert alert-error" role="alert">{{ deleteError }}</div>
          <div class="modal-footer">
            <button class="btn-secondary" @click="categoryToDelete = null">Annuler</button>
            <button class="btn-danger" :disabled="deleting" @click="executeDelete">
              {{ deleting ? '⏳ Suppression...' : '🗑️ Supprimer' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTagStore } from '../stores/tag'
import type { Tag } from '../types/models'

const props = defineProps<{
  userRole: string
}>()

const tagStore = useTagStore()

const searchQuery = ref('')
const showModal = ref(false)
const editingCategory = ref<Tag | null>(null)
const categoryToDelete = ref<Tag | null>(null)
const saving = ref(false)
const deleting = ref(false)
const saveError = ref('')
const deleteError = ref('')

const COLOR_OPTIONS = [
  { value: '#10b981', label: 'Vert émeraude' },
  { value: '#3b82f6', label: 'Bleu' },
  { value: '#f59e0b', label: 'Ambre' },
  { value: '#ef4444', label: 'Rouge' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#ec4899', label: 'Rose' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#64748b', label: 'Ardoise' },
]

const form = ref({
  name: '',
  description: '',
  color: COLOR_OPTIONS[0].value,
  isDefault: false,
})

const errors = ref<{ name?: string }>({})

const canCreate = computed(() => ['admin', 'teacher'].includes(props.userRole))

const filteredCategories = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return tagStore.categories.filter(c =>
    !query || c.name.toLowerCase().includes(query) || (c.meta?.description ?? '').toLowerCase().includes(query)
  )
})

function resetForm() {
  form.value = { name: '', description: '', color: COLOR_OPTIONS[0].value, isDefault: false }
  errors.value = {}
  saveError.value = ''
}

function openCreateModal() {
  resetForm()
  editingCategory.value = null
  showModal.value = true
}

function openEditModal(category: Tag) {
  editingCategory.value = category
  form.value = {
    name: category.name,
    description: category.meta?.description ?? '',
    color: category.meta?.color ?? COLOR_OPTIONS[0].value,
    isDefault: category.is_default_for_student_view,
  }
  errors.value = {}
  saveError.value = ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingCategory.value = null
  resetForm()
}

function validate(): boolean {
  errors.value = {}
  if (!form.value.name.trim()) {
    errors.value.name = 'Le nom est obligatoire.'
    return false
  }
  if (form.value.name.trim().length > 100) {
    errors.value.name = 'Le nom ne peut pas dépasser 100 caractères.'
    return false
  }
  return true
}

async function saveCategory() {
  if (!validate()) return
  saving.value = true
  saveError.value = ''
  try {
    const payload = {
      type: 'categorie' as const,
      name: form.value.name.trim(),
      meta: {
        color: form.value.color,
        description: form.value.description.trim() || undefined,
      },
      is_default_for_student_view: form.value.isDefault,
    }
    if (editingCategory.value) {
      await tagStore.updateTag(editingCategory.value.id, payload)
    } else {
      await tagStore.createTag(payload)
    }
    closeModal()
  } catch (e: any) {
    saveError.value = e.message || 'Une erreur est survenue.'
  } finally {
    saving.value = false
  }
}

function confirmDelete(category: Tag) {
  categoryToDelete.value = category
  deleteError.value = ''
}

async function executeDelete() {
  if (!categoryToDelete.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    await tagStore.deleteTag(categoryToDelete.value.id)
    categoryToDelete.value = null
  } catch (e: any) {
    deleteError.value = e.message || 'Impossible de supprimer cette catégorie.'
  } finally {
    deleting.value = false
  }
}

onMounted(async () => {
  if (tagStore.tags.length === 0) {
    await tagStore.fetchTags()
  }
})
</script>

<style scoped>
.category-manager {
  max-width: 800px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}

.manager-header {
  margin-bottom: 1.5rem;
}

.manager-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-color, #1e293b);
  margin: 0 0 0.25rem;
}

.manager-subtitle {
  color: var(--text-muted, #64748b);
  font-size: 0.9rem;
  margin: 0;
}

/* Toolbar */
.toolbar {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
}

.search-wrapper {
  position: relative;
  flex: 1;
  min-width: 180px;
}

.search-icon {
  position: absolute;
  left: 0.65rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  font-size: 0.85rem;
}

.search-input {
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2rem;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  background: var(--card-bg, #fff);
  color: var(--text-color, #1e293b);
  font-size: 0.9rem;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.search-input:focus {
  outline: none;
  border-color: var(--secondary-color, #10b981);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
}

/* Buttons */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 1rem;
  background: var(--secondary-color, #10b981);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: filter 0.15s, opacity 0.15s;
}

.btn-primary:hover:not(:disabled) { filter: brightness(1.1); }
.btn-primary:disabled { opacity: 0.65; cursor: not-allowed; }

.btn-secondary {
  padding: 0.5rem 1rem;
  background: var(--card-bg, #f8fafc);
  color: var(--text-color, #1e293b);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-secondary:hover { background: var(--border-color, #e2e8f0); }

.btn-danger {
  padding: 0.5rem 1rem;
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: filter 0.15s, opacity 0.15s;
}

.btn-danger:hover:not(:disabled) { filter: brightness(1.1); }
.btn-danger:disabled { opacity: 0.65; cursor: not-allowed; }

.btn-icon {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.3rem;
  border-radius: 6px;
  transition: background 0.15s;
  line-height: 1;
}

.btn-icon:hover { background: var(--border-color, #e2e8f0); }

.btn-close {
  background: transparent;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  color: var(--text-muted, #64748b);
  padding: 0.25rem;
  border-radius: 4px;
}

.btn-close:hover { background: var(--border-color, #e2e8f0); }

/* Alerts */
.alert {
  padding: 0.65rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.alert-error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fca5a5;
}

/* Loading */
.loading-state {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-muted, #64748b);
  padding: 1.5rem 0;
}

.spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border: 2px solid var(--border-color, #e2e8f0);
  border-top-color: var(--secondary-color, #10b981);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Empty state */
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-muted, #64748b);
}

.empty-icon {
  display: block;
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
}

/* Categories List */
.categories-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.category-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: var(--card-bg, #fff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-left: 4px solid var(--secondary-color, #10b981);
  border-radius: 10px;
  transition: box-shadow 0.15s;
}

.category-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.category-info { flex: 1; min-width: 0; }

.category-name-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.25rem;
}

.category-badge-dot {
  display: inline-block;
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 50%;
  flex-shrink: 0;
}

.category-name {
  font-size: 1rem;
  color: var(--text-color, #1e293b);
}

.badge {
  font-size: 0.7rem;
  padding: 0.1rem 0.45rem;
  border-radius: 99px;
  font-weight: 600;
}

.badge-default {
  background: #dcfce7;
  color: #166534;
}

.category-description {
  font-size: 0.85rem;
  color: var(--text-muted, #64748b);
  margin: 0.25rem 0 0.35rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.category-meta-label {
  font-size: 0.75rem;
  color: var(--text-muted, #94a3b8);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.category-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: var(--card-bg, #fff);
  border-radius: 14px;
  padding: 1.5rem;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  max-height: 90vh;
  overflow-y: auto;
}

.modal-small { max-width: 380px; }

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-color, #1e293b);
}

.modal-form { display: flex; flex-direction: column; gap: 1rem; }

.form-group { display: flex; flex-direction: column; gap: 0.3rem; }

.form-group-checkbox {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-color, #374151);
}

.form-label-inline {
  font-size: 0.875rem;
  color: var(--text-color, #374151);
  cursor: pointer;
  margin: 0;
}

.required { color: #ef4444; }

.form-input,
.form-textarea {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  font-size: 0.9rem;
  background: var(--bg-color, #f8fafc);
  color: var(--text-color, #1e293b);
  transition: border-color 0.15s;
  box-sizing: border-box;
  width: 100%;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--secondary-color, #10b981);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
}

.form-input.is-invalid { border-color: #ef4444; }

.form-textarea { resize: vertical; }

.form-hint,
.char-count {
  font-size: 0.75rem;
  color: var(--text-muted, #94a3b8);
  text-align: right;
}

.error-msg {
  font-size: 0.8rem;
  color: #ef4444;
}

.form-checkbox {
  accent-color: var(--secondary-color, #10b981);
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

/* Color Picker */
.color-picker {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.color-swatch {
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 50%;
  border: 3px solid transparent;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.color-swatch:hover { transform: scale(1.15); }

.color-swatch.selected {
  border-color: var(--text-color, #1e293b);
  box-shadow: 0 0 0 2px var(--card-bg, #fff) inset;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.delete-warning {
  font-size: 0.9rem;
  color: var(--text-color, #1e293b);
  margin: 0.5rem 0 1rem;
}

/* Responsive */
@media (max-width: 480px) {
  .category-manager { padding: 1rem 0.5rem; }
  .toolbar { flex-direction: column; align-items: stretch; }
  .btn-primary { justify-content: center; }
  .category-item { flex-direction: column; gap: 0.5rem; }
  .category-actions { justify-content: flex-end; }
}
</style>
