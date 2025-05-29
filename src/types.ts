export type SingultusElement = string | number | boolean | null | undefined | SingultusNode | SingultusElement[]

export type SingultusNode = [string] | [string, SingultusAttributes] | [string, ...SingultusElement[]] | [string, SingultusAttributes, ...SingultusElement[]]

export interface SingultusAttributes {
  [key: string]: any
  
  // Content
  innerHTML?: string
  textContent?: string
  innerText?: string
  
  // Styling
  style?: Record<string, string | number> | string
  className?: string
  class?: string
  
  // Form elements
  value?: string | number
  defaultValue?: string | number
  checked?: boolean
  defaultChecked?: boolean
  selected?: boolean
  defaultSelected?: boolean
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  multiple?: boolean
  
  // Common attributes
  id?: string
  title?: string
  lang?: string
  dir?: 'ltr' | 'rtl' | 'auto'
  hidden?: boolean
  tabIndex?: number
  contentEditable?: boolean | 'true' | 'false' | 'inherit'
  draggable?: boolean
  spellcheck?: boolean
  translate?: 'yes' | 'no'
  
  // Form specific
  name?: string
  type?: string
  placeholder?: string
  autocomplete?: string
  autofocus?: boolean
  
  // Media
  src?: string
  alt?: string
  width?: string | number
  height?: string | number
  autoplay?: boolean
  controls?: boolean
  loop?: boolean
  muted?: boolean
  
  // Links
  href?: string
  target?: string
  rel?: string
  
  // Labels
  htmlFor?: string
  
  // Data and ARIA attributes
  [key: `data-${string}`]: any
  [key: `aria-${string}`]: any
  
  // Events
  on?: Record<string, EventListener>
  
  // Singultus specific
  'singultus/key'?: string | number
  'singultus/on-render'?: (element: Element) => void
}

export type ComponentFunction = (...args: any[]) => SingultusElement

export interface RenderState {
  element: Element
  singultus: SingultusElement
  children: Map<string | number, RenderState>
}

// Virtual DOM types for diffing
export interface VNode {
  type: 'element' | 'text'
  tag?: string
  props?: SingultusAttributes
  children?: VNode[]
  text?: string
  key?: string | number
  isSvg?: boolean
}

export type PatchType = 'CREATE' | 'UPDATE' | 'REMOVE' | 'REPLACE' | 'REORDER'

export interface Patch {
  type: PatchType
  element?: Element
  vNode?: VNode
  props?: SingultusAttributes
  newProps?: SingultusAttributes
  text?: string
  newText?: string
  children?: PatchOperation[]
}

export interface PatchOperation {
  type: 'INSERT' | 'MOVE' | 'REMOVE'
  oldIndex?: number
  newIndex?: number
  vNode?: VNode
  key?: string | number
}