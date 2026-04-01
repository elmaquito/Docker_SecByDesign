import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import CategoryManager from '../../src/components/CategoryManager.vue'
import { useTagStore } from '../../src/stores/tag'

vi.mock('../../src/config/api', () => ({ API_V1_BASE_URL: '/api/v1' }))

const mockFetch = vi.fn()
global.fetch = mockFetch

const sampleTags = [
  { id: 1, name: 'Bac+1', type: 'categorie', is_default_for_student_view: false, meta: { color: '#10b981', description: 'Première année BTS' } },
  { id: 2, name: 'Bac+2', type: 'categorie', is_default_for_student_view: true, meta: { color: '#3b82f6' } },
  { id: 3, name: 'Cyber1', type: 'classe', is_default_for_student_view: false },
]

describe('CategoryManager.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFetch.mockReset()
    mockFetch.mockResolvedValue({ ok: true, json: async () => sampleTags })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ── Rendering ──────────────────────────────────────────────────────
  it('renders the main heading', () => {
    const wrapper = mount(CategoryManager, { props: { userRole: 'admin' } })
    expect(wrapper.text()).toContain('Gestion des Catégories')
  })

  it('shows create button for admin', () => {
    const wrapper = mount(CategoryManager, { props: { userRole: 'admin' } })
    expect(wrapper.find('.btn-primary').exists()).toBe(true)
  })

  it('shows create button for teacher', () => {
    const wrapper = mount(CategoryManager, { props: { userRole: 'teacher' } })
    expect(wrapper.find('.btn-primary').exists()).toBe(true)
  })

  it('hides create button for student', () => {
    const wrapper = mount(CategoryManager, { props: { userRole: 'student' } })
    expect(wrapper.find('.btn-primary').exists()).toBe(false)
  })

  it('renders only categorie tags (not classe)', async () => {
    const store = useTagStore()
    store.tags = sampleTags as any
    const wrapper = mount(CategoryManager, { props: { userRole: 'admin' } })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Bac+1')
    expect(wrapper.text()).toContain('Bac+2')
    expect(wrapper.text()).not.toContain('Cyber1')
  })

  it('shows empty state when no categorie tags exist', async () => {
    const store = useTagStore()
    store.tags = sampleTags.filter(t => t.type !== 'categorie') as any
    const wrapper = mount(CategoryManager, { props: { userRole: 'admin' } })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.empty-state').exists()).toBe(true)
  })

  // ── Search ─────────────────────────────────────────────────────────
  it('filters categories by search query', async () => {
    const store = useTagStore()
    store.tags = sampleTags as any
    const wrapper = mount(CategoryManager, { props: { userRole: 'admin' } })
    await wrapper.vm.$nextTick()

    await wrapper.find('.search-input').setValue('Bac+1')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Bac+1')
    expect(wrapper.text()).not.toContain('Bac+2')
  })

  it('shows empty state when search has no match', async () => {
    const store = useTagStore()
    store.tags = sampleTags as any
    const wrapper = mount(CategoryManager, { props: { userRole: 'admin' } })
    await wrapper.vm.$nextTick()

    await wrapper.find('.search-input').setValue('NOMATCHEZ')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.empty-state').exists()).toBe(true)
  })

  it('filters by description text too', async () => {
    const store = useTagStore()
    store.tags = sampleTags as any
    const wrapper = mount(CategoryManager, { props: { userRole: 'admin' } })
    await wrapper.vm.$nextTick()

    await wrapper.find('.search-input').setValue('Première année')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Bac+1')
    expect(wrapper.text()).not.toContain('Bac+2')
  })

  const mountOpts = (userRole = 'admin') => ({
    props: { userRole },
    global: { stubs: { Teleport: { template: '<span><slot /></span>' } } },
    attachTo: document.body,
  })

  // ── Create Modal ────────────────────────────────────────────────────
  it('opens create modal when + button clicked', async () => {
    const store = useTagStore()
    store.tags = sampleTags as any
    const wrapper = mount(CategoryManager, mountOpts())
    await wrapper.vm.$nextTick()

    await wrapper.find('.btn-primary').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.modal-overlay').exists()).toBe(true)
    expect(wrapper.find('#modal-title-category').text()).toContain('Créer une catégorie')
    wrapper.unmount()
  })

  it('closes modal on Annuler click', async () => {
    const store = useTagStore()
    store.tags = sampleTags as any
    const wrapper = mount(CategoryManager, mountOpts())
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

  it('closes modal on ✕ button click', async () => {
    const store = useTagStore()
    store.tags = sampleTags as any
    const wrapper = mount(CategoryManager, mountOpts())
    await wrapper.vm.$nextTick()

    await wrapper.find('.btn-primary').trigger('click')
    await wrapper.vm.$nextTick()

    await wrapper.find('.btn-close').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.modal-overlay').exists()).toBe(false)
    wrapper.unmount()
  })

  it('shows validation error if name is empty', async () => {
    const store = useTagStore()
    store.tags = sampleTags as any
    const wrapper = mount(CategoryManager, mountOpts())
    await wrapper.vm.$nextTick()

    await wrapper.find('.btn-primary').trigger('click')
    await wrapper.vm.$nextTick()

    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.error-msg').text()).toContain('obligatoire')
    wrapper.unmount()
  })

  it('calls tagStore.createTag with type=categorie on valid submit', async () => {
    const store = useTagStore()
    store.tags = sampleTags as any
    const createSpy = vi.spyOn(store, 'createTag').mockResolvedValue({ id: 10, name: 'Bac+3', type: 'categorie', is_default_for_student_view: false } as any)

    const wrapper = mount(CategoryManager, mountOpts())
    await wrapper.vm.$nextTick()

    await wrapper.find('.btn-primary').trigger('click')
    await wrapper.vm.$nextTick()

    await wrapper.find('#cat-name').setValue('Bac+3')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'categorie',
      name: 'Bac+3',
    }))
    wrapper.unmount()
  })

  // ── Edit ────────────────────────────────────────────────────────────
  it('opens edit modal with pre-filled name', async () => {
    const store = useTagStore()
    store.tags = sampleTags as any
    const wrapper = mount(CategoryManager, mountOpts())
    await wrapper.vm.$nextTick()

    const editBtn = wrapper.find('.btn-icon[aria-label*="Modifier"]')
    await editBtn.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('#modal-title-category').text()).toContain('Modifier')
    expect((wrapper.find('#cat-name').element as HTMLInputElement).value).toBe('Bac+1')
    wrapper.unmount()
  })

  it('calls tagStore.updateTag on edit submit', async () => {
    const store = useTagStore()
    store.tags = sampleTags as any
    const updateSpy = vi.spyOn(store, 'updateTag').mockResolvedValue(undefined)

    const wrapper = mount(CategoryManager, mountOpts())
    await wrapper.vm.$nextTick()

    await wrapper.find('.btn-icon[aria-label*="Modifier"]').trigger('click')
    await wrapper.vm.$nextTick()

    await wrapper.find('#cat-name').setValue('Bac+1 modifié')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(updateSpy).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Bac+1 modifié' }))
    wrapper.unmount()
  })

  // ── Delete ──────────────────────────────────────────────────────────
  it('shows delete confirm dialog on delete click', async () => {
    const store = useTagStore()
    store.tags = sampleTags as any
    const wrapper = mount(CategoryManager, mountOpts())
    await wrapper.vm.$nextTick()

    await wrapper.find('.btn-icon[aria-label*="Supprimer"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(true)
    expect(wrapper.find('#delete-title-category').text()).toContain('Confirmer la suppression')
    wrapper.unmount()
  })

  it('calls tagStore.deleteTag when deletion is confirmed', async () => {
    const store = useTagStore()
    store.tags = sampleTags as any
    const deleteSpy = vi.spyOn(store, 'deleteTag').mockResolvedValue(undefined)

    const wrapper = mount(CategoryManager, mountOpts())
    await wrapper.vm.$nextTick()

    await wrapper.find('.btn-icon[aria-label*="Supprimer"]').trigger('click')
    await wrapper.vm.$nextTick()

    await wrapper.find('.btn-danger').trigger('click')
    await flushPromises()

    expect(deleteSpy).toHaveBeenCalledWith(1)
    wrapper.unmount()
  })

  it('does NOT call deleteTag when cancellation is chosen', async () => {
    const store = useTagStore()
    store.tags = sampleTags as any
    const deleteSpy = vi.spyOn(store, 'deleteTag')

    const wrapper = mount(CategoryManager, mountOpts())
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
  it('shows "Par défaut" badge for default student view categories', async () => {
    const store = useTagStore()
    store.tags = sampleTags as any
    const wrapper = mount(CategoryManager, { props: { userRole: 'admin' } })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.badge-default').exists()).toBe(true)
    expect(wrapper.find('.badge-default').text()).toContain('Par défaut')
  })

  // ── Error state ─────────────────────────────────────────────────────
  it('displays error message when store has an error', async () => {
    const store = useTagStore()
    store.tags = sampleTags as any
    store.error = 'Erreur de chargement'
    const wrapper = mount(CategoryManager, { props: { userRole: 'admin' } })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.alert-error').exists()).toBe(true)
    expect(wrapper.find('.alert-error').text()).toContain('Erreur de chargement')
  })
})
