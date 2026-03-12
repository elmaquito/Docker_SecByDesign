import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import Reactions from '../../components/Reactions.vue'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Reactions.vue', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    // Default: no user reaction
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ reaction: null })
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // -------------------------
  // Rendering tests
  // -------------------------
  it('renders up and down reaction buttons', () => {
    const wrapper = mount(Reactions, {
      props: { noteId: 1, initialUpCount: 5, initialDownCount: 2 }
    })
    const buttons = wrapper.findAll('.reaction-btn')
    expect(buttons.length).toBe(2)
  })

  it('displays initial up count', () => {
    const wrapper = mount(Reactions, {
      props: { noteId: 1, initialUpCount: 10, initialDownCount: 3 }
    })
    expect(wrapper.text()).toContain('10')
  })

  it('displays initial down count', () => {
    const wrapper = mount(Reactions, {
      props: { noteId: 1, initialUpCount: 10, initialDownCount: 3 }
    })
    expect(wrapper.text()).toContain('3')
  })

  it('renders with zero counts by default', () => {
    const wrapper = mount(Reactions, {
      props: { noteId: 1 }
    })
    const counts = wrapper.findAll('.count')
    expect(counts[0].text()).toBe('0')
    expect(counts[1].text()).toBe('0')
  })

  // -------------------------
  // Interaction tests
  // -------------------------
  it('increments up count optimistically when up button is clicked', async () => {
    // Mock: no existing reaction, then successful toggle
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ reaction: null }) }) // fetchUserReaction
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'Reaction saved' }) }) // toggleReaction

    const wrapper = mount(Reactions, {
      props: { noteId: 1, initialUpCount: 5, initialDownCount: 2 }
    })
    await wrapper.vm.$nextTick()

    const upButton = wrapper.findAll('.reaction-btn')[0]
    await upButton.trigger('click')
    await wrapper.vm.$nextTick()

    // After click, up count should be 6 (optimistic update)
    expect(upButton.find('.count').text()).toBe('6')
  })

  it('increments down count optimistically when down button is clicked', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ reaction: null }) }) // fetchUserReaction
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'Reaction saved' }) }) // toggleReaction

    const wrapper = mount(Reactions, {
      props: { noteId: 1, initialUpCount: 5, initialDownCount: 2 }
    })
    await wrapper.vm.$nextTick()

    const downButton = wrapper.findAll('.reaction-btn')[1]
    await downButton.trigger('click')
    await wrapper.vm.$nextTick()

    expect(downButton.find('.count').text()).toBe('3')
  })

  it('removes up reaction when clicking up again (toggle off)', async () => {
    // User already has 'up' reaction
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ reaction: 'up' }) }) // fetchUserReaction
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'Reaction removed' }) }) // toggleReaction

    const wrapper = mount(Reactions, {
      props: { noteId: 1, initialUpCount: 5, initialDownCount: 2 }
    })
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))

    const upButton = wrapper.findAll('.reaction-btn')[0]
    await upButton.trigger('click')
    await wrapper.vm.$nextTick()

    // Count should decrease by 1 (remove reaction)
    expect(upButton.find('.count').text()).toBe('4')
  })

  it('switches reaction from up to down', async () => {
    // User has 'up' reaction, switches to 'down'
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ reaction: 'up' }) }) // fetchUserReaction
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'Reaction changed' }) }) // toggleReaction

    const wrapper = mount(Reactions, {
      props: { noteId: 1, initialUpCount: 5, initialDownCount: 2 }
    })
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))

    // Click down button while having 'up'
    const downButton = wrapper.findAll('.reaction-btn')[1]
    await downButton.trigger('click')
    await wrapper.vm.$nextTick()

    // Up count should decrease, down count should increase
    const upButton = wrapper.findAll('.reaction-btn')[0]
    expect(upButton.find('.count').text()).toBe('4')
    expect(downButton.find('.count').text()).toBe('3')
  })

  it('reverts optimistic update on API failure', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ reaction: null }) }) // fetchUserReaction
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Unauthorized' })
      }) // toggleReaction fails

    const wrapper = mount(Reactions, {
      props: { noteId: 1, initialUpCount: 5, initialDownCount: 2 }
    })
    await wrapper.vm.$nextTick()

    const upButton = wrapper.findAll('.reaction-btn')[0]
    await upButton.trigger('click')
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))

    // Should revert to original count after failure
    expect(upButton.find('.count').text()).toBe('5')
  })

  it('marks up button as active when user has up reaction', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reaction: 'up' })
    })

    const wrapper = mount(Reactions, {
      props: { noteId: 1, initialUpCount: 5, initialDownCount: 2 }
    })
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))

    const upButton = wrapper.findAll('.reaction-btn')[0]
    expect(upButton.classes()).toContain('active')
  })

  it('marks down button as active when user has down reaction', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reaction: 'down' })
    })

    const wrapper = mount(Reactions, {
      props: { noteId: 1, initialUpCount: 5, initialDownCount: 2 }
    })
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))

    const downButton = wrapper.findAll('.reaction-btn')[1]
    expect(downButton.classes()).toContain('active')
  })
})
