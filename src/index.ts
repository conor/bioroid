export { render, renderSimple } from './singultus'
export { createVNode } from './vdom'
export { diff } from './diff'
export { createElement, applyPatches, updateAttributes, applyChildPatches } from './patch'
export type { 
  SingultusElement, 
  SingultusNode, 
  SingultusAttributes, 
  ComponentFunction,
  RenderState,
  VNode,
  Patch,
  PatchOperation
} from './types'