
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import NoteCard from '../src/components/NoteCard.vue'

describe('NoteCard.vue', () => {
    const mockNote = {
        id: 1,
        title: 'Test Note',
        content: 'This is a test note content.',
        user_id: 1,
        created_at: new Date().toISOString(),
        targets: [
            { type: 'classe', value: 'Cyber1' },
            { type: 'all', value: null }
        ],
        tags: [
            { id: 1, name: 'Urgent', type: 'categorie', meta: { color: 'red' } }
        ]
    }

    it('renders note title and content', () => {
        const wrapper = mount(NoteCard, {
            props: { note: mockNote }
        })
        expect(wrapper.text()).toContain('Test Note')
        expect(wrapper.text()).toContain('This is a test note content.')
    })

    it('displays target badges', () => {
        const wrapper = mount(NoteCard, {
            props: { note: mockNote }
        })
        // targets are displayed only if not public according to logic?
        // Wait, logic: v-if="note.targets && ... && !isPublic(note)"
        // mockNote bas 'all' target -> isPublic = true
        // So targets should NOT be displayed
        expect(wrapper.find('.note-targets').exists()).toBe(false)
    })

    it('displays target badges for specific targets (non-public)', () => {
        const privateNote = { ...mockNote, targets: [{ type: 'classe', value: 'Cyber1' }] }
        const wrapper = mount(NoteCard, {
            props: { note: privateNote }
        })
        expect(wrapper.find('.note-targets').exists()).toBe(true)
        expect(wrapper.text()).toContain('Classe Cyber1')
    })
})
