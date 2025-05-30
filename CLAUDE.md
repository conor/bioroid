# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run build` - Build the library using tsup (outputs to dist/)
- `npm run dev` - Build in watch mode for development
- `npm run test` - Run all tests with Vitest
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Lint TypeScript files with ESLint
- `npm run typecheck` - Type check without emitting files
- `npm run example` - Build and serve example on port 8000

## Architecture Overview

**Bioroid** is a TypeScript library that emulates Clojure's Replicant for Hiccup-style markup rendering. It implements a virtual DOM with efficient diffing and patching.

### Core Components

- **Singultus System** (`singultus.ts`): Main rendering engine that converts Hiccup-style markup to DOM elements
- **Virtual DOM** (`vdom.ts`): Creates virtual node representations from Singultus elements, handles SVG detection and CSS selector parsing (e.g., `div#id.class`)
- **Diffing Algorithm** (`diff.ts`): Performant virtual DOM diffing that generates patches for DOM updates
- **Patching System** (`patch.ts`): Applies patches to real DOM elements, handles attribute updates and child reordering

### Data Flow

1. Hiccup markup � `createVNode()` � Virtual DOM tree
2. Old/new VNodes � `diff()` � Patch operations  
3. Patches � `applyPatches()` � DOM updates

### Key Features

- **Hiccup Syntax**: `['tag#id.class', {props}, ...children]` format
- **SVG Support**: Automatic SVG namespace handling for SVG elements
- **CSS Selectors**: Tag names support CSS-style selectors for id/class
- **Event Handling**: Supports both function-based events and data-driven event actions
- **Event Delegation**: React-style global event delegation for data-driven events
- **Special Props**: `singultus/key` for reconciliation, `singultus/on-render` for lifecycle
- **Efficient Updates**: Virtual DOM diffing minimizes actual DOM manipulation

### Event System

**Data-Driven Events**: Use `{ type: 'ACTION_NAME', data: { ... } }` instead of functions for events. This follows Replicant's philosophy of data-driven architecture.

Example:
```javascript
['button', { 
  on: { 
    click: { type: 'BUTTON_CLICKED', data: { buttonId: 'submit' } }
  }
}, 'Submit']
```

**Event Dispatcher**: Set up a global event dispatcher to handle all actions:
```javascript
import { getEventDispatcher } from 'bioroid'
getEventDispatcher().subscribe(action => {
  console.log('Action dispatched:', action)
})
```

### Testing

Tests use Vitest with jsdom environment. Test files follow `*.test.ts` pattern and test both rendering logic, diffing performance, and event delegation.