import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AccountSettings from '../../components/AccountSettings.vue'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('AccountSettings.vue', () => {
  const adminUser = { id: 1, username: 'admin_test', role: 'admin' }
  const teacherUser = { id: 2, username: 'teacher_test', role: 'teacher' }
  const studentUser = { id: 3, username: 'student_test', role: 'student' }

  beforeEach(() => {
    mockFetch.mockReset()
    // Default mock for fetchAccountInfo
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

  // -------------------------
  // Access control tests
  // -------------------------
  it('shows access denied message for student users', () => {
    const wrapper = mount(AccountSettings, {
      props: { user: studentUser }
    })
    expect(wrapper.text()).toContain('Les étudiants ne peuvent pas modifier leurs informations de compte.')
  })

  it('does NOT show the settings form for student users', () => {
    const wrapper = mount(AccountSettings, {
      props: { user: studentUser }
    })
    expect(wrapper.find('form').exists()).toBe(false)
  })

  it('shows the settings form for admin users', async () => {
    const wrapper = mount(AccountSettings, {
      props: { user: adminUser }
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('shows the settings form for teacher users', async () => {
    const wrapper = mount(AccountSettings, {
      props: { user: teacherUser }
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('form').exists()).toBe(true)
  })

  // -------------------------
  // Header and structure tests
  // -------------------------
  it('renders the settings header', () => {
    const wrapper = mount(AccountSettings, {
      props: { user: adminUser }
    })
    expect(wrapper.text()).toContain('Paramètres du compte')
  })

  it('emits close event when close button is clicked', async () => {
    const wrapper = mount(AccountSettings, {
      props: { user: adminUser }
    })
    await wrapper.find('.close-btn').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('emits close event from access-denied close button (student)', async () => {
    const wrapper = mount(AccountSettings, {
      props: { user: studentUser }
    })
    await wrapper.find('.btn-primary').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  // -------------------------
  // Form validation tests
  // -------------------------
  it('shows error when password is too short (less than 12 chars)', async () => {
    const wrapper = mount(AccountSettings, {
      props: { user: adminUser }
    })
    await wrapper.vm.$nextTick()

    // Find password input and set a short password
    const passwordInput = wrapper.find('#password')
    await passwordInput.setValue('short')

    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Le mot de passe doit contenir au moins 12 caractères')
  })

  it('shows error when passwords do not match', async () => {
    const wrapper = mount(AccountSettings, {
      props: { user: adminUser }
    })
    await wrapper.vm.$nextTick()

    const passwordInput = wrapper.find('#password')
    await passwordInput.setValue('password_one_123')
    await wrapper.vm.$nextTick()

    const confirmInput = wrapper.find('#confirmPassword')
    await confirmInput.setValue('password_two_456')

    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Les mots de passe ne correspondent pas')
  })

  it('shows error when no modifications detected', async () => {
    // Return account info matching current form state
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 1, username: 'admin_test', email: 'admin@example.com', phone: '+33600000000', role: 'admin'
      })
    })

    const wrapper = mount(AccountSettings, {
      props: { user: adminUser }
    })

    // Wait for fetchAccountInfo to complete
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))

    // Submit without changes
    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Aucune modification à enregistrer')
  })

  // -------------------------
  // Successful update test
  // -------------------------
  it('shows success message after successful update', async () => {
    // First fetch for account info
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, username: 'admin_test', email: 'old@example.com', phone: null, role: 'admin' })
      })
      // Second fetch for the PATCH update
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, username: 'admin_test', email: 'new@example.com', phone: null, role: 'admin' })
      })

    const wrapper = mount(AccountSettings, {
      props: { user: adminUser }
    })

    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))

    // Change email
    const emailInput = wrapper.find('#email')
    await emailInput.setValue('new@example.com')

    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(wrapper.text()).toContain('Modifications enregistrées avec succès !')
  })

  it('shows error message on update failure', async () => {
    // First fetch for account info
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, username: 'admin_test', email: 'old@example.com', phone: null, role: 'admin' })
      })
      // Second fetch for PATCH - fails
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Validation failed' })
      })

    const wrapper = mount(AccountSettings, {
      props: { user: adminUser }
    })

    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))

    const emailInput = wrapper.find('#email')
    await emailInput.setValue('invalid_email_change@example.com')

    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(wrapper.text()).toContain('Validation failed')
  })
})
