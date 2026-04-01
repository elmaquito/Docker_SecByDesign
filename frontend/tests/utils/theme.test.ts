import { describe, it, expect } from 'vitest'
import { getThemeColor, initializeNoteState } from '../../src/utils/theme'
import type { Note } from '../../src/types/models'

describe('getThemeColor', () => {
  it('returns correct color for red', () => {
    expect(getThemeColor('red')).toBe('#e74c3c')
  })

  it('returns correct color for blue', () => {
    expect(getThemeColor('blue')).toBe('#3498db')
  })

  it('returns correct color for purple', () => {
    expect(getThemeColor('purple')).toBe('#9b59b6')
  })

  it('returns correct color for green', () => {
    expect(getThemeColor('green')).toBe('#2ecc71')
  })

  it('returns correct color for orange', () => {
    expect(getThemeColor('orange')).toBe('#e67e22')
  })

  it('returns default blue for unknown color', () => {
    expect(getThemeColor('unknown')).toBe('#3498db')
  })

  it('returns default blue for empty string', () => {
    expect(getThemeColor('')).toBe('#3498db')
  })
})

describe('initializeNoteState', () => {
  const baseNote: Note = {
    id: 1,
    title: 'Test Note',
    content: 'Test content',
    user_id: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    tags: [],
    targets: []
  } as unknown as Note

  it('sets _editing to false', () => {
    const result = initializeNoteState(baseNote)
    expect(result._editing).toBe(false)
  })

  it('sets _saving to false', () => {
    const result = initializeNoteState(baseNote)
    expect(result._saving).toBe(false)
  })

  it('sets _comments to empty array', () => {
    const result = initializeNoteState(baseNote)
    expect(result._comments).toEqual([])
  })

  it('sets _editedTitle to note title', () => {
    const result = initializeNoteState(baseNote)
    expect(result._editedTitle).toBe('Test Note')
  })

  it('sets _editedContent to note content', () => {
    const result = initializeNoteState(baseNote)
    expect(result._editedContent).toBe('Test content')
  })

  it('sets _newComment to empty string', () => {
    const result = initializeNoteState(baseNote)
    expect(result._newComment).toBe('')
  })

  it('preserves all original note fields', () => {
    const result = initializeNoteState(baseNote)
    expect(result.id).toBe(1)
    expect(result.title).toBe('Test Note')
    expect(result.user_id).toBe(1)
  })
})
