export interface EventAction {
  type: string
  data?: Record<string, any>
}

export interface EventDispatcher {
  dispatch(action: EventAction): void
  subscribe(handler: (action: EventAction) => void): () => void
}

export class DefaultEventDispatcher implements EventDispatcher {
  private handlers: Set<(action: EventAction) => void> = new Set()

  dispatch(action: EventAction): void {
    for (const handler of this.handlers) {
      handler(action)
    }
  }

  subscribe(handler: (action: EventAction) => void): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }
}

let globalDispatcher: EventDispatcher = new DefaultEventDispatcher()

export function setEventDispatcher(dispatcher: EventDispatcher): void {
  globalDispatcher = dispatcher
}

export function getEventDispatcher(): EventDispatcher {
  return globalDispatcher
}

// Store event actions on DOM elements
const EVENT_ACTIONS_KEY = '__bioroid_events__'

// Global event delegation system
let isEventSystemInitialized = false
const DELEGATED_EVENTS = ['click', 'input', 'change', 'submit', 'focus', 'blur', 'keydown', 'keyup', 'mousedown', 'mouseup']

function initializeEventSystem() {
  if (isEventSystemInitialized) return
  
  for (const eventType of DELEGATED_EVENTS) {
    document.addEventListener(eventType, (event) => {
      let target = event.target as Element | null
      
      // Bubble up and look for event actions
      while (target && target !== document.body) {
        const eventActions = (target as any)[EVENT_ACTIONS_KEY]
        if (eventActions && eventActions[eventType]) {
          const action = eventActions[eventType]
          
          // Always prevent default for data-driven events to avoid side effects
          event.preventDefault()
          
          const enrichedAction: EventAction = {
            ...action,
            data: {
              ...action.data,
              value: target instanceof HTMLInputElement ? target.value : undefined,
              checked: target instanceof HTMLInputElement ? target.checked : undefined,
              timestamp: Date.now()
            }
          }
          
          globalDispatcher.dispatch(enrichedAction)
          break // Only dispatch once per event
        }
        target = target.parentElement
      }
    }, true) // Use capture phase for better performance
  }
  
  isEventSystemInitialized = true
}

export function attachEventAction(element: Element, eventType: string, action: EventAction): void {
  initializeEventSystem()
  
  if (!(element as any)[EVENT_ACTIONS_KEY]) {
    (element as any)[EVENT_ACTIONS_KEY] = {}
  }
  
  (element as any)[EVENT_ACTIONS_KEY][eventType] = action
}

export function removeEventAction(element: Element, eventType: string): void {
  const eventActions = (element as any)[EVENT_ACTIONS_KEY]
  if (eventActions) {
    delete eventActions[eventType]
    
    // Clean up if no events left
    if (Object.keys(eventActions).length === 0) {
      delete (element as any)[EVENT_ACTIONS_KEY]
    }
  }
}