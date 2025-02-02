import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import Slider from './story/_Slider.vue'
import type SliderImpl from './SliderImpl.vue'
import type { DOMWrapper, VueWrapper } from '@vue/test-utils'
import { mount } from '@vue/test-utils'
import { handleSubmit } from '@/test'

describe('given default Slider', () => {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
  window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockImplementation(id => id)
  window.HTMLElement.prototype.releasePointerCapture = vi.fn()
  window.HTMLElement.prototype.setPointerCapture = vi.fn()

  let wrapper: VueWrapper<InstanceType<typeof Slider>>

  beforeEach(() => {
    wrapper = mount(Slider, { props: { disabled: false } })
  })

  it('should pass axe accessibility tests', async () => {
    wrapper = mount(Slider)
    expect(await axe(wrapper.element)).toHaveNoViolations()
  })

  it('should have defalt value', () => {
    expect(wrapper.html()).toContain('aria-valuenow="50"')
  })

  describe('when disabled', () => {
    beforeEach(async () => {
      await wrapper.setProps({ disabled: true })
    })

    it('should disable the thumb', () => {
      const thumb = wrapper.find('[role="slider"]')
      expect(thumb.attributes('data-disabled')).toBe('true')
      expect(thumb.attributes('aria-valuemin')).toBe('0')
      expect(thumb.attributes('aria-valuemax')).toBe('100')
      expect(thumb.attributes('aria-valuenow')).toBe('50')
      expect(wrapper.html()).toContain('aria-valuenow="50"')
    })
  })

  describe('after pointerdown event on slider-impl', () => {
    let sliderImpl: VueWrapper<InstanceType<typeof SliderImpl>>
    beforeEach(async () => {
      sliderImpl = wrapper.findComponent('[data-slider-impl]') as any
      await sliderImpl.trigger('pointerdown', { clientX: 10, pointerId: 1 })
    })

    it('should emit slideStart', async () => {
      expect(sliderImpl.emitted('slideStart')?.[0]?.[0]).toBe(0)
    })

    describe('after pointermove', () => {
      beforeEach(async () => {
        await sliderImpl.trigger('pointermove', { clientX: 50, pointerId: 1 })
      })

      it('should emit slideMove', async () => {
        expect(sliderImpl.emitted('slideMove')?.[0]?.[0]).toBe(0)
      })

      describe('after pointerup', () => {
        beforeEach(async () => {
          await sliderImpl.trigger('pointerup', { pointerId: 1 })
        })

        it('should emit slideEnd', async () => {
          expect(sliderImpl.emitted('slideEnd')?.[0]).toStrictEqual([])
        })

        it('should emit valueCommit on wrapper', async () => {
          expect(wrapper.emitted('valueCommit')?.[0]?.[0]).toStrictEqual([0])
        })
      })
    })
  })

  describe('after pressing navigation key', () => {
    let slider: DOMWrapper<HTMLElement>

    beforeEach(() => {
      slider = wrapper.find('[role="slider"]')
    })

    it('ArrowRight should increase by 1', async () => {
      const currentValue = slider.attributes('aria-valuenow')
      await slider.trigger('keydown', { key: 'ArrowRight' })
      const newValue = slider.attributes('aria-valuenow')
      const diff = Number(newValue) - Number(currentValue)
      expect(slider.attributes('aria-valuenow')).toBe('51')
      expect(diff).toBe(1)
    })

    it('ArrowLeft should decrease by 1', async () => {
      const currentValue = slider.attributes('aria-valuenow')
      await slider.trigger('keydown', { key: 'ArrowLeft' })
      const newValue = slider.attributes('aria-valuenow')
      const diff = Number(newValue) - Number(currentValue)
      expect(slider.attributes('aria-valuenow')).toBe('49')
      expect(diff).toBe(-1)
    })

    it('PageUp should increase by 10', async () => {
      const currentValue = slider.attributes('aria-valuenow')
      await slider.trigger('keydown', { key: 'PageUp' })
      const newValue = slider.attributes('aria-valuenow')
      const diff = Number(newValue) - Number(currentValue)
      expect(slider.attributes('aria-valuenow')).toBe('60')
      expect(diff).toBe(10)
    })

    it('PageDown should decrease by 10', async () => {
      const currentValue = slider.attributes('aria-valuenow')
      await slider.trigger('keydown', { key: 'PageDown' })
      const newValue = slider.attributes('aria-valuenow')
      const diff = Number(newValue) - Number(currentValue)
      expect(slider.attributes('aria-valuenow')).toBe('40')
      expect(diff).toBe(-10)
    })

    it('Home should set value to 0', async () => {
      await slider.trigger('keydown', { key: 'Home' })
      expect(slider.attributes('aria-valuenow')).toBe('0')
    })

    it('End should set value to max', async () => {
      await slider.trigger('keydown', { key: 'End' })
      expect(slider.attributes('aria-valuenow')).toBe('100')
    })
  })
})

describe('given slider in a form', async () => {
  const wrapper = mount({
    props: ['handleSubmit'],
    components: { Slider },
    template: '<form @submit="handleSubmit"><Slider value="true" /></form>',
  }, {
    props: { handleSubmit },
  })

  it('should have hidden input field', async () => {
    expect(wrapper.find('[type="number"]').exists()).toBe(true)
  })

  describe('after clicking submit button', () => {
    beforeEach(async () => {
      await wrapper.find('form').trigger('submit')
    })

    it('should trigger submit once', () => {
      expect(handleSubmit).toHaveBeenCalledTimes(1)
      expect(handleSubmit.mock.results[0].value).toStrictEqual({ slider: '50' })
    })
  })

  describe('after uncheck and click submit button again', () => {
    beforeEach(async () => {
      const slider = wrapper.find('[role="slider"]')
      await slider.trigger('focus')
      await slider.trigger('keydown', { key: 'ArrowRight' })
      await wrapper.find('form').trigger('submit')
    })

    it('should trigger submit once', () => {
      expect(handleSubmit).toHaveBeenCalledTimes(2)
      expect(handleSubmit.mock.results[1].value).toStrictEqual({ slider: '51' })
    })
  })
})
