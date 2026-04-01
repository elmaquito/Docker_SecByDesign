import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTagStore } from '../../src/stores/tag'

vi.mock('../../src/config/api', () => ({ API_V1_BASE_URL: '/api/v1' }))

const mockFetch = vi.fn()
global.fetch = mockFetch

const sampleTags = [
  { id: 1, name: 'Maths', type: 'specialite', is_default_for_student_view: false },
  { id: 2, name: 'Terminale', type: 'classe', is_default_for_student_view: true },
  { id: 3, name: 'Groupe A', type: 'groupe', is_default_for_student_view: false },
  { id: 4, name: 'Cours', type: 'categorie', is_default_for_student_view: false }
]

describe('useTagStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFetch.mockReset()
  })
  afterEach(() => { vi.clearAllMocks() })

  it('initially has empty tags array', () => {
    const store = useTagStore()
    expect(store.tags).toEqual([])
  })

  it('fetchTags populates tags on success', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => sampleTags })
    const store = useTagStore()
    await store.fetchTags()
    expect(store.tags.length).toBe(4)
  })

  it('fetchTags sets error on failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false })
    const store = useTagStore()
    await store.fetchTags()
    expect(store.error).toBeTruthy()
  })

  it('classes computed returns only classe type tags', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => sampleTags })
    const store = useTagStore()
    await store.fetchTags()
    expect(store.classes.every(t => t.type === 'classe')).toBe(true)
    expect(store.classes.length).toBe(1)
  })

  it('specialites computed returns only specialite type tags', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => sampleTags })
    const store = useTagStore()
    await store.fetchTags()
    expect(store.specialites.every(t => t.type === 'specialite')).toBe(true)
  })

  it('groupes computed returns only groupe type tags', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => sampleTags })
    const store = useTagStore()
    await store.fetchTags()
    expect(store.groupes.every(t => t.type === 'groupe')).toBe(true)
  })

  it('categories computed returns only categorie type tags', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => sampleTags })
    const store = useTagStore()
    await store.fetchTags()
    expect(store.categories.every(t => t.type === 'categorie')).toBe(true)
  })

  it('defaultStudentTags returns tags with is_default_for_student_view true', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => sampleTags })
    const store = useTagStore()
    await store.fetchTags()
    expect(store.defaultStudentTags.length).toBe(1)
    expect(store.defaultStudentTags[0].id).toBe(2)
  })

  it('createTag adds new tag to store', async () => {
    const newTag = { id: 5, name: 'Physique', type: 'specialite', is_default_for_student_view: false }
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => newTag })
    const store = useTagStore()
    await store.createTag({ name: 'Physique', type: 'specialite' })
    expect(store.tags.length).toBe(1)
    expect(store.tags[0].name).toBe('Physique')
  })

  it('createTag throws on API failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Forbidden' }) })
    const store = useTagStore()
    await expect(store.createTag({ name: 'x', type: 'categorie' })).rejects.toThrow()
  })

  it('updateTag modifies tag in store', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => sampleTags })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...sampleTags[0], name: 'Updated' }) })
    const store = useTagStore()
    await store.fetchTags()
    await store.updateTag(1, { name: 'Updated' })
    expect(store.tags[0].name).toBe('Updated')
  })

  it('deleteTag removes tag from store', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => sampleTags })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    const store = useTagStore()
    await store.fetchTags()
    await store.deleteTag(1)
    expect(store.tags.find(t => t.id === 1)).toBeUndefined()
  })
})
