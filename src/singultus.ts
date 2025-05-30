import { SingultusElement, SingultusNode, SingultusAttributes, VNode, EventAction } from './types'
import { createVNode } from './vdom'
import { diff } from './diff'
import { applyPatches, createElement, updateAttributes, applyChildPatches } from './patch'
import { attachEventAction } from './events'

function isNode(element: SingultusElement): element is SingultusNode {
  return Array.isArray(element) && typeof element[0] === 'string'
}

function parseTagName(tag: string): { tagName: string; id?: string; classes: string[] } {
  const idMatch = tag.match(/#([^.]+)/)
  const classMatches = tag.match(/\.([^#.]+)/g)
  
  const tagName = tag.replace(/#[^.]*/, '').replace(/\.[^#]*/g, '') || 'div'
  const id = idMatch?.[1]
  const classes = classMatches?.map(c => c.slice(1)) || []
  
  return { tagName, id, classes }
}

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

function setAttributes(element: Element, attrs: SingultusAttributes): void {
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'style') {
      if (typeof value === 'string') {
        element.setAttribute('style', value)
      } else if (typeof value === 'object' && value !== null) {
        const htmlElement = element as HTMLElement
        for (const [prop, val] of Object.entries(value)) {
          // Convert camelCase to kebab-case for CSS properties
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
        element.setAttribute('class', String(value))
      }
    } else if (key === 'htmlFor' && element instanceof HTMLLabelElement) {
      element.htmlFor = String(value)
    } else if (DOM_PROPERTIES.has(key)) {
      // Set as DOM property
      (element as any)[key] = value
    } else if (BOOLEAN_ATTRIBUTES.has(key)) {
      // Boolean attributes: set attribute if truthy, remove if falsy
      if (value) {
        element.setAttribute(key, key) // HTML5 style: disabled="disabled"
      } else {
        element.removeAttribute(key)
      }
    } else if (key.startsWith('data-') || key.startsWith('aria-')) {
      // Data and ARIA attributes: always set as attributes
      if (value != null) {
        element.setAttribute(key, String(value))
      } else {
        element.removeAttribute(key)
      }
    } else {
      // Regular attributes
      if (value != null) {
        element.setAttribute(key, String(value))
      } else {
        element.removeAttribute(key)
      }
    }
  }
}

// SVG elements that require SVG namespace
const SVG_ELEMENTS = new Set([
  'svg', 'g', 'path', 'circle', 'ellipse', 'line', 'rect', 'polyline', 'polygon',
  'text', 'tspan', 'textPath', 'marker', 'defs', 'clipPath', 'mask', 'pattern',
  'image', 'switch', 'foreignObject', 'use', 'symbol', 'linearGradient',
  'radialGradient', 'stop', 'animate', 'animateTransform', 'animateMotion'
])

function createElementLegacy(singultus: SingultusNode): Element {
  const [tag, ...rest] = singultus
  const { tagName, id, classes } = parseTagName(tag)
  
  // Create element with appropriate namespace
  const element = SVG_ELEMENTS.has(tagName)
    ? document.createElementNS('http://www.w3.org/2000/svg', tagName)
    : document.createElement(tagName)
  
  if (id) {
    element.id = id
  }
  
  if (classes.length > 0) {
    if (SVG_ELEMENTS.has(tagName)) {
      element.setAttribute('class', classes.join(' '))
    } else {
      (element as HTMLElement).className = classes.join(' ')
    }
  }
  
  let attrs: SingultusAttributes = {}
  let children: SingultusElement[] = []
  
  if (rest.length > 0 && typeof rest[0] === 'object' && !Array.isArray(rest[0]) && rest[0] !== null) {
    attrs = rest[0] as SingultusAttributes
    children = rest.slice(1) as SingultusElement[]
  } else {
    children = rest as SingultusElement[]
  }
  
  if (attrs.class || attrs.className) {
    const existingClasses = element.className ? element.className.split(' ') : []
    const newClasses = String(attrs.class || attrs.className).split(' ').filter(Boolean)
    const combinedClasses = [...new Set([...existingClasses, ...newClasses])].join(' ')
    
    if (SVG_ELEMENTS.has(tagName)) {
      element.setAttribute('class', combinedClasses)
    } else {
      (element as HTMLElement).className = combinedClasses
    }
  }
  
  setAttributes(element, attrs)
  
  for (const child of children) {
    if (child != null) {
      if (isNode(child)) {
        element.appendChild(createElementLegacy(child))
      } else if (Array.isArray(child)) {
        // Handle arrays of children
        for (const nestedChild of child) {
          if (nestedChild != null) {
            if (isNode(nestedChild)) {
              element.appendChild(createElementLegacy(nestedChild))
            } else {
              element.appendChild(document.createTextNode(String(nestedChild)))
            }
          }
        }
      } else {
        element.appendChild(document.createTextNode(String(child)))
      }
    }
  }
  
  if (attrs['singultus/on-render']) {
    attrs['singultus/on-render'](element)
  }
  
  return element
}

// Store the previous virtual DOM for diffing
const containerVNodeMap = new WeakMap<Element, VNode>()
const containerElementMap = new WeakMap<Element, Map<Element, VNode>>()

// Helper function to map DOM nodes to their corresponding VNodes
function mapElementsToVNodes(element: Element, vNode: VNode, map: Map<Element, VNode>): void {
  map.set(element, vNode)
  
  if (vNode.type === 'element' && vNode.children) {
    const childNodes = Array.from(element.childNodes)
    
    let nodeIndex = 0
    for (const childVNode of vNode.children) {
      if (nodeIndex < childNodes.length) {
        const childNode = childNodes[nodeIndex]
        
        if (childVNode.type === 'element' && childNode.nodeType === Node.ELEMENT_NODE) {
          mapElementsToVNodes(childNode as Element, childVNode, map)
        }
        // Note: We can't map text nodes to the Element-keyed map, 
        // but the patch system will handle text updates directly
        
        nodeIndex++
      }
    }
  }
}

export function render(container: Element, singultus: SingultusElement): void {
  // Get the previous VNode for this container
  const oldVNode = containerVNodeMap.get(container)
  
  // Create new VNode from current singultus
  const newVNode = singultus == null ? null : createVNode(singultus)
  
  // For the first render, use simple approach and store state
  if (!oldVNode) {
    renderSimple(container, singultus)
    if (newVNode) {
      containerVNodeMap.set(container, newVNode)
      // Create element mapping for future diffs
      const elementMap = new Map<Element, VNode>()
      if (container.firstElementChild) {
        mapElementsToVNodes(container.firstElementChild, newVNode, elementMap)
      }
      containerElementMap.set(container, elementMap)
    }
    return
  }
  
  // Calculate differences
  const patches = diff(oldVNode, newVNode)
  
  if (patches.length === 0) {
    // No changes needed - KEY OPTIMIZATION
    return
  }
  
  // Get the existing element mapping
  const elementMap = containerElementMap.get(container) || new Map<Element, VNode>()
  
  // Apply patches based on patch type
  try {
    let patchApplied = false
    
    for (const patch of patches) {
      switch (patch.type) {
        case 'CREATE':
          // Container was empty, create new content
          if (patch.vNode) {
            const newElement = createElement(patch.vNode)
            container.appendChild(newElement)
            patchApplied = true
          }
          break
          
        case 'REMOVE':
          // Remove all content from container
          container.innerHTML = ''
          patchApplied = true
          break
          
        case 'REPLACE':
          // Replace entire content
          container.innerHTML = ''
          if (patch.vNode) {
            const newElement = createElement(patch.vNode)
            container.appendChild(newElement)
            patchApplied = true
          }
          break
          
        case 'UPDATE':
          // Update the root element's properties
          if (container.firstElementChild && patch.props && patch.newProps) {
            const vNode = elementMap.get(container.firstElementChild)
            updateAttributes(container.firstElementChild, patch.props, patch.newProps, vNode?.isSvg)
            if (patch.newProps['singultus/on-render']) {
              patch.newProps['singultus/on-render'](container.firstElementChild)
            }
            patchApplied = true
          }
          break
          
        case 'REORDER':
          // Apply child reordering to the root element
          if (container.firstElementChild && patch.children) {
            applyChildPatches(container.firstElementChild, patch.children, elementMap)
            
            // Call lifecycle hook if present on the new VNode (since the element was updated)
            if (newVNode?.props?.['singultus/on-render']) {
              newVNode.props['singultus/on-render'](container.firstElementChild)
            }
            
            patchApplied = true
          }
          break
      }
    }
    
    if (patchApplied) {
      // Update stored state after successful patch application
      if (newVNode) {
        containerVNodeMap.set(container, newVNode)
        // Update element mapping
        const newElementMap = new Map<Element, VNode>()
        if (container.firstElementChild) {
          mapElementsToVNodes(container.firstElementChild, newVNode, newElementMap)
        }
        containerElementMap.set(container, newElementMap)
      } else {
        containerVNodeMap.delete(container)
        containerElementMap.delete(container)
      }
    }
  } catch (error) {
    // If patch application fails, fall back to simple render
    console.warn('Patch application failed, falling back to simple render:', error)
    renderSimple(container, singultus)
    if (newVNode) {
      containerVNodeMap.set(container, newVNode)
      const elementMap = new Map<Element, VNode>()
      if (container.firstElementChild) {
        mapElementsToVNodes(container.firstElementChild, newVNode, elementMap)
      }
      containerElementMap.set(container, elementMap)
    } else {
      containerVNodeMap.delete(container)
      containerElementMap.delete(container)
    }
  }
}

// Legacy simple render function for backwards compatibility
export function renderSimple(container: Element, singultus: SingultusElement): void {
  container.innerHTML = ''
  
  if (singultus == null) {
    return
  }
  
  if (isNode(singultus)) {
    container.appendChild(createElementLegacy(singultus))
  } else if (Array.isArray(singultus)) {
    for (const child of singultus) {
      if (child != null) {
        if (isNode(child)) {
          container.appendChild(createElementLegacy(child))
        } else if (Array.isArray(child)) {
          // Handle nested arrays recursively
          renderSimple(container, child)
        } else {
          container.appendChild(document.createTextNode(String(child)))
        }
      }
    }
  } else {
    container.appendChild(document.createTextNode(String(singultus)))
  }
}