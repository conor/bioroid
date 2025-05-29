"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  applyChildPatches: () => applyChildPatches,
  applyPatches: () => applyPatches,
  createElement: () => createElement,
  createVNode: () => createVNode,
  diff: () => diff,
  render: () => render,
  renderSimple: () => renderSimple,
  updateAttributes: () => updateAttributes
});
module.exports = __toCommonJS(src_exports);

// src/vdom.ts
var SVG_ELEMENTS = /* @__PURE__ */ new Set([
  "svg",
  "g",
  "path",
  "circle",
  "ellipse",
  "line",
  "rect",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "textPath",
  "marker",
  "defs",
  "clipPath",
  "mask",
  "pattern",
  "image",
  "switch",
  "foreignObject",
  "use",
  "symbol",
  "linearGradient",
  "radialGradient",
  "stop",
  "animate",
  "animateTransform",
  "animateMotion"
]);
function isNode(element) {
  return Array.isArray(element) && typeof element[0] === "string";
}
function parseTagName(tag) {
  const idMatch = tag.match(/#([^.]+)/);
  const classMatches = tag.match(/\.([^#.]+)/g);
  const tagName = tag.replace(/#[^.]*/, "").replace(/\.[^#]*/g, "") || "div";
  const id = idMatch?.[1];
  const classes = classMatches?.map((c) => c.slice(1)) || [];
  return { tagName, id, classes };
}
function createVNode(singultus, parentIsSvg = false) {
  if (singultus == null || typeof singultus === "boolean") {
    return { type: "text", text: "" };
  }
  if (typeof singultus === "string" || typeof singultus === "number") {
    return { type: "text", text: String(singultus) };
  }
  if (Array.isArray(singultus)) {
    if (isNode(singultus)) {
      const [tag, ...rest] = singultus;
      const { tagName, id, classes } = parseTagName(tag);
      const isSvg = parentIsSvg || SVG_ELEMENTS.has(tagName);
      let props = {};
      let children = [];
      if (rest.length > 0 && typeof rest[0] === "object" && !Array.isArray(rest[0]) && rest[0] !== null) {
        props = { ...rest[0] };
        children = rest.slice(1);
      } else {
        children = rest;
      }
      if (id)
        props.id = id;
      if (classes.length > 0) {
        const existingClasses = props.class || props.className || "";
        const allClasses = existingClasses ? `${classes.join(" ")} ${existingClasses}` : classes.join(" ");
        props.class = allClasses;
      }
      const key = props["singultus/key"];
      const childVNodes = [];
      for (const child of children) {
        if (child != null) {
          childVNodes.push(createVNode(child, isSvg));
        }
      }
      return {
        type: "element",
        tag: tagName,
        props,
        children: childVNodes,
        key,
        isSvg
      };
    } else {
      const childVNodes = [];
      for (const child of singultus) {
        if (child != null) {
          childVNodes.push(createVNode(child, parentIsSvg));
        }
      }
      return {
        type: "element",
        tag: "fragment",
        children: childVNodes
      };
    }
  }
  return { type: "text", text: String(singultus) };
}

// src/diff.ts
function diff(oldVNode, newVNode) {
  const patches = [];
  if (!oldVNode && !newVNode) {
    return patches;
  }
  if (!oldVNode && newVNode) {
    patches.push({ type: "CREATE", vNode: newVNode });
    return patches;
  }
  if (oldVNode && !newVNode) {
    patches.push({ type: "REMOVE" });
    return patches;
  }
  if (oldVNode && newVNode) {
    if (oldVNode.type !== newVNode.type || oldVNode.type === "element" && newVNode.type === "element" && oldVNode.tag !== newVNode.tag) {
      patches.push({ type: "REPLACE", vNode: newVNode });
      return patches;
    }
    if (oldVNode.type === "text" && newVNode.type === "text") {
      if (oldVNode.text !== newVNode.text) {
        patches.push({ type: "UPDATE", text: oldVNode.text, newText: newVNode.text });
      }
      return patches;
    }
    if (oldVNode.type === "element" && newVNode.type === "element") {
      if (propsChanged(oldVNode.props, newVNode.props)) {
        patches.push({
          type: "UPDATE",
          props: oldVNode.props,
          newProps: newVNode.props
        });
      }
      const childPatches = diffChildren(oldVNode.children || [], newVNode.children || []);
      if (childPatches.length > 0) {
        patches.push({ type: "REORDER", children: childPatches });
      }
    }
  }
  return patches;
}
function propsChanged(oldProps = {}, newProps = {}) {
  const oldKeys = Object.keys(oldProps);
  const newKeys = Object.keys(newProps);
  if (oldKeys.length !== newKeys.length)
    return true;
  for (const key of newKeys) {
    if (oldProps[key] !== newProps[key]) {
      if (key === "style" && typeof oldProps[key] === "object" && typeof newProps[key] === "object") {
        if (JSON.stringify(oldProps[key]) !== JSON.stringify(newProps[key])) {
          return true;
        }
      } else {
        return true;
      }
    }
  }
  return false;
}
function diffChildren(oldChildren, newChildren) {
  const patches = [];
  const oldKeyMap = /* @__PURE__ */ new Map();
  const newKeyMap = /* @__PURE__ */ new Map();
  oldChildren.forEach((child, index) => {
    if (child.key != null) {
      oldKeyMap.set(child.key, { node: child, index });
    }
  });
  newChildren.forEach((child, index) => {
    if (child.key != null) {
      newKeyMap.set(child.key, { node: child, index });
    }
  });
  const processedOldIndices = /* @__PURE__ */ new Set();
  let oldIndex = 0;
  for (let newIndex = 0; newIndex < newChildren.length; newIndex++) {
    const newChild = newChildren[newIndex];
    if (newChild.key != null) {
      const oldEntry = oldKeyMap.get(newChild.key);
      if (oldEntry) {
        if (oldEntry.index !== newIndex) {
          patches.push({
            type: "MOVE",
            oldIndex: oldEntry.index,
            newIndex,
            vNode: newChild,
            key: newChild.key
          });
        }
        processedOldIndices.add(oldEntry.index);
        const childPatches = diff(oldEntry.node, newChild);
        if (childPatches.length > 0) {
          patches.push({
            type: "MOVE",
            oldIndex: oldEntry.index,
            newIndex,
            vNode: newChild,
            key: newChild.key
          });
        }
      } else {
        patches.push({
          type: "INSERT",
          newIndex,
          vNode: newChild,
          key: newChild.key
        });
      }
    } else {
      while (oldIndex < oldChildren.length && processedOldIndices.has(oldIndex)) {
        oldIndex++;
      }
      if (oldIndex < oldChildren.length) {
        const oldChild = oldChildren[oldIndex];
        const childPatches = diff(oldChild, newChild);
        if (childPatches.length > 0) {
          patches.push({
            type: "MOVE",
            oldIndex,
            newIndex,
            vNode: newChild
          });
        }
        processedOldIndices.add(oldIndex);
        oldIndex++;
      } else {
        patches.push({
          type: "INSERT",
          newIndex,
          vNode: newChild
        });
      }
    }
  }
  for (let i = 0; i < oldChildren.length; i++) {
    if (!processedOldIndices.has(i)) {
      patches.push({
        type: "REMOVE",
        oldIndex: i
      });
    }
  }
  return patches;
}

// src/patch.ts
var BOOLEAN_ATTRIBUTES = /* @__PURE__ */ new Set([
  "autofocus",
  "autoplay",
  "async",
  "checked",
  "controls",
  "defer",
  "disabled",
  "hidden",
  "loop",
  "multiple",
  "muted",
  "open",
  "readonly",
  "required",
  "reversed",
  "selected",
  "scoped",
  "seamless",
  "itemScope",
  "noValidate",
  "allowFullscreen",
  "formNoValidate",
  "default",
  "capture",
  "autocomplete"
]);
var DOM_PROPERTIES = /* @__PURE__ */ new Set([
  "value",
  "checked",
  "selected",
  "defaultValue",
  "defaultChecked",
  "defaultSelected",
  "innerHTML",
  "textContent",
  "innerText",
  "htmlFor",
  "className",
  "tabIndex",
  "contentEditable",
  "draggable",
  "spellcheck",
  "translate"
]);
function setAttributes(element, attrs, isSvg = false) {
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "style") {
      if (typeof value === "string") {
        element.setAttribute("style", value);
      } else if (typeof value === "object" && value !== null) {
        const htmlElement = element;
        for (const [prop, val] of Object.entries(value)) {
          const kebabProp = prop.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
          htmlElement.style.setProperty(kebabProp, String(val));
        }
      }
    } else if (key === "innerHTML") {
      element.innerHTML = String(value);
    } else if (key === "textContent") {
      element.textContent = String(value);
    } else if (key === "on" && typeof value === "object" && value !== null) {
      for (const [eventType, handler] of Object.entries(value)) {
        if (typeof handler === "function") {
          element.addEventListener(eventType, handler);
        }
      }
    } else if (key.startsWith("singultus/")) {
      continue;
    } else if (key === "className" || key === "class") {
      if (value) {
        if (isSvg) {
          element.setAttribute("class", String(value));
        } else {
          element.className = String(value);
        }
      }
    } else if (key === "htmlFor" && element instanceof HTMLLabelElement) {
      element.htmlFor = String(value);
    } else if (DOM_PROPERTIES.has(key) && !isSvg) {
      element[key] = value;
    } else if (BOOLEAN_ATTRIBUTES.has(key)) {
      if (value) {
        element.setAttribute(key, key);
      } else {
        element.removeAttribute(key);
      }
    } else if (key.startsWith("data-") || key.startsWith("aria-")) {
      if (value != null) {
        element.setAttribute(key, String(value));
      } else {
        element.removeAttribute(key);
      }
    } else {
      if (value != null) {
        element.setAttribute(key, String(value));
      } else {
        element.removeAttribute(key);
      }
    }
  }
}
function updateAttributes(element, oldProps = {}, newProps = {}, isSvg = false) {
  if (oldProps.on && typeof oldProps.on === "object" && oldProps.on !== null) {
    for (const [eventType, handler] of Object.entries(oldProps.on)) {
      if (typeof handler === "function") {
        element.removeEventListener(eventType, handler);
      }
    }
  }
  for (const key of Object.keys(oldProps)) {
    if (!(key in newProps)) {
      if (key === "style") {
        element.setAttribute("style", "");
      } else if (key === "className" || key === "class") {
        if (isSvg) {
          element.removeAttribute("class");
        } else {
          element.className = "";
        }
      } else if (key === "on") {
        continue;
      } else if (!key.startsWith("singultus/")) {
        if (DOM_PROPERTIES.has(key) && !isSvg) {
          element[key] = "";
        } else {
          element.removeAttribute(key);
        }
      }
    }
  }
  setAttributes(element, newProps, isSvg);
}
function createElement(vNode) {
  if (vNode.type === "text") {
    return document.createTextNode(vNode.text || "");
  }
  if (vNode.tag === "fragment") {
    const wrapper = document.createElement("div");
    wrapper.style.display = "contents";
    if (vNode.children) {
      for (const child of vNode.children) {
        wrapper.appendChild(createElement(child));
      }
    }
    return wrapper;
  }
  const element = vNode.isSvg ? document.createElementNS("http://www.w3.org/2000/svg", vNode.tag) : document.createElement(vNode.tag);
  if (vNode.props) {
    setAttributes(element, vNode.props, vNode.isSvg);
  }
  if (vNode.children) {
    for (const child of vNode.children) {
      element.appendChild(createElement(child));
    }
  }
  if (vNode.props?.["singultus/on-render"]) {
    vNode.props["singultus/on-render"](element);
  }
  return element;
}
function applyPatches(element, patches, vNodeMap = /* @__PURE__ */ new Map()) {
  for (const patch of patches) {
    switch (patch.type) {
      case "CREATE":
        if (patch.vNode) {
          const newElement = createElement(patch.vNode);
          element.appendChild(newElement);
        }
        break;
      case "REMOVE":
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
        break;
      case "REPLACE":
        if (patch.vNode && element.parentNode) {
          const newElement = createElement(patch.vNode);
          element.parentNode.replaceChild(newElement, element);
        }
        break;
      case "UPDATE":
        if (patch.text !== void 0 && patch.newText !== void 0) {
          if (element instanceof Text) {
            element.textContent = patch.newText;
          }
        } else if (patch.props && patch.newProps) {
          const vNode = vNodeMap.get(element);
          updateAttributes(element, patch.props, patch.newProps, vNode?.isSvg);
          if (patch.newProps["singultus/on-render"]) {
            patch.newProps["singultus/on-render"](element);
          }
        }
        break;
      case "REORDER":
        if (patch.children) {
          applyChildPatches(element, patch.children, vNodeMap);
        }
        break;
    }
  }
}
function applyChildPatches(parent, operations, vNodeMap) {
  const children = Array.from(parent.childNodes);
  const keyToElement = /* @__PURE__ */ new Map();
  children.forEach((child) => {
    if (child instanceof Element) {
      const vNode = vNodeMap.get(child);
      if (vNode?.key != null) {
        keyToElement.set(vNode.key, child);
      }
    }
  });
  for (let i = operations.length - 1; i >= 0; i--) {
    const op = operations[i];
    switch (op.type) {
      case "INSERT":
        if (op.vNode && op.newIndex !== void 0) {
          const newElement = createElement(op.vNode);
          const referenceNode = children[op.newIndex] || null;
          parent.insertBefore(newElement, referenceNode);
          vNodeMap.set(newElement, op.vNode);
        }
        break;
      case "MOVE":
        if (op.oldIndex !== void 0 && op.newIndex !== void 0) {
          const element = children[op.oldIndex];
          if (element) {
            if (op.oldIndex !== op.newIndex) {
              const referenceNode = children[op.newIndex] || null;
              parent.insertBefore(element, referenceNode);
            }
            if (op.vNode) {
              if (op.vNode.type === "text" && element instanceof Text) {
                element.textContent = op.vNode.text || "";
              } else if (op.vNode.type === "element" && element instanceof Element) {
                const oldVNode = vNodeMap.get(element);
                if (oldVNode) {
                  const elementPatches = diff(oldVNode, op.vNode);
                  if (elementPatches.length > 0) {
                    applyPatches(element, elementPatches, vNodeMap);
                  }
                }
                vNodeMap.set(element, op.vNode);
              }
            }
          }
        }
        break;
      case "REMOVE":
        if (op.oldIndex !== void 0) {
          const element = children[op.oldIndex];
          if (element && parent.contains(element)) {
            parent.removeChild(element);
            if (element instanceof Element) {
              vNodeMap.delete(element);
            }
          }
        }
        break;
    }
  }
}

// src/singultus.ts
function isNode2(element) {
  return Array.isArray(element) && typeof element[0] === "string";
}
function parseTagName2(tag) {
  const idMatch = tag.match(/#([^.]+)/);
  const classMatches = tag.match(/\.([^#.]+)/g);
  const tagName = tag.replace(/#[^.]*/, "").replace(/\.[^#]*/g, "") || "div";
  const id = idMatch?.[1];
  const classes = classMatches?.map((c) => c.slice(1)) || [];
  return { tagName, id, classes };
}
var BOOLEAN_ATTRIBUTES2 = /* @__PURE__ */ new Set([
  "autofocus",
  "autoplay",
  "async",
  "checked",
  "controls",
  "defer",
  "disabled",
  "hidden",
  "loop",
  "multiple",
  "muted",
  "open",
  "readonly",
  "required",
  "reversed",
  "selected",
  "scoped",
  "seamless",
  "itemScope",
  "noValidate",
  "allowFullscreen",
  "formNoValidate",
  "default",
  "capture",
  "autocomplete"
]);
var DOM_PROPERTIES2 = /* @__PURE__ */ new Set([
  "value",
  "checked",
  "selected",
  "defaultValue",
  "defaultChecked",
  "defaultSelected",
  "innerHTML",
  "textContent",
  "innerText",
  "htmlFor",
  "className",
  "tabIndex",
  "contentEditable",
  "draggable",
  "spellcheck",
  "translate"
]);
function setAttributes2(element, attrs) {
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "style") {
      if (typeof value === "string") {
        element.setAttribute("style", value);
      } else if (typeof value === "object" && value !== null) {
        const htmlElement = element;
        for (const [prop, val] of Object.entries(value)) {
          const kebabProp = prop.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
          htmlElement.style.setProperty(kebabProp, String(val));
        }
      }
    } else if (key === "innerHTML") {
      element.innerHTML = String(value);
    } else if (key === "textContent") {
      element.textContent = String(value);
    } else if (key === "on" && typeof value === "object" && value !== null) {
      for (const [eventType, handler] of Object.entries(value)) {
        if (typeof handler === "function") {
          element.addEventListener(eventType, handler);
        }
      }
    } else if (key.startsWith("singultus/")) {
      continue;
    } else if (key === "className" || key === "class") {
      if (value) {
        element.setAttribute("class", String(value));
      }
    } else if (key === "htmlFor" && element instanceof HTMLLabelElement) {
      element.htmlFor = String(value);
    } else if (DOM_PROPERTIES2.has(key)) {
      element[key] = value;
    } else if (BOOLEAN_ATTRIBUTES2.has(key)) {
      if (value) {
        element.setAttribute(key, key);
      } else {
        element.removeAttribute(key);
      }
    } else if (key.startsWith("data-") || key.startsWith("aria-")) {
      if (value != null) {
        element.setAttribute(key, String(value));
      } else {
        element.removeAttribute(key);
      }
    } else {
      if (value != null) {
        element.setAttribute(key, String(value));
      } else {
        element.removeAttribute(key);
      }
    }
  }
}
var SVG_ELEMENTS2 = /* @__PURE__ */ new Set([
  "svg",
  "g",
  "path",
  "circle",
  "ellipse",
  "line",
  "rect",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "textPath",
  "marker",
  "defs",
  "clipPath",
  "mask",
  "pattern",
  "image",
  "switch",
  "foreignObject",
  "use",
  "symbol",
  "linearGradient",
  "radialGradient",
  "stop",
  "animate",
  "animateTransform",
  "animateMotion"
]);
function createElementLegacy(singultus) {
  const [tag, ...rest] = singultus;
  const { tagName, id, classes } = parseTagName2(tag);
  const element = SVG_ELEMENTS2.has(tagName) ? document.createElementNS("http://www.w3.org/2000/svg", tagName) : document.createElement(tagName);
  if (id) {
    element.id = id;
  }
  if (classes.length > 0) {
    if (SVG_ELEMENTS2.has(tagName)) {
      element.setAttribute("class", classes.join(" "));
    } else {
      element.className = classes.join(" ");
    }
  }
  let attrs = {};
  let children = [];
  if (rest.length > 0 && typeof rest[0] === "object" && !Array.isArray(rest[0]) && rest[0] !== null) {
    attrs = rest[0];
    children = rest.slice(1);
  } else {
    children = rest;
  }
  if (attrs.class || attrs.className) {
    const existingClasses = element.className ? element.className.split(" ") : [];
    const newClasses = String(attrs.class || attrs.className).split(" ").filter(Boolean);
    const combinedClasses = [.../* @__PURE__ */ new Set([...existingClasses, ...newClasses])].join(" ");
    if (SVG_ELEMENTS2.has(tagName)) {
      element.setAttribute("class", combinedClasses);
    } else {
      element.className = combinedClasses;
    }
  }
  setAttributes2(element, attrs);
  for (const child of children) {
    if (child != null) {
      if (isNode2(child)) {
        element.appendChild(createElementLegacy(child));
      } else if (Array.isArray(child)) {
        for (const nestedChild of child) {
          if (nestedChild != null) {
            if (isNode2(nestedChild)) {
              element.appendChild(createElementLegacy(nestedChild));
            } else {
              element.appendChild(document.createTextNode(String(nestedChild)));
            }
          }
        }
      } else {
        element.appendChild(document.createTextNode(String(child)));
      }
    }
  }
  if (attrs["singultus/on-render"]) {
    attrs["singultus/on-render"](element);
  }
  return element;
}
var containerVNodeMap = /* @__PURE__ */ new WeakMap();
var containerElementMap = /* @__PURE__ */ new WeakMap();
function mapElementsToVNodes(element, vNode, map) {
  map.set(element, vNode);
  if (vNode.type === "element" && vNode.children) {
    const childNodes = Array.from(element.childNodes);
    let nodeIndex = 0;
    for (const childVNode of vNode.children) {
      if (nodeIndex < childNodes.length) {
        const childNode = childNodes[nodeIndex];
        if (childVNode.type === "element" && childNode.nodeType === Node.ELEMENT_NODE) {
          mapElementsToVNodes(childNode, childVNode, map);
        }
        nodeIndex++;
      }
    }
  }
}
function render(container, singultus) {
  const oldVNode = containerVNodeMap.get(container);
  const newVNode = singultus == null ? null : createVNode(singultus);
  if (!oldVNode) {
    renderSimple(container, singultus);
    if (newVNode) {
      containerVNodeMap.set(container, newVNode);
      const elementMap2 = /* @__PURE__ */ new Map();
      if (container.firstElementChild) {
        mapElementsToVNodes(container.firstElementChild, newVNode, elementMap2);
      }
      containerElementMap.set(container, elementMap2);
    }
    return;
  }
  const patches = diff(oldVNode, newVNode);
  if (patches.length === 0) {
    return;
  }
  const elementMap = containerElementMap.get(container) || /* @__PURE__ */ new Map();
  try {
    let patchApplied = false;
    for (const patch of patches) {
      switch (patch.type) {
        case "CREATE":
          if (patch.vNode) {
            const newElement = createElement(patch.vNode);
            container.appendChild(newElement);
            patchApplied = true;
          }
          break;
        case "REMOVE":
          container.innerHTML = "";
          patchApplied = true;
          break;
        case "REPLACE":
          container.innerHTML = "";
          if (patch.vNode) {
            const newElement = createElement(patch.vNode);
            container.appendChild(newElement);
            patchApplied = true;
          }
          break;
        case "UPDATE":
          if (container.firstElementChild && patch.props && patch.newProps) {
            const vNode = elementMap.get(container.firstElementChild);
            updateAttributes(container.firstElementChild, patch.props, patch.newProps, vNode?.isSvg);
            if (patch.newProps["singultus/on-render"]) {
              patch.newProps["singultus/on-render"](container.firstElementChild);
            }
            patchApplied = true;
          }
          break;
        case "REORDER":
          if (container.firstElementChild && patch.children) {
            applyChildPatches(container.firstElementChild, patch.children, elementMap);
            if (newVNode?.props?.["singultus/on-render"]) {
              newVNode.props["singultus/on-render"](container.firstElementChild);
            }
            patchApplied = true;
          }
          break;
      }
    }
    if (patchApplied) {
      if (newVNode) {
        containerVNodeMap.set(container, newVNode);
        const newElementMap = /* @__PURE__ */ new Map();
        if (container.firstElementChild) {
          mapElementsToVNodes(container.firstElementChild, newVNode, newElementMap);
        }
        containerElementMap.set(container, newElementMap);
      } else {
        containerVNodeMap.delete(container);
        containerElementMap.delete(container);
      }
    }
  } catch (error) {
    console.warn("Patch application failed, falling back to simple render:", error);
    renderSimple(container, singultus);
    if (newVNode) {
      containerVNodeMap.set(container, newVNode);
      const elementMap2 = /* @__PURE__ */ new Map();
      if (container.firstElementChild) {
        mapElementsToVNodes(container.firstElementChild, newVNode, elementMap2);
      }
      containerElementMap.set(container, elementMap2);
    } else {
      containerVNodeMap.delete(container);
      containerElementMap.delete(container);
    }
  }
}
function renderSimple(container, singultus) {
  container.innerHTML = "";
  if (singultus == null) {
    return;
  }
  if (isNode2(singultus)) {
    container.appendChild(createElementLegacy(singultus));
  } else if (Array.isArray(singultus)) {
    for (const child of singultus) {
      if (child != null) {
        if (isNode2(child)) {
          container.appendChild(createElementLegacy(child));
        } else if (Array.isArray(child)) {
          renderSimple(container, child);
        } else {
          container.appendChild(document.createTextNode(String(child)));
        }
      }
    }
  } else {
    container.appendChild(document.createTextNode(String(singultus)));
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  applyChildPatches,
  applyPatches,
  createElement,
  createVNode,
  diff,
  render,
  renderSimple,
  updateAttributes
});
//# sourceMappingURL=index.js.map