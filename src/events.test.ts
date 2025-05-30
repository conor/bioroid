import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  DefaultEventDispatcher, 
  setEventDispatcher, 
  getEventDispatcher,
  attachEventAction,
  removeEventAction,
  resetEventSystem
} from './events'
import { render } from './singultus'

describe('Event System', () => {
  let dispatcher: DefaultEventDispatcher
  let mockHandler: ReturnType<typeof vi.fn>
  let container: HTMLElement

  beforeEach(() => {
    document.body.innerHTML = ''
    container = document.createElement('div')
    document.body.appendChild(container)

    // Reset event system for clean state
    resetEventSystem()
    dispatcher = new DefaultEventDispatcher()
    setEventDispatcher(dispatcher)
    mockHandler = vi.fn()
    dispatcher.subscribe(mockHandler)
  })

  describe('DefaultEventDispatcher', () => {
    it('should dispatch actions to subscribed handlers', () => {
      const action = { type: 'TEST_ACTION', data: { value: 'test' } }
      dispatcher.dispatch(action)
      
      expect(mockHandler).toHaveBeenCalledWith(action)
    })

    it('should support multiple handlers', () => {
      const handler2 = vi.fn()
      dispatcher.subscribe(handler2)
      
      const action = { type: 'TEST_ACTION' }
      dispatcher.dispatch(action)
      
      expect(mockHandler).toHaveBeenCalledWith(action)
      expect(handler2).toHaveBeenCalledWith(action)
    })

    it('should unsubscribe handlers', () => {
      const unsubscribe = dispatcher.subscribe(mockHandler)
      unsubscribe()
      
      dispatcher.dispatch({ type: 'TEST_ACTION' })
      expect(mockHandler).not.toHaveBeenCalled()
    })
  })

  describe('Event Delegation', () => {
    it('should handle click events with data actions', () => {
      const clickAction = { 
        type: 'BUTTON_CLICKED', 
        data: { buttonId: 'test-btn' } 
      }

      render(container, ['button', { 
        on: { click: clickAction }
      }, 'Click me'])

      const button = container.querySelector('button')!
      
      // Debug: Check if event action was attached
      const eventActions = (button as any).__bioroid_events__
      expect(eventActions).toBeDefined()
      expect(eventActions.click).toEqual(clickAction)
      
      button.click()

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'BUTTON_CLICKED',
          data: expect.objectContaining({
            buttonId: 'test-btn'
          })
        })
      )
    })

    it('should handle input events with form data', () => {
      const inputAction = { 
        type: 'INPUT_CHANGED', 
        data: { field: 'username' } 
      }

      render(container, ['input', { 
        type: 'text',
        value: 'test-value',
        on: { input: inputAction }
      }])

      const input = container.querySelector('input')! as HTMLInputElement
      input.value = 'new-value'
      input.dispatchEvent(new Event('input', { bubbles: true }))

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'INPUT_CHANGED',
          data: expect.objectContaining({
            field: 'username'
          })
        })
      )
    })

    it('should handle checkbox events with checked state', () => {
      const changeAction = { 
        type: 'CHECKBOX_TOGGLED', 
        data: { setting: 'notifications' } 
      }

      render(container, ['input', { 
        type: 'checkbox',
        checked: true,
        on: { change: changeAction }
      }])

      const checkbox = container.querySelector('input')! as HTMLInputElement
      checkbox.checked = false
      checkbox.dispatchEvent(new Event('change', { bubbles: true }))

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CHECKBOX_TOGGLED',
          data: expect.objectContaining({
            setting: 'notifications'
          })
        })
      )
    })

    it('should bubble up to find event actions', () => {
      const clickAction = { type: 'PARENT_CLICKED' }

      render(container, ['div', { 
        on: { click: clickAction }
      }, ['span', 'Click this span']])

      const span = container.querySelector('span')!
      span.click()

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'PARENT_CLICKED'
        })
      )
    })

  })

  describe('attachEventAction and removeEventAction', () => {
    it('should attach and remove event actions directly', () => {
      const element = document.createElement('button')
      const action = { type: 'DIRECT_ACTION' }

      attachEventAction(element, 'click', action)
      container.appendChild(element)
      
      element.click()
      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'DIRECT_ACTION' })
      )

      mockHandler.mockClear()
      removeEventAction(element, 'click')
      
      element.click()
      expect(mockHandler).not.toHaveBeenCalled()
    })
  })

  describe('Event Enrichment (Opt-in)', () => {
    it('should not enrich events by default', () => {
      const inputAction = { 
        type: 'INPUT_CHANGED', 
        data: { field: 'username' } 
      }

      render(container, ['input', { 
        type: 'text',
        value: 'test-value',
        on: { input: inputAction }
      }])

      const input = container.querySelector('input')! as HTMLInputElement
      input.value = 'new-value'
      input.dispatchEvent(new Event('input', { bubbles: true }))

      expect(mockHandler).toHaveBeenCalledWith({
        type: 'INPUT_CHANGED',
        data: { field: 'username' }
      })
    })

    it('should enrich with value when opt-in enabled', () => {
      const inputAction = { 
        type: 'INPUT_CHANGED', 
        data: { field: 'username' },
        enrichment: { includeValue: true }
      }

      render(container, ['input', { 
        type: 'text',
        value: 'test-value',
        on: { input: inputAction }
      }])

      const input = container.querySelector('input')! as HTMLInputElement
      input.value = 'new-value'
      input.dispatchEvent(new Event('input', { bubbles: true }))

      expect(mockHandler).toHaveBeenCalledWith({
        type: 'INPUT_CHANGED',
        data: { 
          field: 'username',
          bioroid: { value: 'new-value' }
        },
        enrichment: { includeValue: true }
      })
    })

    it('should enrich with checked state when opt-in enabled', () => {
      const changeAction = { 
        type: 'CHECKBOX_TOGGLED', 
        data: { setting: 'notifications' },
        enrichment: { includeChecked: true }
      }

      render(container, ['input', { 
        type: 'checkbox',
        checked: true,
        on: { change: changeAction }
      }])

      const checkbox = container.querySelector('input')! as HTMLInputElement
      checkbox.checked = false
      checkbox.dispatchEvent(new Event('change', { bubbles: true }))

      expect(mockHandler).toHaveBeenCalledWith({
        type: 'CHECKBOX_TOGGLED',
        data: { 
          setting: 'notifications',
          bioroid: { checked: false }
        },
        enrichment: { includeChecked: true }
      })
    })

    it('should enrich with timestamp when opt-in enabled', () => {
      const clickAction = { 
        type: 'BUTTON_CLICKED', 
        data: { buttonId: 'test' },
        enrichment: { includeTimestamp: true }
      }

      render(container, ['button', { 
        on: { click: clickAction }
      }, 'Click me'])

      const button = container.querySelector('button')!
      button.click()

      expect(mockHandler).toHaveBeenCalledWith({
        type: 'BUTTON_CLICKED',
        data: { 
          buttonId: 'test',
          bioroid: { timestamp: expect.any(Number) }
        },
        enrichment: { includeTimestamp: true }
      })
    })

    it('should use custom namespace for enrichment', () => {
      const inputAction = { 
        type: 'INPUT_CHANGED', 
        data: { field: 'username' },
        enrichment: { 
          includeValue: true, 
          includeTimestamp: true,
          namespace: 'custom'
        }
      }

      render(container, ['input', { 
        type: 'text',
        on: { input: inputAction }
      }])

      const input = container.querySelector('input')! as HTMLInputElement
      input.value = 'test-value'
      input.dispatchEvent(new Event('input', { bubbles: true }))

      expect(mockHandler).toHaveBeenCalledWith({
        type: 'INPUT_CHANGED',
        data: { 
          field: 'username',
          custom: { 
            value: 'test-value',
            timestamp: expect.any(Number)
          }
        },
        enrichment: { 
          includeValue: true, 
          includeTimestamp: true,
          namespace: 'custom'
        }
      })
    })
  })

  describe('Event Delegation Edge Cases', () => {
    it('should handle deeply nested elements', () => {
      const clickAction = { type: 'DEEP_CLICK' }

      render(container, ['div', { on: { click: clickAction } },
        ['div', ['div', ['div', ['div', ['span', 'Deep click']]]]]
      ])

      const span = container.querySelector('span')!
      span.click()

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'DEEP_CLICK' })
      )
    })

    it('should stop at first matching parent', () => {
      const outerAction = { type: 'OUTER_CLICK' }
      const innerAction = { type: 'INNER_CLICK' }

      render(container, ['div', { on: { click: outerAction } },
        ['div', { on: { click: innerAction } },
          ['span', 'Click me']
        ]
      ])

      const span = container.querySelector('span')!
      span.click()

      // Should only trigger inner action, not outer
      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'INNER_CLICK' })
      )
      expect(mockHandler).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'OUTER_CLICK' })
      )
    })

    it('should handle events on non-input elements', () => {
      const hoverAction = { 
        type: 'DIV_HOVERED',
        enrichment: { includeValue: true } // Should not crash on non-input
      }

      render(container, ['div', { 
        on: { mousedown: hoverAction }
      }, 'Hover me'])

      const div = container.querySelector('div')!
      div.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))

      expect(mockHandler).toHaveBeenCalledWith({
        type: 'DIV_HOVERED',
        data: {}, // No enrichment data added for non-input elements
        enrichment: { includeValue: true }
      })
    })

    it('should handle multiple event types on same element', () => {
      const clickAction = { type: 'CLICKED' }
      const keydownAction = { type: 'KEY_PRESSED' }

      render(container, ['button', { 
        on: { 
          click: clickAction,
          keydown: keydownAction
        }
      }, 'Multi-event button'])

      const button = container.querySelector('button')!
      
      button.click()
      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'CLICKED' })
      )

      button.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }))
      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'KEY_PRESSED' })
      )
    })

    it('should handle removed elements gracefully', () => {
      const clickAction = { type: 'REMOVED_CLICK' }
      
      render(container, ['button', { 
        on: { click: clickAction }
      }, 'Remove me'])

      const button = container.querySelector('button')!
      
      // Remove element from DOM
      button.remove()
      
      // Should not throw error
      expect(() => button.click()).not.toThrow()
      expect(mockHandler).not.toHaveBeenCalled()
    })
  })

  describe('resetEventSystem', () => {
    it('should reset dispatcher and initialization state', () => {
      const customDispatcher = new DefaultEventDispatcher()
      const customHandler = vi.fn()
      customDispatcher.subscribe(customHandler)
      
      setEventDispatcher(customDispatcher)
      
      // Trigger initialization
      render(container, ['button', { 
        on: { click: { type: 'TEST' } }
      }])
      
      // Reset system
      resetEventSystem()
      
      // Should have new default dispatcher
      const newDispatcher = getEventDispatcher()
      expect(newDispatcher).not.toBe(customDispatcher)
      
      // Old handler should not be called
      newDispatcher.dispatch({ type: 'TEST_RESET' })
      expect(customHandler).not.toHaveBeenCalled()
    })
  })
})