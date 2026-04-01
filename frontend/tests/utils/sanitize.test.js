import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((input) => `sanitized:${input}`)
  }
}))

import { sanitize, sanitizeAndRender } from '../../src/utils/sanitize'
import DOMPurify from 'dompurify'

describe('sanitize', () => {
  beforeEach(() => {
    vi.mocked(DOMPurify.sanitize).mockImplementation((input) => `sanitized:${input}`)
  })

  it('calls DOMPurify.sanitize with the input', () => {
    sanitize('<p>Hello</p>')
    expect(DOMPurify.sanitize).toHaveBeenCalledWith('<p>Hello</p>')
  })

  it('returns the sanitized result', () => {
    const result = sanitize('<p>Hello</p>')
    expect(result).toBe('sanitized:<p>Hello</p>')
  })

  it('handles script tag input', () => {
    vi.mocked(DOMPurify.sanitize).mockReturnValueOnce('')
    const result = sanitize('<script>alert("xss")</script>')
    expect(result).toBe('')
  })
})

describe('sanitizeAndRender', () => {
  beforeEach(() => {
    vi.mocked(DOMPurify.sanitize).mockImplementation((input) => `sanitized:${input}`)
  })

  it('calls DOMPurify.sanitize with the input', () => {
    sanitizeAndRender('<h1>Title</h1>')
    expect(DOMPurify.sanitize).toHaveBeenCalledWith('<h1>Title</h1>')
  })

  it('returns the sanitized result', () => {
    const result = sanitizeAndRender('<h1>Title</h1>')
    expect(result).toBe('sanitized:<h1>Title</h1>')
  })

  it('handles empty string input', () => {
    vi.mocked(DOMPurify.sanitize).mockReturnValueOnce('')
    const result = sanitizeAndRender('')
    expect(result).toBe('')
  })

  it('handles plain text input', () => {
    const result = sanitizeAndRender('plain text')
    expect(result).toBe('sanitized:plain text')
  })
})
