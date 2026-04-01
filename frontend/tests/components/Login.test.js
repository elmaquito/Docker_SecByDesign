import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import Login from '../../src/components/Login.vue'

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Login.vue', () => {
  beforeEach(() => { mockFetch.mockReset() })
  afterEach(() => { vi.clearAllMocks() })

  it('renders the login form by default', () => {
    const wrapper = mount(Login)
    expect(wrapper.find('h2').text()).toBe('Login')
    expect(wrapper.find('input[type="text"]').exists()).toBe(true)
    expect(wrapper.find('input[type="password"]').exists()).toBe(true)
    expect(wrapper.find('button[type="submit"]').text()).toBe('Login')
  })

  it('shows the forgot password link', () => {
    const wrapper = mount(Login)
    expect(wrapper.text()).toContain('Mot de passe oublié ?')
  })

  it('toggles to setup mode when clicking setup link', async () => {
    const wrapper = mount(Login)
    await wrapper.find('.toggle-mode a').trigger('click')
    expect(wrapper.find('h2').text()).toBe('Setup Admin')
    expect(wrapper.find('button[type="submit"]').text()).toBe('Create Admin')
  })

  it('toggles back to login mode from setup', async () => {
    const wrapper = mount(Login)
    const link = wrapper.find('.toggle-mode a')
    await link.trigger('click')
    await link.trigger('click')
    expect(wrapper.find('h2').text()).toBe('Login')
  })

  it('shows confirm password field in setup mode', async () => {
    const wrapper = mount(Login)
    await wrapper.find('.toggle-mode a').trigger('click')
    expect(wrapper.findAll('input[type="password"]').length).toBeGreaterThanOrEqual(2)
  })

  it('shows password mismatch error in setup mode', async () => {
    const wrapper = mount(Login)
    await wrapper.find('.toggle-mode a').trigger('click')
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('admin_user')
    await inputs[1].setValue('password_secure_123')
    await inputs[2].setValue('different_password_456')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.text()).toContain('Passwords do not match')
  })

  it('emits forgot-password event when forgot password link is clicked', async () => {
    const wrapper = mount(Login)
    await wrapper.find('.forgot-password a').trigger('click')
    expect(wrapper.emitted('forgot-password')).toBeTruthy()
  })

  it('disables the submit button while submitting', async () => {
    mockFetch.mockReturnValue(new Promise(resolve => setTimeout(() => resolve({
      ok: true,
      json: async () => ({ user: { id: 1, username: 'testuser' } })
    }), 500)))
    const wrapper = mount(Login)
    await wrapper.findAll('input')[0].setValue('testuser')
    await wrapper.findAll('input')[1].setValue('testpassword123')
    wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })

  it('emits login-success event on successful login', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Logged in', user: { id: 1, username: 'testuser', role: 'admin' } })
    })
    const wrapper = mount(Login)
    await wrapper.findAll('input')[0].setValue('testuser')
    await wrapper.findAll('input')[1].setValue('password_secure_123')
    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(wrapper.emitted('login-success')).toBeTruthy()
    expect(wrapper.emitted('login-success')[0][0]).toEqual({ id: 1, username: 'testuser', role: 'admin' })
  })

  it('shows error message on failed login', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'Invalid credentials' }) })
    const wrapper = mount(Login)
    await wrapper.findAll('input')[0].setValue('wronguser')
    await wrapper.findAll('input')[1].setValue('wrongpassword123')
    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(wrapper.text()).toContain('Invalid credentials')
  })

  it('shows error message on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))
    const wrapper = mount(Login)
    await wrapper.findAll('input')[0].setValue('testuser')
    await wrapper.findAll('input')[1].setValue('password_secure_123')
    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(wrapper.text()).toContain('Network error')
  })
})
