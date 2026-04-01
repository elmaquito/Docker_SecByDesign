import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../../src/stores/auth'
import { UserRole } from '../../src/types/models'

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initial user is null', () => {
    const store = useAuthStore()
    expect(store.user).toBeNull()
  })

  it('isAuthenticated is false when user is null', () => {
    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(false)
  })

  it('isAuthenticated is true after setUser', () => {
    const store = useAuthStore()
    store.setUser({ id: 1, username: 'test', email: 'test@test.com', role: UserRole.STUDENT })
    expect(store.isAuthenticated).toBe(true)
  })

  it('setUser stores user data', () => {
    const store = useAuthStore()
    const user = { id: 1, username: 'testuser', email: 'test@test.com', role: UserRole.STUDENT }
    store.setUser(user)
    expect(store.user).toEqual(user)
  })

  it('isAdmin returns true for admin role', () => {
    const store = useAuthStore()
    store.setUser({ id: 1, username: 'admin', email: 'admin@test.com', role: UserRole.ADMIN })
    expect(store.isAdmin).toBe(true)
  })

  it('isTeacher returns true for teacher role', () => {
    const store = useAuthStore()
    store.setUser({ id: 1, username: 'teacher', email: 'teacher@test.com', role: UserRole.TEACHER })
    expect(store.isTeacher).toBe(true)
  })

  it('isStudent returns true for student role', () => {
    const store = useAuthStore()
    store.setUser({ id: 1, username: 'student', email: 'student@test.com', role: UserRole.STUDENT })
    expect(store.isStudent).toBe(true)
  })

  it('isAdmin returns false for non-admin role', () => {
    const store = useAuthStore()
    store.setUser({ id: 1, username: 'student', email: 'student@test.com', role: UserRole.STUDENT })
    expect(store.isAdmin).toBe(false)
  })

  it('logout sets user to null', () => {
    const store = useAuthStore()
    store.setUser({ id: 1, username: 'test', email: 'test@test.com', role: UserRole.STUDENT })
    store.logout()
    expect(store.user).toBeNull()
  })
})
