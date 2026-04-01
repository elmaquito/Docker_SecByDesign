import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import Reactions from '../../src/components/Reactions.vue'

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Reactions.vue', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ reaction: null }) })
  })
  afterEach(() => { vi.clearAllMocks() })

  it('renders up and down reaction buttons', () => {
    const wrapper = mount(Reactions, { props: { noteId: 1, initialUpCount: 5, initialDownCount: 2 } })
    expect(wrapper.findAll('.reaction-btn').length).toBe(2)
  })

  it('displays initial up count', () => {
    const wrapper = mount(Reactions, { props: { noteId: 1, initialUpCount: 10, initialDownCount: 3 } })
    expect(wrapper.text()).toContain('10')
  })

  it('displays initial down count', () => {
    const wrapper = mount(Reactions, { props: { noteId: 1, initialUpCount: 10, initialDownCount: 3 } })
    expect(wrapper.text()).toContain('3')
  })

  it('renders with zero counts by default', () => {
    const wrapper = mount(Reactions, { props: { noteId: 1 } })
    const counts = wrapper.findAll('.count')
    expect(counts[0].text()).toBe('0')
    expect(counts[1].text()).toBe('0')
  })

  it('increments up count optimistically when up button is clicked', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ reaction: null }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'Reaction saved' }) })
    const wrapper = mount(Reactions, { props: { noteId: 1, initialUpCount: 5, initialDownCount: 2 } })
    await wrapper.vm.$nextTick()
    const upButton = wrapper.findAll('.reaction-btn')[0]
    await upButton.trigger('click')
    await wrapper.vm.$nextTick()
    expect(upButton.find('.count').text()).toBe('6')
  })

  it('increments down count optimistically when down button is clicked', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ reaction: null }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'Reaction saved' }) })
    const wrapper = mount(Reactions, { props: { noteId: 1, initialUpCount: 5, initialDownCount: 2 } })
    await wrapper.vm.$nextTick()
    const downButton = wrapper.findAll('.reaction-btn')[1]
    await downButton.trigger('click')
    await wrapper.vm.$nextTick()
    expect(downButton.find('.count').text()).toBe('3')
  })

  it('removes up reaction when clicking up again (toggle off)', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ reaction: 'up' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'Reaction removed' }) })
    const wrapper = mount(Reactions, { props: { noteId: 1, initialUpCount: 5, initialDownCount: 2 } })
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    const upButton = wrapper.findAll('.reaction-btn')[0]
    await upButton.trigger('click')
    await wrapper.vm.$nextTick()
    expect(upButton.find('.count').text()).toBe('4')
  })

  it('switches reaction from up to down', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ reaction: 'up' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'Reaction changed' }) })
    const wrapper = mount(Reactions, { props: { noteId: 1, initialUpCount: 5, initialDownCount: 2 } })
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    const downButton = wrapper.findAll('.reaction-btn')[1]
    await downButton.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.reaction-btn')[0].find('.count').text()).toBe('4')
    expect(downButton.find('.count').text()).toBe('3')
  })

  it('reverts optimistic update on API failure', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ reaction: null }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Unauthorized' }) })
    const wrapper = mount(Reactions, { props: { noteId: 1, initialUpCount: 5, initialDownCount: 2 } })
    await wrapper.vm.$nextTick()
    const upButton = wrapper.findAll('.reaction-btn')[0]
    await upButton.trigger('click')
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(upButton.find('.count').text()).toBe('5')
  })

  it('marks up button as active when user has up reaction', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ reaction: 'up' }) })
    const wrapper = mount(Reactions, { props: { noteId: 1, initialUpCount: 5, initialDownCount: 2 } })
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(wrapper.findAll('.reaction-btn')[0].classes()).toContain('active')
  })

  it('marks down button as active when user has down reaction', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ reaction: 'down' }) })
    const wrapper = mount(Reactions, { props: { noteId: 1, initialUpCount: 5, initialDownCount: 2 } })
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(wrapper.findAll('.reaction-btn')[1].classes()).toContain('active')
  })
})
