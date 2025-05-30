import { SingultusAttributes, EventAction } from './types'
import { attachEventAction, removeEventAction } from './events'

// Boolean attributes that should be omitted when false
const BOOLEAN_ATTRIBUTES = new Set([
  'autofocus', 'autoplay', 'async', 'checked', 'controls', 'defer', 'disabled',
  'hidden', 'loop', 'multiple', 'muted', 'open', 'readonly', 'required',
  'reversed', 'selected', 'scoped', 'seamless', 'itemScope', 'noValidate',
  'allowFullscreen', 'formNoValidate', 'default', 'capture', 'autocomplete'
])

// Properties that should be set as DOM properties rather than attributes
const DOM_PROPERTIES = new Set([
  'value', 'checked', 'selected', 'defaultValue', 'defaultChecked', 'defaultSelected',
  'innerHTML', 'textContent', 'innerText', 'htmlFor', 'className', 'tabIndex',
  'contentEditable', 'draggable', 'spellcheck', 'translate'
])

export function setAttributes(element: Element, attrs: SingultusAttributes, isSvg = false): void {
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'style') {
      if (typeof value === 'string') {
        element.setAttribute('style', value)
      } else if (typeof value === 'object' && value !== null) {
        const htmlElement = element as HTMLElement
        for (const [prop, val] of Object.entries(value)) {
          const kebabProp = prop.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)
          htmlElement.style.setProperty(kebabProp, String(val))
        }
      }
    } else if (key === 'innerHTML') {
      element.innerHTML = String(value)
    } else if (key === 'textContent') {
      element.textContent = String(value)
    } else if (key === 'on' && typeof value === 'object' && value !== null) {
      for (const [eventType, handler] of Object.entries(value)) {
        if (typeof handler === 'function') {
          element.addEventListener(eventType, handler as EventListener)
        } else if (handler && typeof handler === 'object' && 'type' in handler) {
          // Data-driven event action - use delegation
          attachEventAction(element, eventType, handler as EventAction)
        }
      }
    } else if (key.startsWith('singultus/')) {
      continue
    } else if (key === 'className' || key === 'class') {
      if (value) {
        if (isSvg) {
          element.setAttribute('class', String(value))
        } else {
          (element as HTMLElement).className = String(value)
        }
      }
    } else if (key === 'htmlFor' && element instanceof HTMLLabelElement) {
      element.htmlFor = String(value)
    } else if (DOM_PROPERTIES.has(key) && !isSvg) {
      (element as any)[key] = value
    } else if (BOOLEAN_ATTRIBUTES.has(key)) {
      if (value) {
        element.setAttribute(key, key)
      } else {
        element.removeAttribute(key)
      }
    } else if (key.startsWith('data-') || key.startsWith('aria-')) {
      if (value != null) {
        element.setAttribute(key, String(value))
      } else {
        element.removeAttribute(key)
      }
    } else {
      if (value != null) {
        element.setAttribute(key, String(value))
      } else {
        element.removeAttribute(key)
      }
    }
  }
}

export function updateAttributes(element: Element, oldProps: SingultusAttributes = {}, newProps: SingultusAttributes = {}, isSvg = false): void {
  // Special handling for event listeners - always remove old ones first
  if (oldProps.on && typeof oldProps.on === 'object' && oldProps.on !== null) {
    for (const [eventType, handler] of Object.entries(oldProps.on)) {
      if (typeof handler === 'function') {
        element.removeEventListener(eventType, handler as EventListener)
      } else if (handler && typeof handler === 'object' && 'type' in handler) {
        // Remove data-driven event action
        removeEventAction(element, eventType)
      }
    }
  }
  
  // Remove old attributes/properties
  for (const key of Object.keys(oldProps)) {
    if (!(key in newProps)) {
      if (key === 'style') {
        element.setAttribute('style', '')
      } else if (key === 'className' || key === 'class') {
        if (isSvg) {
          element.removeAttribute('class')
        } else {
          (element as HTMLElement).className = ''
        }
      } else if (key === 'on') {
        // Event listeners already handled above
        continue
      } else if (!key.startsWith('singultus/')) {
        if (DOM_PROPERTIES.has(key) && !isSvg) {
          (element as any)[key] = ''
        } else {
          element.removeAttribute(key)
        }
      }
    }
  }
  
  // Set new attributes/properties
  setAttributes(element, newProps, isSvg)
}