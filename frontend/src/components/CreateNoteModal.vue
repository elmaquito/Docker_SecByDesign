<template>
  <div v-if="show" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>📝 Créer une Nouvelle Note</h3>
        <button @click="$emit('close')" class="modal-close">×</button>
      </div>
      
      <form @submit.prevent="submitNote" class="note-form">
        <!-- Main Content -->
        <div class="form-group">
          <input v-model="form.title" placeholder="Titre de la note" required class="form-input" />
        </div>
        <div class="form-group">
           <textarea v-model="form.content" placeholder="Contenu de la note (Markdown supporté)" required class="form-textarea"></textarea>
        </div>

        <!-- Tags Selection -->
        <div class="form-section">
          <h4>🏷️ Labels (Tags)</h4>
          <div class="tags-container">
             <div v-for="tag in availableTags" :key="tag.id" 
                  class="tag-pill" 
                  :class="{ selected: form.selectedTags.includes(tag.id) }"
                  @click="toggleTag(tag.id)"
             >
                {{ tag.name }}
             </div>
          </div>
        </div>

        <!-- Targeting (Role specific) -->
        <div v-if="canAssign" class="form-section">
          <h4>🎯 Assignation (Ciblage)</h4>
          <div class="target-controls">
             <div class="target-row">
                <select v-model="newTargetType" class="form-select">
                   <option value="all">Tout le monde (Public)</option>
                   <option value="classe">Une Classe</option>
                   <option value="promotion">Une Promotion</option>
                   <option value="niveau">Un Niveau</option>
                   <!-- <option value="user">Un Utilisateur Spécifique</option> -->
                </select>
                
                <div v-if="newTargetType !== 'all'" class="target-value-input">
                   <!-- Dynamic input based on type -->
                   <select v-if="newTargetType === 'classe'" v-model="newTargetValue" class="form-select">
                      <option disabled value="">Choisir une classe</option>
                      <option v-for="c in tagStore.classes" :key="c.id" :value="c.name">{{ c.name }}</option>
                   </select>

                   <select v-else-if="newTargetType === 'niveau'" v-model="newTargetValue" class="form-select">
                      <option disabled value="">Choisir un niveau</option>
                      <option value="2nde">2nde</option>
                      <option value="1ere">1ere</option>
                      <option value="Terminale">Terminale</option>
                   </select>

                   <input v-else v-model="newTargetValue" placeholder="Valeur (ex: 2024)" class="form-input" />
                   
                   <button type="button" @click="addTarget" class="btn-sm btn-primary">Ajouter</button>
                </div>
             </div>

             <!-- List of added targets -->
             <div class="added-targets">
                <div v-for="(t, idx) in form.targets" :key="idx" class="target-chip">
                   <span>{{ getTargetLabel(t) }}</span>
                   <button type="button" @click="removeTarget(idx)" class="btn-xs">×</button>
                </div>
             </div>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" @click="$emit('close')" class="btn-cancel">Annuler</button>
          <button type="submit" :disabled="isSaving" class="btn-submit">
            {{ isSaving ? 'Publication...' : 'Publier' }}
          </button>
        </div>
        <div v-if="error" class="error-text">{{ error }}</div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useTagStore } from '../stores/tag'
import { useNoteStore } from '../stores/note'

const props = defineProps(['show', 'user'])
const emit = defineEmits(['close', 'created'])

const tagStore = useTagStore()
const noteStore = useNoteStore()

const isSaving = ref(false)
const error = ref('')

const form = reactive({
  title: '',
  content: '',
  selectedTags: [] as number[],
  targets: [] as any[]
})

// Local state for target builder
const newTargetType = ref('all')
const newTargetValue = ref('')

// Computed
const availableTags = computed(() => {
   // Combine all tags for selection
   return [...tagStore.classes, ...tagStore.specialites, ...tagStore.groupes, ...tagStore.categories]
})

const canAssign = computed(() => {
   return ['admin', 'teacher', 'technician'].includes(props.user?.role)
})

// Methods
const toggleTag = (id: number) => {
   const idx = form.selectedTags.indexOf(id)
   if (idx === -1) form.selectedTags.push(id)
   else form.selectedTags.splice(idx, 1)
}

const addTarget = () => {
   if (newTargetType.value !== 'all' && !newTargetValue.value) return
   
   form.targets.push({
      type: newTargetType.value,
      value: newTargetType.value === 'all' ? null : newTargetValue.value
   })
   
   // Reset
   newTargetValue.value = ''
   newTargetType.value = 'all'
}

const removeTarget = (idx: number) => {
   form.targets.splice(idx, 1)
}

const getTargetLabel = (target: any) => {
   if (target.type === 'all') return '🌍 Public (Tout le monde)'
   return `${target.type}: ${target.value}`
}

const submitNote = async () => {
  isSaving.value = true
  error.value = ''
  
  try {
     // Prepare payload
     const payload = {
        title: form.title,
        content: form.content,
        tags: form.selectedTags,
        targets: form.targets
     }
     
     if (payload.targets.length === 0 && canAssign.value) {
        // If teacher doesn't specify target, warn or default?
        // Let's assume default is "Private" (no target) if list empty.
     }

     await noteStore.createNote(payload)
     
     // Reset form
     form.title = ''
     form.content = ''
     form.selectedTags = []
     form.targets = []
     
     emit('created')
     emit('close')
  } catch (e: any) {
     error.value = e.message || 'Erreur lors de la création'
  } finally {
     isSaving.value = false
  }
}

onMounted(() => {
   tagStore.fetchTags()
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
}

.note-form {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-input, .form-textarea, .form-select {
  width: 100%;
  padding: 0.8rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
}

.form-textarea {
  min-height: 150px;
  resize: vertical;
}

.form-section h4 {
  margin-bottom: 0.8rem;
  color: #555;
  font-size: 0.9rem;
  text-transform: uppercase;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag-pill {
  padding: 0.4rem 0.8rem;
  background: #f0f0f0;
  border-radius: 20px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.tag-pill:hover {
  background: #e0e0e0;
}

.tag-pill.selected {
  background: #e3f2fd;
  color: #1976d2;
  border-color: #1976d2;
}

.target-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.target-value-input {
  display: flex;
  gap: 0.5rem;
  flex: 1;
}

.added-targets {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.target-chip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #fff3e0;
  color: #e65100;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.9rem;
}

.btn-xs {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-weight: bold;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

.btn-submit {
  background: #007bff;
  color: white;
  padding: 0.8rem 1.5rem;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-weight: 500;
}

.btn-cancel {
  background: #f8f9fa;
  color: #333;
  padding: 0.8rem 1.5rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
}

.btn-sm {
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    border: none;
    cursor: pointer;
}
.btn-primary { 
    background: #007bff; color: white;
}

.error-text {
  color: #dc3545;
  text-align: center;
  margin-top: 0.5rem;
}
</style>