import { SingultusElement, SingultusNode, SingultusAttributes, VNode } from './types'
import { createVNode } from './vdom'
import { diff } from './diff'
import { applyPatches, createElement, updateAttributes, applyChildPatches } from './patch'

function isNode(element: SingultusElement): element is SingultusNode {
  return Array.isArray(element) && typeof element[0] === 'string'
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
  
  // For the first render, use unified approach
  if (!oldVNode) {
    container.innerHTML = ''
    if (newVNode) {
      // Handle top-level fragments differently - don't wrap in a div
      if (newVNode.tag === 'fragment' && newVNode.children) {
        for (const child of newVNode.children) {
          container.appendChild(createElement(child))
        }
      } else {
        const newElement = createElement(newVNode)
        container.appendChild(newElement)
      }
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
    // If patch application fails, fall back to full re-render
    console.warn('Patch application failed, falling back to full re-render:', error)
    container.innerHTML = ''
    if (newVNode) {
      // Handle top-level fragments differently - don't wrap in a div
      if (newVNode.tag === 'fragment' && newVNode.children) {
        for (const child of newVNode.children) {
          container.appendChild(createElement(child))
        }
      } else {
        const newElement = createElement(newVNode)
        container.appendChild(newElement)
      }
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
  // Clear previous render state to ensure clean render
  containerVNodeMap.delete(container)
  containerElementMap.delete(container)
  
  // Use the main render function which now uses unified approach
  render(container, singultus)
}