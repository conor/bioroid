export { render, renderSimple } from './singultus'
export { createVNode } from './vdom'
export { diff } from './diff'
export { createElement, applyPatches, applyChildPatches } from './patch'
export { setAttributes, updateAttributes } from './attributes'
export { 
  setEventDispatcher, 
  getEventDispatcher, 
  DefaultEventDispatcher,
  attachEventAction,
  removeEventAction,
  resetEventSystem
} from './events'
export type { 
  SingultusElement, 
  SingultusNode, 
  SingultusAttributes, 
  ComponentFunction,
  RenderState,
  VNode,
  Patch,
  PatchOperation,
  EventAction,
  EventDispatcher
} from './types'