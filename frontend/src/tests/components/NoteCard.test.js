import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import NoteCard from '../../components/NoteCard.vue'

describe('NoteCard', () => {
    const defaultNote = {
        id: 1,
        title: 'Test Note',
        content: 'This is a test note.',
        created_at: new Date().toISOString(),
        owner_username: 'test_user',
        owner_role: 'student',
        theme: { name: 'Dark', color: '#000000' },
        themes: [{ id: 1, name: 'Dark', color: '#000000' }],
    };
  
  it('renders title propery', () => {
    const wrapper = mount(NoteCard, {
      props: {
        note: defaultNote
      }
    })
    expect(wrapper.text()).toContain('Test Note')
  })

  it('renders author', () => {
      const wrapper = mount(NoteCard, {
          props: { note: defaultNote }
      })
      expect(wrapper.text()).toContain('Par test_user')
  })
})
