// Shared theme color utilities
import type { Note } from '../types/models'

export const getThemeColor = (color: string): string => {
  const colors: Record<string, string> = {
    red: '#e74c3c',
    blue: '#3498db',
    purple: '#9b59b6',
    green: '#2ecc71',
    orange: '#e67e22',
    cyan: '#1abc9c',
    yellow: '#f39c12',
    pink: '#e91e63'
  }
  return colors[color] || '#3498db'
}

export const initializeNoteState = (note: Note) => {
  return {
    ...note,
    _editing: false,
    _saving: false,
    _comments: [],
    _editedTitle: note.title,
    _editedContent: note.content,
    _newComment: ''
  }
}
