import { defineStore } from 'pinia'
import { ref } from 'vue'
import { API_V1_BASE_URL } from '../config/api'
import type { User } from '../types/models'

export const useUserStore = defineStore('user', () => {
  const users = ref<User[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchUsers() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`${API_V1_BASE_URL}/users`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch users')
      users.value = await res.json()
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function createUser(newUser: any) {
    loading.value = true
    try {
      const res = await fetch(`${API_V1_BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
        credentials: 'include'
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create user')
      }
      const savedUser = await res.json()
      users.value.push(savedUser)
      return savedUser
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    users,
    loading,
    error,
    fetchUsers,
    createUser
  }
})
