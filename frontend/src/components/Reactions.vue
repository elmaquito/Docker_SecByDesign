<template>
  <div class="reactions-container">
    <button 
      @click="toggleReaction('up')"
      :class="['reaction-btn', { active: userReaction === 'up' }]"
      :aria-label="`Pouce haut (${upCount})`"
      title="J'aime"
    >
      👍 <span class="count">{{ upCount }}</span>
    </button>
    
    <button 
      @click="toggleReaction('down')"
      :class="['reaction-btn', { active: userReaction === 'down' }]"
      :aria-label="`Pouce bas (${downCount})`"
      title="Je n'aime pas"
    >
      👎 <span class="count">{{ downCount }}</span>
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  noteId: {
    type: Number,
    required: true
  },
  initialUpCount: {
    type: Number,
    default: 0
  },
  initialDownCount: {
    type: Number,
    default: 0
  }
})

const userReaction = ref(null)
const upCount = ref(props.initialUpCount)
const downCount = ref(props.initialDownCount)

// Fetch user's current reaction
const fetchUserReaction = async () => {
  try {
    const res = await fetch(`http://127.0.0.1:3001/api/v1/notes/${props.noteId}/reactions/me`, {
      credentials: 'include'
    })
    
    if (res.ok) {
      const data = await res.json()
      userReaction.value = data.reaction
    }
  } catch (err) {
    console.error('Error fetching user reaction:', err)
  }
}

// Toggle reaction
const toggleReaction = async (type) => {
  const previousReaction = userReaction.value
  const previousUpCount = upCount.value
  const previousDownCount = downCount.value
  
  // Optimistic update
  if (userReaction.value === type) {
    // Remove reaction
    userReaction.value = null
    if (type === 'up') upCount.value--
    else downCount.value--
  } else if (userReaction.value === null) {
    // Add new reaction
    userReaction.value = type
    if (type === 'up') upCount.value++
    else downCount.value++
  } else {
    // Change reaction
    if (previousReaction === 'up') upCount.value--
    else downCount.value--
    
    userReaction.value = type
    if (type === 'up') upCount.value++
    else downCount.value++
  }
  
  try {
    const res = await fetch(`http://127.0.0.1:3001/api/v1/notes/${props.noteId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ reaction_type: type })
    })
    
    if (!res.ok) {
      // Revert on error
      userReaction.value = previousReaction
      upCount.value = previousUpCount
      downCount.value = previousDownCount
      
      const data = await res.json()
      console.error('Error toggling reaction:', data.error)
    }
  } catch (err) {
    // Revert on error
    userReaction.value = previousReaction
    upCount.value = previousUpCount
    downCount.value = previousDownCount
    console.error('Error toggling reaction:', err)
  }
}

onMounted(() => {
  fetchUserReaction()
})
</script>

<style scoped>
.reactions-container {
  display: flex;
  gap: 8px;
  align-items: center;
}

.reaction-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f5f5f5;
  border: 2px solid transparent;
  border-radius: 20px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s ease;
  user-select: none;
}

.reaction-btn:hover {
  background: #e8e8e8;
  transform: scale(1.05);
}

.reaction-btn.active {
  background: #e3f2fd;
  border-color: #2196f3;
  font-weight: 600;
}

.reaction-btn.active:hover {
  background: #d1e7fd;
}

.count {
  font-size: 14px;
  font-weight: 600;
  color: #666;
  min-width: 18px;
  text-align: center;
}

.reaction-btn.active .count {
  color: #2196f3;
}

@media (prefers-reduced-motion: reduce) {
  .reaction-btn {
    transition: none;
  }
  
  .reaction-btn:hover {
    transform: none;
  }
}
</style>
