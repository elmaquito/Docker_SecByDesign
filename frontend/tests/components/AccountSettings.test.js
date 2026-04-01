import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AccountSettings from '../../src/components/AccountSettings.vue'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('AccountSettings.vue', () => {
  const adminUser = { id: 1, username: 'admin_test', role: 'admin' }
  const teacherUser = { id: 2, username: 'teacher_test', role: 'teacher' }
  const studentUser = { id: 3, username: 'student_test', role: 'student' }

  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 1, username: 'admin_test', email: 'admin@example.com', phone: '+33600000000', role: 'admin'
      })
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('shows access denied message for student users', () => {
    const wrapper = mount(AccountSettings, { props: { user: studentUser } })
    expect(wrapper.text()).toContain('Les étudiants ne peuvent pas modifier leurs informations de compte.')
  })

  it('does NOT show the settings form for student users', () => {
    const wrapper = mount(AccountSettings, { props: { user: studentUser } })
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('shows the settings form for admin users', async () => {
    const wrapper = mount(AccountSettings, { props: { user: adminUser } })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('shows the settings form for teacher users', async () => {
    const wrapper = mount(AccountSettings, { props: { user: teacherUser } })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('renders the settings header', () => {
    const wrapper = mount(AccountSettings, { props: { user: adminUser } })
    expect(wrapper.text()).toContain('Paramètres du compte')
  })

  it('emits close event when close button is clicked', async () => {
    const wrapper = mount(AccountSettings, { props: { user: adminUser } })
    await wrapper.find('.close-btn').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('emits close event from access-denied close button (student)', async () => {
    const wrapper = mount(AccountSettings, { props: { user: studentUser } })
    await wrapper.find('.btn-primary').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('shows error when password is too short (less than 12 chars)', async () => {
    const wrapper = mount(AccountSettings, { props: { user: adminUser } })
    await wrapper.vm.$nextTick()
    await wrapper.find('#password').setValue('short')
    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Le mot de passe doit contenir au moins 12 caractères')
  })

  it('shows error when passwords do not match', async () => {
    const wrapper = mount(AccountSettings, { props: { user: adminUser } })
    await wrapper.vm.$nextTick()
    await wrapper.find('#password').setValue('password_one_123')
    await wrapper.vm.$nextTick()
    await wrapper.find('#confirmPassword').setValue('password_two_456')
    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Les mots de passe ne correspondent pas')
  })

  it('shows error when no modifications detected', async () => {
    const wrapper = mount(AccountSettings, { props: { user: adminUser } })
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Aucune modification à enregistrer')
  })

  it('shows success message after successful update', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 1, username: 'admin_test', email: 'old@example.com', phone: null, role: 'admin' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 1, username: 'admin_test', email: 'new@example.com', phone: null, role: 'admin' }) })

    const wrapper = mount(AccountSettings, { props: { user: adminUser } })
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    await wrapper.find('#email').setValue('new@example.com')
    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(wrapper.text()).toContain('Modifications enregistrées avec succès !')
  })

  it('shows error message on update failure', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 1, username: 'admin_test', email: 'old@example.com', phone: null, role: 'admin' }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Validation failed' }) })

    const wrapper = mount(AccountSettings, { props: { user: adminUser } })
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    await wrapper.find('#email').setValue('bad-value')
    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(wrapper.text()).toContain('Validation failed')
  })
})
