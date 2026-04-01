import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import NoteCard from '../../src/components/NoteCard.vue'

const baseNote = {
  id: 1,
  title: 'Test Note',
  content: 'This is a test note content.',
  user_id: 1,
  created_at: new Date().toISOString(),
  owner_username: 'test_user',
  owner_role: 'student',
  theme: { name: 'Dark', color: '#000000' },
  themes: [{ id: 1, name: 'Dark', color: '#000000' }],
  tags: [{ id: 1, name: 'Urgent', type: 'categorie', meta: { color: 'red' } }],
  targets: [{ type: 'classe', value: 'Cyber1' }, { type: 'all', value: null }],
}

describe('NoteCard.vue', () => {
  it('renders note title', () => {
    const wrapper = mount(NoteCard, { props: { note: baseNote } })
    expect(wrapper.text()).toContain('Test Note')
  })

  it('renders note content', () => {
    const wrapper = mount(NoteCard, { props: { note: baseNote } })
    expect(wrapper.text()).toContain('This is a test note content.')
  })

  it('renders the author username', () => {
    const wrapper = mount(NoteCard, { props: { note: baseNote } })
    expect(wrapper.text()).toContain('Par test_user')
  })

  it('does NOT display target badges when note is public (has "all" target)', () => {
    const wrapper = mount(NoteCard, { props: { note: baseNote } })
    // note has 'all' target -> isPublic = true -> .note-targets hidden
    expect(wrapper.find('.note-targets').exists()).toBe(false)
  })

  it('displays target badges for non-public notes', () => {
    const privateNote = { ...baseNote, targets: [{ type: 'classe', value: 'Cyber1' }] }
    const wrapper = mount(NoteCard, { props: { note: privateNote } })
    expect(wrapper.find('.note-targets').exists()).toBe(true)
    expect(wrapper.text()).toContain('Classe Cyber1')
  })
})
