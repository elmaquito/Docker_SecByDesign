import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFeedStore } from '../../src/stores/feed'

vi.mock('../../src/config/api', () => ({ API_V1_BASE_URL: '/api/v1' }))

const mockFetch = vi.fn()
global.fetch = mockFetch

const makeFeedResponse = (data: any[], total = 10, totalPages = 2) => ({
  data,
  meta: { total, totalPages }
})

const sampleNote = {
  id: 1,
  title: 'Feed Note',
  content: 'Content',
  user_id: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  tags: [],
  targets: []
}

describe('useFeedStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFetch.mockReset()
  })
  afterEach(() => { vi.clearAllMocks() })

  it('has empty initial state', () => {
    const store = useFeedStore()
    expect(store.notes).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.hasMore).toBe(true)
  })

  it('fetchFeed populates notes on success', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeFeedResponse([sampleNote]) })
    const store = useFeedStore()
    await store.fetchFeed()
    expect(store.notes.length).toBe(1)
  })

  it('fetchFeed sets error on failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false })
    const store = useFeedStore()
    await store.fetchFeed()
    expect(store.error).toBeTruthy()
  })

  it('fetchFeed appends notes on pagination', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => makeFeedResponse([sampleNote], 20, 2) })
      .mockResolvedValueOnce({ ok: true, json: async () => makeFeedResponse([{ ...sampleNote, id: 2 }], 20, 2) })
    const store = useFeedStore()
    await store.fetchFeed()
    await store.fetchFeed()
    expect(store.notes.length).toBe(2)
  })

  it('fetchFeed with reset=true clears existing notes', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => makeFeedResponse([sampleNote], 20, 2) })
      .mockResolvedValueOnce({ ok: true, json: async () => makeFeedResponse([{ ...sampleNote, id: 2 }], 20, 2) })
    const store = useFeedStore()
    await store.fetchFeed()
    await store.fetchFeed(true)
    expect(store.notes.length).toBe(1)
    expect(store.notes[0].id).toBe(2)
  })

  it('does not fetch if hasMore is false', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeFeedResponse([sampleNote], 10, 1) })
    const store = useFeedStore()
    await store.fetchFeed()
    expect(store.hasMore).toBe(false)
    await store.fetchFeed()
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('includes tags filter in URL when set', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeFeedResponse([]) })
    const store = useFeedStore()
    store.filters.tags = ['maths']
    await store.fetchFeed()
    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain('tags=maths')
  })

  it('includes search filter in URL when set', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeFeedResponse([]) })
    const store = useFeedStore()
    store.filters.search = 'algebra'
    await store.fetchFeed()
    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain('search=algebra')
  })

  it('setFilter updates filters and triggers fetch', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => makeFeedResponse([]) })
    const store = useFeedStore()
    await store.setFilter('search', 'test')
    expect(store.filters.search).toBe('test')
    expect(mockFetch).toHaveBeenCalled()
  })

  it('hasMore is true when more pages exist', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeFeedResponse([sampleNote], 20, 3) })
    const store = useFeedStore()
    await store.fetchFeed()
    expect(store.hasMore).toBe(true)
  })

  it('hasMore is false when on last page', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeFeedResponse([sampleNote], 10, 1) })
    const store = useFeedStore()
    await store.fetchFeed()
    expect(store.hasMore).toBe(false)
  })
})
