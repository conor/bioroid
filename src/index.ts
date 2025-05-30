export { render, renderSimple } from './singultus'
export { createVNode } from './vdom'
export { diff } from './diff'
export { createElement, applyPatches, updateAttributes, applyChildPatches } from './patch'
export { 
  setEventDispatcher, 
  getEventDispatcher, 
  DefaultEventDispatcher,
  attachEventAction,
  removeEventAction
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