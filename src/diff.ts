import { VNode, Patch, PatchOperation } from './types'

export function diff(oldVNode: VNode | null, newVNode: VNode | null): Patch[] {
  const patches: Patch[] = []
  
  if (!oldVNode && !newVNode) {
    return patches
  }
  
  if (!oldVNode && newVNode) {
    patches.push({ type: 'CREATE', vNode: newVNode })
    return patches
  }
  
  if (oldVNode && !newVNode) {
    patches.push({ type: 'REMOVE' })
    return patches
  }
  
  if (oldVNode && newVNode) {
    // Different node types or tags - replace entirely
    if (oldVNode.type !== newVNode.type || 
        (oldVNode.type === 'element' && newVNode.type === 'element' && oldVNode.tag !== newVNode.tag)) {
      patches.push({ type: 'REPLACE', vNode: newVNode })
      return patches
    }
    
    // Text nodes
    if (oldVNode.type === 'text' && newVNode.type === 'text') {
      if (oldVNode.text !== newVNode.text) {
        patches.push({ type: 'UPDATE', text: oldVNode.text, newText: newVNode.text })
      }
      return patches
    }
    
    // Element nodes
    if (oldVNode.type === 'element' && newVNode.type === 'element') {
      // Check props
      if (propsChanged(oldVNode.props, newVNode.props)) {
        patches.push({ 
          type: 'UPDATE', 
          props: oldVNode.props, 
          newProps: newVNode.props 
        })
      }
      
      // Diff children
      const childPatches = diffChildren(oldVNode.children || [], newVNode.children || [])
      if (childPatches.length > 0) {
        patches.push({ type: 'REORDER', children: childPatches })
      }
    }
  }
  
  return patches
}

function propsChanged(oldProps: any = {}, newProps: any = {}): boolean {
  const oldKeys = Object.keys(oldProps)
  const newKeys = Object.keys(newProps)
  
  if (oldKeys.length !== newKeys.length) return true
  
  for (const key of newKeys) {
    if (oldProps[key] !== newProps[key]) {
      // Special handling for style objects
      if (key === 'style' && typeof oldProps[key] === 'object' && typeof newProps[key] === 'object') {
        if (JSON.stringify(oldProps[key]) !== JSON.stringify(newProps[key])) {
          return true
        }
      } else {
        return true
      }
    }
  }
  
  return false
}

function diffChildren(oldChildren: VNode[], newChildren: VNode[]): PatchOperation[] {
  const patches: PatchOperation[] = []
  
  // Create key maps for efficient lookups
  const oldKeyMap = new Map<string | number, { node: VNode; index: number }>()
  const newKeyMap = new Map<string | number, { node: VNode; index: number }>()
  
  // Index old children by key
  oldChildren.forEach((child, index) => {
    if (child.key != null) {
      oldKeyMap.set(child.key, { node: child, index })
    }
  })
  
  // Index new children by key
  newChildren.forEach((child, index) => {
    if (child.key != null) {
      newKeyMap.set(child.key, { node: child, index })
    }
  })
  
  // Track which old indices have been processed
  const processedOldIndices = new Set<number>()
  let oldIndex = 0
  
  // Process new children
  for (let newIndex = 0; newIndex < newChildren.length; newIndex++) {
    const newChild = newChildren[newIndex]
    
    if (newChild.key != null) {
      // Keyed element
      const oldEntry = oldKeyMap.get(newChild.key)
      
      if (oldEntry) {
        // Element exists, check if it moved
        if (oldEntry.index !== newIndex) {
          patches.push({
            type: 'MOVE',
            oldIndex: oldEntry.index,
            newIndex,
            vNode: newChild,
            key: newChild.key
          })
        }
        processedOldIndices.add(oldEntry.index)
        
        // Recursively diff the moved/existing element
        const childPatches = diff(oldEntry.node, newChild)
        if (childPatches.length > 0) {
          // Apply child patches to the moved element
          patches.push({
            type: 'MOVE',
            oldIndex: oldEntry.index,
            newIndex,
            vNode: newChild,
            key: newChild.key
          })
        }
      } else {
        // New keyed element
        patches.push({
          type: 'INSERT',
          newIndex,
          vNode: newChild,
          key: newChild.key
        })
      }
    } else {
      // Non-keyed element - use positional matching
      while (oldIndex < oldChildren.length && processedOldIndices.has(oldIndex)) {
        oldIndex++
      }
      
      if (oldIndex < oldChildren.length) {
        const oldChild = oldChildren[oldIndex]
        const childPatches = diff(oldChild, newChild)
        
        if (childPatches.length > 0) {
          patches.push({
            type: 'MOVE',
            oldIndex,
            newIndex,
            vNode: newChild
          })
        }
        
        processedOldIndices.add(oldIndex)
        oldIndex++
      } else {
        // No more old children - insert new one
        patches.push({
          type: 'INSERT',
          newIndex,
          vNode: newChild
        })
      }
    }
  }
  
  // Remove old children that weren't processed
  for (let i = 0; i < oldChildren.length; i++) {
    if (!processedOldIndices.has(i)) {
      patches.push({
        type: 'REMOVE',
        oldIndex: i
      })
    }
  }
  
  return patches
}