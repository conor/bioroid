import { SingultusElement, SingultusNode, SingultusAttributes, VNode } from './types'

const SVG_ELEMENTS = new Set([
  'svg', 'g', 'path', 'circle', 'ellipse', 'line', 'rect', 'polyline', 'polygon',
  'text', 'tspan', 'textPath', 'marker', 'defs', 'clipPath', 'mask', 'pattern',
  'image', 'switch', 'foreignObject', 'use', 'symbol', 'linearGradient',
  'radialGradient', 'stop', 'animate', 'animateTransform', 'animateMotion'
])

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

export function createVNode(singultus: SingultusElement, parentIsSvg = false): VNode {
  if (singultus == null || typeof singultus === 'boolean') {
    return { type: 'text', text: '' }
  }
  
  if (typeof singultus === 'string' || typeof singultus === 'number') {
    return { type: 'text', text: String(singultus) }
  }
  
  if (Array.isArray(singultus)) {
    if (isNode(singultus)) {
      const [tag, ...rest] = singultus
      const { tagName, id, classes } = parseTagName(tag)
      const isSvg = parentIsSvg || SVG_ELEMENTS.has(tagName)
      
      let props: SingultusAttributes = {}
      let children: SingultusElement[] = []
      
      // Parse props and children
      if (rest.length > 0 && typeof rest[0] === 'object' && !Array.isArray(rest[0]) && rest[0] !== null) {
        props = { ...rest[0] } as SingultusAttributes
        children = rest.slice(1) as SingultusElement[]
      } else {
        children = rest as SingultusElement[]
      }
      
      // Add parsed CSS classes and id to props
      if (id) props.id = id
      if (classes.length > 0) {
        const existingClasses = props.class || props.className || ''
        const allClasses = existingClasses ? `${classes.join(' ')} ${existingClasses}` : classes.join(' ')
        props.class = allClasses
      }
      
      // Extract key
      const key = props['singultus/key']
      
      // Create child VNodes
      const childVNodes: VNode[] = []
      for (const child of children as SingultusElement[]) {
        if (child != null) {
          childVNodes.push(createVNode(child, isSvg))
        }
      }
      
      return {
        type: 'element',
        tag: tagName,
        props,
        children: childVNodes,
        key,
        isSvg
      }
    } else {
      // Array of elements - create a fragment-like structure
      const childVNodes: VNode[] = []
      for (const child of singultus as SingultusElement[]) {
        if (child != null) {
          childVNodes.push(createVNode(child, parentIsSvg))
        }
      }
      return {
        type: 'element',
        tag: 'fragment',
        children: childVNodes
      }
    }
  }
  
  return { type: 'text', text: String(singultus) }
}