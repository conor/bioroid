import { VNode, Patch, PatchOperation, SingultusAttributes, EventAction } from './types'
import { diff } from './diff'
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

// SVG elements that require SVG namespace
const SVG_ELEMENTS = new Set([
  'svg', 'g', 'path', 'circle', 'ellipse', 'line', 'rect', 'polyline', 'polygon',
  'text', 'tspan', 'textPath', 'marker', 'defs', 'clipPath', 'mask', 'pattern',
  'image', 'switch', 'foreignObject', 'use', 'symbol', 'linearGradient',
  'radialGradient', 'stop', 'animate', 'animateTransform', 'animateMotion'
])

function setAttributes(element: Element, attrs: SingultusAttributes, isSvg = false): void {
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

export function createElement(vNode: VNode): Element | Text {
  if (vNode.type === 'text') {
    return document.createTextNode(vNode.text || '')
  }
  
  if (vNode.tag === 'fragment') {
    // For fragments, create a div wrapper to simplify diffing
    const wrapper = document.createElement('div')
    wrapper.style.display = 'contents' // CSS to make wrapper invisible
    if (vNode.children) {
      for (const child of vNode.children) {
        wrapper.appendChild(createElement(child))
      }
    }
    return wrapper
  }
  
  const element = vNode.isSvg
    ? document.createElementNS('http://www.w3.org/2000/svg', vNode.tag!)
    : document.createElement(vNode.tag!)
  
  if (vNode.props) {
    setAttributes(element, vNode.props, vNode.isSvg)
  }
  
  if (vNode.children) {
    for (const child of vNode.children) {
      element.appendChild(createElement(child))
    }
  }
  
  // Call lifecycle hook
  if (vNode.props?.['singultus/on-render']) {
    vNode.props['singultus/on-render'](element)
  }
  
  return element
}

export function applyPatches(element: Element, patches: Patch[], vNodeMap = new Map<Element, VNode>()): void {
  for (const patch of patches) {
    switch (patch.type) {
      case 'CREATE':
        if (patch.vNode) {
          const newElement = createElement(patch.vNode)
          element.appendChild(newElement)
        }
        break
        
      case 'REMOVE':
        if (element.parentNode) {
          element.parentNode.removeChild(element)
        }
        break
        
      case 'REPLACE':
        if (patch.vNode && element.parentNode) {
          const newElement = createElement(patch.vNode)
          element.parentNode.replaceChild(newElement, element)
        }
        break
        
      case 'UPDATE':
        if (patch.text !== undefined && patch.newText !== undefined) {
          // Text node update
          if (element instanceof Text) {
            element.textContent = patch.newText
          }
        } else if (patch.props && patch.newProps) {
          // Props update
          const vNode = vNodeMap.get(element)
          updateAttributes(element, patch.props, patch.newProps, vNode?.isSvg)
          
          // Call lifecycle hook if present
          if (patch.newProps['singultus/on-render']) {
            patch.newProps['singultus/on-render'](element)
          }
        }
        break
        
      case 'REORDER':
        if (patch.children) {
          applyChildPatches(element, patch.children, vNodeMap)
        }
        break
    }
  }
}

export function applyChildPatches(parent: Element, operations: PatchOperation[], vNodeMap: Map<Element, VNode>): void {
  const children = Array.from(parent.childNodes) as (Element | Text)[]
  const keyToElement = new Map<string | number, Element | Text>()
  
  // Build key map for existing elements
  children.forEach(child => {
    if (child instanceof Element) {
      const vNode = vNodeMap.get(child)
      if (vNode?.key != null) {
        keyToElement.set(vNode.key, child)
      }
    }
  })
  
  // Apply operations in reverse order to maintain indices
  for (let i = operations.length - 1; i >= 0; i--) {
    const op = operations[i]
    
    switch (op.type) {
      case 'INSERT':
        if (op.vNode && op.newIndex !== undefined) {
          const newElement = createElement(op.vNode)
          const referenceNode = children[op.newIndex] || null
          parent.insertBefore(newElement, referenceNode)
          
          // Update vNodeMap
          vNodeMap.set(newElement as Element, op.vNode)
        }
        break
        
      case 'MOVE':
        if (op.oldIndex !== undefined && op.newIndex !== undefined) {
          const element = children[op.oldIndex]
          if (element) {
            // If indices are the same, this is an in-place update
            if (op.oldIndex !== op.newIndex) {
              const referenceNode = children[op.newIndex] || null
              parent.insertBefore(element, referenceNode)
            }
            
            // Update element content if vNode provided
            if (op.vNode) {
              if (op.vNode.type === 'text' && element instanceof Text) {
                // Direct text node update
                element.textContent = op.vNode.text || ''
              } else if (op.vNode.type === 'element' && element instanceof Element) {
                // For element nodes, apply recursive patches
                const oldVNode = vNodeMap.get(element)
                if (oldVNode) {
                  const elementPatches = diff(oldVNode, op.vNode)
                  if (elementPatches.length > 0) {
                    applyPatches(element, elementPatches, vNodeMap)
                  }
                }
                vNodeMap.set(element, op.vNode)
              }
            }
          }
        }
        break
        
      case 'REMOVE':
        if (op.oldIndex !== undefined) {
          const element = children[op.oldIndex]
          if (element && parent.contains(element)) {
            parent.removeChild(element)
            if (element instanceof Element) {
              vNodeMap.delete(element)
            }
          }
        }
        break
    }
  }
}