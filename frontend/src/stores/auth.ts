import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { User, UserRole } from '../types/models'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  
  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === UserRole.ADMIN)
  const isTeacher = computed(() => user.value?.role === UserRole.TEACHER)
  const isStudent = computed(() => user.value?.role === UserRole.STUDENT)

  function setUser(newUser: User | null) {
      user.value = newUser
  }

  function logout() {
      user.value = null
      // Cookie removal happens via backend logout endpoint usually,
      // or frontend can clear if not httpOnly (but auth_token is httpOnly)
  }

  return {
    user,
    isAuthenticated,
    isAdmin,
    isTeacher,
    isStudent,
    setUser,
    logout
  }
})
