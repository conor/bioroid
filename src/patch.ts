import { VNode, Patch, PatchOperation, SingultusAttributes } from './types'
import { diff } from './diff'
import { setAttributes, updateAttributes } from './attributes'

// SVG elements that require SVG namespace
const SVG_ELEMENTS = new Set([
  'svg', 'g', 'path', 'circle', 'ellipse', 'line', 'rect', 'polyline', 'polygon',
  'text', 'tspan', 'textPath', 'marker', 'defs', 'clipPath', 'mask', 'pattern',
  'image', 'switch', 'foreignObject', 'use', 'symbol', 'linearGradient',
  'radialGradient', 'stop', 'animate', 'animateTransform', 'animateMotion'
])

// Export the shared function for backward compatibility
export { updateAttributes }

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