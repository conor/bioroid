import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  DefaultEventDispatcher, 
  setEventDispatcher, 
  getEventDispatcher,
  attachEventAction,
  removeEventAction
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
            buttonId: 'test-btn',
            timestamp: expect.any(Number)
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
            field: 'username',
            value: 'new-value',
            timestamp: expect.any(Number)
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
            setting: 'notifications',
            checked: false,
            timestamp: expect.any(Number)
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

    it('should work alongside function-based event handlers', () => {
      const functionHandler = vi.fn()
      const actionHandler = { type: 'ACTION_FIRED' }

      render(container, ['div', [
        ['button', { 
          on: { click: functionHandler }
        }, 'Function Handler'],
        ['button', { 
          on: { click: actionHandler }
        }, 'Action Handler']
      ]])

      const [funcButton, actionButton] = container.querySelectorAll('button')
      
      funcButton.click()
      expect(functionHandler).toHaveBeenCalled()
      expect(mockHandler).not.toHaveBeenCalled()

      actionButton.click()
      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'ACTION_FIRED' })
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
})