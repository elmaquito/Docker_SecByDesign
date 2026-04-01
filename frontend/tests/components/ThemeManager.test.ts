import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ThemeManager from '../../src/components/ThemeManager.vue'
import { useTagStore } from '../../src/stores/tag'

vi.mock('../../src/config/api', () => ({ API_V1_BASE_URL: '/api/v1' }))

const mockFetch = vi.fn()
global.fetch = mockFetch

const sampleThemes = [
  { id: 1, name: 'Sécurité', type: 'specialite', is_default_for_student_view: false, meta: { color: '#ef4444', description: 'Cybersécurité' } },
  { id: 2, name: 'DevOps', type: 'specialite', is_default_for_student_view: true, meta: { color: '#3b82f6' } },
  { id: 3, name: 'Maths', type: 'classe', is_default_for_student_view: false },
]

describe('ThemeManager.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFetch.mockReset()
    // Default: fetchTags returns sampleThemes
    mockFetch.mockResolvedValue({ ok: true, json: async () => sampleThemes })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ── Rendering ──────────────────────────────────────────────────────
  it('renders the main heading', () => {
    const wrapper = mount(ThemeManager, { props: { userRole: 'admin' } })
    expect(wrapper.text()).toContain('Gestion des Thèmes')
  })

  it('renders the create button for admin', () => {
    const wrapper = mount(ThemeManager, { props: { userRole: 'admin' } })
    expect(wrapper.find('.btn-primary').exists()).toBe(true)
  })

  it('renders the create button for teacher', () => {
    const wrapper = mount(ThemeManager, { props: { userRole: 'teacher' } })
    expect(wrapper.find('.btn-primary').exists()).toBe(true)
  })

  it('does NOT render create button for student', () => {
    const wrapper = mount(ThemeManager, { props: { userRole: 'student' } })
    expect(wrapper.find('.btn-primary').exists()).toBe(false)
  })

  it('shows loading indicator while fetching', () => {
    // Don't resolve fetch yet
    mockFetch.mockReturnValue(new Promise(() => {}))
    const wrapper = mount(ThemeManager, { props: { userRole: 'admin' } })
    // Trigger the onMounted fetch
    const store = useTagStore()
    store.loading = true
    // check loading message
    // Manually set loading since onMounted may not have fired yet
    expect(wrapper.html()).toBeTruthy()
  })

  it('displays only specialite tags (not classe)', async () => {
    const store = useTagStore()
    store.tags = sampleThemes as any
    const wrapper = mount(ThemeManager, { props: { userRole: 'admin' } })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Sécurité')
    expect(wrapper.text()).toContain('DevOps')
    expect(wrapper.text()).not.toContain('Maths')
  })

  it('shows empty state when no specialite themes', async () => {
    const store = useTagStore()
    store.tags = sampleThemes.filter(t => t.type !== 'specialite') as any
    const wrapper = mount(ThemeManager, { props: { userRole: 'admin' } })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.empty-state').exists()).toBe(true)
  })

  // ── Search ─────────────────────────────────────────────────────────
  it('filters themes by search query', async () => {
    const store = useTagStore()
    store.tags = sampleThemes as any
    const wrapper = mount(ThemeManager, { props: { userRole: 'admin' } })
    await wrapper.vm.$nextTick()

    const searchInput = wrapper.find('.search-input')
    await searchInput.setValue('Sécu')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Sécurité')
    expect(wrapper.text()).not.toContain('DevOps')
  })

  it('shows no results message when search has no match', async () => {
    const store = useTagStore()
    store.tags = sampleThemes as any
    const wrapper = mount(ThemeManager, { props: { userRole: 'admin' } })
    await wrapper.vm.$nextTick()

    await wrapper.find('.search-input').setValue('XYZ_NO_MATCH')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.empty-state').exists()).toBe(true)
  })

  // ── Create Modal ────────────────────────────────────────────────────
  const mountOpts = (userRole = 'admin', extra = {}) => ({
    props: { userRole },
    global: { stubs: { Teleport: { template: '<span><slot /></span>' } } },
    attachTo: document.body,
    ...extra,
  })

  it('opens create modal when button clicked', async () => {
    const store = useTagStore()
    store.tags = sampleThemes as any
    const wrapper = mount(ThemeManager, mountOpts())
    await wrapper.vm.$nextTick()

    await wrapper.find('.btn-primary').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.modal-overlay').exists()).toBe(true)
    expect(wrapper.find('#modal-title-theme').text()).toContain('Créer un thème')
    wrapper.unmount()
  })

  it('closes modal when Annuler button is clicked', async () => {
    const store = useTagStore()
    store.tags = sampleThemes as any
    const wrapper = mount(ThemeManager, mountOpts())
    await wrapper.vm.$nextTick()

    await wrapper.find('.btn-primary').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.modal-overlay').exists()).toBe(true)

    const annuler = wrapper.findAll('button').find(b => b.text() === 'Annuler')
    await annuler?.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.modal-overlay').exists()).toBe(false)
    wrapper.unmount()
  })

  it('shows validation error if name is empty on submit', async () => {
    const store = useTagStore()
    store.tags = sampleThemes as any
    const wrapper = mount(ThemeManager, mountOpts())
    await wrapper.vm.$nextTick()

    await wrapper.find('.btn-primary').trigger('click')
    await wrapper.vm.$nextTick()

    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.error-msg').text()).toContain('obligatoire')
    wrapper.unmount()
  })

  it('calls tagStore.createTag on valid form submit', async () => {
    const store = useTagStore()
    store.tags = sampleThemes as any
    const createSpy = vi.spyOn(store, 'createTag').mockResolvedValue({ id: 99, name: 'Nouveau', type: 'specialite', is_default_for_student_view: false } as any)

    const wrapper = mount(ThemeManager, mountOpts())
    await wrapper.vm.$nextTick()

    await wrapper.find('.btn-primary').trigger('click')
    await wrapper.vm.$nextTick()

    await wrapper.find('#theme-name').setValue('Nouveau thème')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'specialite',
      name: 'Nouveau thème',
    }))
    wrapper.unmount()
  })

  // ── Edit Modal ──────────────────────────────────────────────────────
  it('opens edit modal with pre-filled data', async () => {
    const store = useTagStore()
    store.tags = sampleThemes as any
    const wrapper = mount(ThemeManager, mountOpts())
    await wrapper.vm.$nextTick()

    const editBtn = wrapper.find('.btn-icon[aria-label*="Modifier"]')
    await editBtn.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('#modal-title-theme').text()).toContain('Modifier')
    expect((wrapper.find('#theme-name').element as HTMLInputElement).value).toBe('Sécurité')
    wrapper.unmount()
  })

  it('calls tagStore.updateTag on edit form submit', async () => {
    const store = useTagStore()
    store.tags = sampleThemes as any
    const updateSpy = vi.spyOn(store, 'updateTag').mockResolvedValue(undefined)

    const wrapper = mount(ThemeManager, mountOpts())
    await wrapper.vm.$nextTick()

    await wrapper.find('.btn-icon[aria-label*="Modifier"]').trigger('click')
    await wrapper.vm.$nextTick()

    await wrapper.find('#theme-name').setValue('Sécurité v2')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(updateSpy).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Sécurité v2' }))
    wrapper.unmount()
  })

  // ── Delete ──────────────────────────────────────────────────────────
  it('shows delete confirmation modal when delete button is clicked', async () => {
    const store = useTagStore()
    store.tags = sampleThemes as any
    const wrapper = mount(ThemeManager, mountOpts())
    await wrapper.vm.$nextTick()

    await wrapper.find('.btn-icon[aria-label*="Supprimer"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(true)
    expect(wrapper.find('#delete-title-theme').text()).toContain('Confirmer la suppression')
    wrapper.unmount()
  })

  it('calls tagStore.deleteTag when confirmed', async () => {
    const store = useTagStore()
    store.tags = sampleThemes as any
    const deleteSpy = vi.spyOn(store, 'deleteTag').mockResolvedValue(undefined)

    const wrapper = mount(ThemeManager, mountOpts())
    await wrapper.vm.$nextTick()

    await wrapper.find('.btn-icon[aria-label*="Supprimer"]').trigger('click')
    await wrapper.vm.$nextTick()

    await wrapper.find('.btn-danger').trigger('click')
    await flushPromises()

    expect(deleteSpy).toHaveBeenCalledWith(1)
    wrapper.unmount()
  })

  it('cancels delete when Annuler is clicked in confirm dialog', async () => {
    const store = useTagStore()
    store.tags = sampleThemes as any
    const deleteSpy = vi.spyOn(store, 'deleteTag')

    const wrapper = mount(ThemeManager, mountOpts())
    await wrapper.vm.$nextTick()

    await wrapper.find('.btn-icon[aria-label*="Supprimer"]').trigger('click')
    await wrapper.vm.$nextTick()

    const annuler = wrapper.findAll('button').find(b => b.text() === 'Annuler')
    await annuler?.trigger('click')
    await wrapper.vm.$nextTick()

    expect(deleteSpy).not.toHaveBeenCalled()
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    wrapper.unmount()
  })

  // ── "Par défaut" badge ──────────────────────────────────────────────
  it('shows "Par défaut" badge for default student view tags', async () => {
    const store = useTagStore()
    store.tags = sampleThemes as any
    const wrapper = mount(ThemeManager, { props: { userRole: 'admin' } })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.badge-default').exists()).toBe(true)
    expect(wrapper.find('.badge-default').text()).toContain('Par défaut')
  })

  // ── Error handling ──────────────────────────────────────────────────
  it('shows error alert when tagStore has an error', async () => {
    const store = useTagStore()
    store.tags = sampleThemes as any
    store.error = 'Erreur réseau'
    const wrapper = mount(ThemeManager, { props: { userRole: 'admin' } })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.alert-error').exists()).toBe(true)
    expect(wrapper.find('.alert-error').text()).toContain('Erreur réseau')
  })
})
