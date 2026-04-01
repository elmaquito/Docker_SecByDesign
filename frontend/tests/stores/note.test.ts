import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNoteStore } from '../../src/stores/note'

vi.mock('../../src/config/api', () => ({ API_V1_BASE_URL: '/api/v1' }))

const mockFetch = vi.fn()
global.fetch = mockFetch

const sampleNote = {
  id: 1,
  title: 'Test Note',
  content: 'Test content',
  user_id: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  tags: [],
  targets: []
}

describe('useNoteStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFetch.mockReset()
  })
  afterEach(() => { vi.clearAllMocks() })

  it('initially has empty notes array', () => {
    const store = useNoteStore()
    expect(store.notes).toEqual([])
  })

  it('fetchNotes populates notes on success', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [sampleNote] })
    const store = useNoteStore()
    await store.fetchNotes()
    expect(store.notes.length).toBe(1)
    expect(store.notes[0].id).toBe(1)
  })

  it('fetchNotes sets error on failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false })
    const store = useNoteStore()
    await store.fetchNotes()
    expect(store.error).toBeTruthy()
  })

  it('fetchNotes initializes note state fields', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [sampleNote] })
    const store = useNoteStore()
    await store.fetchNotes()
    expect(store.notes[0]._editing).toBe(false)
    expect(store.notes[0]._saving).toBe(false)
    expect(store.notes[0]._comments).toEqual([])
  })

  it('createNote prepends note to list', async () => {
    const newNote = { ...sampleNote, id: 2, title: 'New Note' }
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => newNote })
    const store = useNoteStore()
    await store.createNote({ title: 'New Note', content: 'Content' })
    expect(store.notes.length).toBe(1)
    expect(store.notes[0].id).toBe(2)
  })

  it('createNote throws on API failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Forbidden' }) })
    const store = useNoteStore()
    await expect(store.createNote({ title: 'x' })).rejects.toThrow()
  })

  it('updateNote modifies existing note in store', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => [sampleNote] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...sampleNote, title: 'Updated' }) })
    const store = useNoteStore()
    await store.fetchNotes()
    await store.updateNote(1, { title: 'Updated' })
    expect(store.notes[0].title).toBe('Updated')
  })

  it('updateNote throws on API failure', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => [sampleNote] })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Not found' }) })
    const store = useNoteStore()
    await store.fetchNotes()
    await expect(store.updateNote(1, { title: 'x' })).rejects.toThrow()
  })

  it('deleteNote removes note from store', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => [sampleNote] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    const store = useNoteStore()
    await store.fetchNotes()
    await store.deleteNote(1)
    expect(store.notes.length).toBe(0)
  })

  it('deleteNote throws on failure', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => [sampleNote] })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Forbidden' }) })
    const store = useNoteStore()
    await store.fetchNotes()
    await expect(store.deleteNote(1)).rejects.toThrow()
  })

  it('fetchComments attaches comments to note', async () => {
    const comments = [{ id: 1, content: 'Nice note', user_id: 2, note_id: 1 }]
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => [sampleNote] })
      .mockResolvedValueOnce({ ok: true, json: async () => comments })
    const store = useNoteStore()
    await store.fetchNotes()
    await store.fetchComments(1)
    expect(store.notes[0]._comments).toEqual(comments)
  })

  it('addComment pushes to note comments', async () => {
    const comment = { id: 2, content: 'Great!', user_id: 1, note_id: 1 }
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => [sampleNote] })
      .mockResolvedValueOnce({ ok: true, json: async () => comment })
    const store = useNoteStore()
    await store.fetchNotes()
    await store.addComment(1, 'Great!')
    expect(store.notes[0]._comments.length).toBe(1)
  })

  it('addComment throws on failure', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => [sampleNote] })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Unauthorized' }) })
    const store = useNoteStore()
    await store.fetchNotes()
    await expect(store.addComment(1, 'test')).rejects.toThrow()
  })
})
