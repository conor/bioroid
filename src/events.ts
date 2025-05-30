export interface EventAction {
  type: string
  data?: Record<string, any>
  // Control automatic enrichment of event data
  enrichment?: {
    includeValue?: boolean
    includeChecked?: boolean
    includeTimestamp?: boolean
    namespace?: string // Namespace for enriched data to avoid conflicts
  }
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

// Improved global state management with context isolation
interface EventSystemContext {
  dispatcher: EventDispatcher
  isInitialized: boolean
}

let currentContext: EventSystemContext = {
  dispatcher: new DefaultEventDispatcher(),
  isInitialized: false
}

export function setEventDispatcher(dispatcher: EventDispatcher): void {
  currentContext.dispatcher = dispatcher
}

export function getEventDispatcher(): EventDispatcher {
  return currentContext.dispatcher
}

// For testing and SSR support - reset the event system
export function resetEventSystem(): void {
  currentContext = {
    dispatcher: new DefaultEventDispatcher(),
    isInitialized: false
  }
}

// Store event actions on DOM elements
const EVENT_ACTIONS_KEY = '__bioroid_events__'

// Global event delegation system
const DELEGATED_EVENTS = ['click', 'input', 'change', 'submit', 'focus', 'blur', 'keydown', 'keyup', 'mousedown', 'mouseup']
const MAX_BUBBLE_DEPTH = 50 // Limit bubble traversal for performance

function initializeEventSystem() {
  if (currentContext.isInitialized) return
  
  for (const eventType of DELEGATED_EVENTS) {
    document.addEventListener(eventType, (event) => {
      let target = event.target as Element | null
      let depth = 0
      
      // Bubble up and look for event actions (with depth limit)
      while (target && target !== document.body && depth < MAX_BUBBLE_DEPTH) {
        const eventActions = (target as any)[EVENT_ACTIONS_KEY]
        if (eventActions && eventActions[eventType]) {
          const action = eventActions[eventType]
          
          // Always prevent default for data-driven events to avoid side effects
          event.preventDefault()
          
          // Apply enrichment only if requested
          const enrichedAction = enrichEventAction(action, target, event)
          
          currentContext.dispatcher.dispatch(enrichedAction)
          break // Only dispatch once per event
        }
        target = target.parentElement
        depth++
      }
    }, true) // Use capture phase for better performance
  }
  
  currentContext.isInitialized = true
}

function enrichEventAction(action: EventAction, target: Element, event: Event): EventAction {
  // Return original action if no enrichment requested
  if (!action.enrichment) {
    return action
  }
  
  const { enrichment } = action
  const namespace = enrichment.namespace || 'bioroid'
  const enrichedData: Record<string, any> = { ...action.data }
  
  // Create enrichment object under specified namespace
  const enrichmentData: Record<string, any> = {}
  
  if (enrichment.includeValue && target instanceof HTMLInputElement) {
    enrichmentData.value = target.value
  }
  
  if (enrichment.includeChecked && target instanceof HTMLInputElement) {
    enrichmentData.checked = target.checked
  }
  
  if (enrichment.includeTimestamp) {
    enrichmentData.timestamp = Date.now()
  }
  
  // Add enriched data under namespace to avoid conflicts
  if (Object.keys(enrichmentData).length > 0) {
    enrichedData[namespace] = enrichmentData
  }
  
  return {
    ...action,
    data: enrichedData
  }
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