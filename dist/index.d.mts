type SingultusElement = string | number | boolean | null | undefined | SingultusNode | SingultusElement[];
type SingultusNode = [string] | [string, SingultusAttributes] | [string, ...SingultusElement[]] | [string, SingultusAttributes, ...SingultusElement[]];
interface SingultusAttributes {
    [key: string]: any;
    innerHTML?: string;
    textContent?: string;
    innerText?: string;
    style?: Record<string, string | number> | string;
    className?: string;
    class?: string;
    value?: string | number;
    defaultValue?: string | number;
    checked?: boolean;
    defaultChecked?: boolean;
    selected?: boolean;
    defaultSelected?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    required?: boolean;
    multiple?: boolean;
    id?: string;
    title?: string;
    lang?: string;
    dir?: 'ltr' | 'rtl' | 'auto';
    hidden?: boolean;
    tabIndex?: number;
    contentEditable?: boolean | 'true' | 'false' | 'inherit';
    draggable?: boolean;
    spellcheck?: boolean;
    translate?: 'yes' | 'no';
    name?: string;
    type?: string;
    placeholder?: string;
    autocomplete?: string;
    autofocus?: boolean;
    src?: string;
    alt?: string;
    width?: string | number;
    height?: string | number;
    autoplay?: boolean;
    controls?: boolean;
    loop?: boolean;
    muted?: boolean;
    href?: string;
    target?: string;
    rel?: string;
    htmlFor?: string;
    [key: `data-${string}`]: any;
    [key: `aria-${string}`]: any;
    on?: Record<string, EventListener>;
    'singultus/key'?: string | number;
    'singultus/on-render'?: (element: Element) => void;
}
type ComponentFunction = (...args: any[]) => SingultusElement;
interface RenderState {
    element: Element;
    singultus: SingultusElement;
    children: Map<string | number, RenderState>;
}
interface VNode {
    type: 'element' | 'text';
    tag?: string;
    props?: SingultusAttributes;
    children?: VNode[];
    text?: string;
    key?: string | number;
    isSvg?: boolean;
}
type PatchType = 'CREATE' | 'UPDATE' | 'REMOVE' | 'REPLACE' | 'REORDER';
interface Patch {
    type: PatchType;
    element?: Element;
    vNode?: VNode;
    props?: SingultusAttributes;
    newProps?: SingultusAttributes;
    text?: string;
    newText?: string;
    children?: PatchOperation[];
}
interface PatchOperation {
    type: 'INSERT' | 'MOVE' | 'REMOVE';
    oldIndex?: number;
    newIndex?: number;
    vNode?: VNode;
    key?: string | number;
}

declare function render(container: Element, singultus: SingultusElement): void;
declare function renderSimple(container: Element, singultus: SingultusElement): void;

declare function createVNode(singultus: SingultusElement, parentIsSvg?: boolean): VNode;

declare function diff(oldVNode: VNode | null, newVNode: VNode | null): Patch[];

declare function updateAttributes(element: Element, oldProps?: SingultusAttributes, newProps?: SingultusAttributes, isSvg?: boolean): void;
declare function createElement(vNode: VNode): Element | Text;
declare function applyPatches(element: Element, patches: Patch[], vNodeMap?: Map<Element, VNode>): void;
declare function applyChildPatches(parent: Element, operations: PatchOperation[], vNodeMap: Map<Element, VNode>): void;

export { ComponentFunction, Patch, PatchOperation, RenderState, SingultusAttributes, SingultusElement, SingultusNode, VNode, applyChildPatches, applyPatches, createElement, createVNode, diff, render, renderSimple, updateAttributes };
