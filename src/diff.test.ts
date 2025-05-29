import { describe, it, expect, beforeEach } from 'vitest'
import { render } from './singultus'

describe('Virtual DOM Diffing', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  it('handles first render without diffing', () => {
    render(container, ['div', 'Hello World'])
    expect(container.innerHTML).toBe('<div>Hello World</div>')
  })

  it('efficiently updates text content', () => {
    render(container, ['div', 'Hello'])
    render(container, ['div', 'World'])
    
    expect(container.innerHTML).toBe('<div>World</div>')
    expect(container.children.length).toBe(1)
  })

  it('efficiently updates attributes', () => {
    render(container, ['div', { class: 'old' }, 'Content'])
    const element = container.firstElementChild!
    
    render(container, ['div', { class: 'new' }, 'Content'])
    
    expect(container.firstElementChild).toBe(element) // Same element
    expect(element.className).toBe('new')
  })

  it('preserves element identity for keyed elements', () => {
    render(container, ['ul',
      ['li', { 'singultus/key': 'a' }, 'Item A'],
      ['li', { 'singultus/key': 'b' }, 'Item B']
    ])
    
    const itemA = container.querySelector('li:first-child')!
    const itemB = container.querySelector('li:last-child')!
    
    // Reorder items
    render(container, ['ul',
      ['li', { 'singultus/key': 'b' }, 'Item B'],
      ['li', { 'singultus/key': 'a' }, 'Item A']
    ])
    
    // Elements should be the same objects, just reordered
    expect(container.querySelector('li:first-child')).toBe(itemB)
    expect(container.querySelector('li:last-child')).toBe(itemA)
  })

  it('efficiently adds new elements', () => {
    render(container, ['div', 'First'])
    render(container, ['div', 'First', ['p', 'Second']])
    
    expect(container.innerHTML).toBe('<div>First<p>Second</p></div>')
  })

  it('efficiently removes elements', () => {
    render(container, ['div', 'First', ['p', 'Second']])
    render(container, ['div', 'First'])
    
    expect(container.innerHTML).toBe('<div>First</div>')
  })

  it('handles complex nested updates', () => {
    render(container, ['div',
      ['h1', 'Title'],
      ['ul',
        ['li', { 'singultus/key': '1' }, 'Item 1'],
        ['li', { 'singultus/key': '2' }, 'Item 2']
      ]
    ])
    
    const title = container.querySelector('h1')!
    const list = container.querySelector('ul')!
    
    render(container, ['div',
      ['h1', 'Updated Title'],
      ['ul',
        ['li', { 'singultus/key': '2' }, 'Item 2 Updated'],
        ['li', { 'singultus/key': '1' }, 'Item 1'],
        ['li', { 'singultus/key': '3' }, 'Item 3']
      ]
    ])
    
    // Structure should be preserved
    expect(container.querySelector('h1')).toBe(title)
    expect(container.querySelector('ul')).toBe(list)
    expect(title.textContent).toBe('Updated Title')
    expect(list.children.length).toBe(3)
  })

  it('preserves form input state during updates', () => {
    render(container, ['form',
      ['input', { type: 'text', value: 'initial' }],
      ['p', 'Version 1']
    ])
    
    const input = container.querySelector('input') as HTMLInputElement
    input.value = 'user typed text'
    
    // Update only the paragraph
    render(container, ['form',
      ['input', { type: 'text', value: 'initial' }],
      ['p', 'Version 2']
    ])
    
    // Input value should be preserved by DOM
    expect(container.querySelector('input')).toBe(input)
    expect((container.querySelector('p')!).textContent).toBe('Version 2')
  })

  it('handles style object updates efficiently', () => {
    render(container, ['div', { 
      style: { color: 'red', fontSize: '16px' } 
    }, 'Styled'])
    
    const element = container.firstElementChild as HTMLElement
    
    render(container, ['div', { 
      style: { color: 'blue', fontSize: '16px' } 
    }, 'Styled'])
    
    expect(container.firstElementChild).toBe(element)
    expect(element.style.color).toBe('blue')
    expect(element.style.fontSize).toBe('16px')
  })

  it('handles event listener updates', () => {
    let clicked1 = false
    let clicked2 = false
    
    render(container, ['button', {
      on: { click: () => { clicked1 = true } }
    }, 'Click me'])
    
    const button = container.querySelector('button')!
    
    render(container, ['button', {
      on: { click: () => { clicked2 = true } }
    }, 'Click me'])
    
    expect(container.querySelector('button')).toBe(button)
    
    button.click()
    expect(clicked1).toBe(false) // Old handler should be removed
    expect(clicked2).toBe(true)  // New handler should work
  })

  it('calls lifecycle hooks on updates', () => {
    let renderCount = 0
    let lastElement: Element | null = null
    
    const onRender = (el: Element) => {
      renderCount++
      lastElement = el
    }
    
    render(container, ['div', { 'singultus/on-render': onRender }, 'First'])
    expect(renderCount).toBe(1)
    
    render(container, ['div', { 'singultus/on-render': onRender }, 'Second'])
    expect(renderCount).toBe(2)
    expect(lastElement).toBe(container.firstElementChild)
  })

  it('handles mixed keyed and non-keyed elements', () => {
    render(container, ['div',
      ['p', 'Static 1'],
      ['span', { 'singultus/key': 'dynamic' }, 'Dynamic'],
      ['p', 'Static 2']
    ])
    
    const span = container.querySelector('span')!
    
    render(container, ['div',
      ['p', 'Static 1 Updated'],
      ['span', { 'singultus/key': 'dynamic' }, 'Dynamic Updated'],
      ['p', 'Static 2 Updated']
    ])
    
    expect(container.querySelector('span')).toBe(span)
    expect(span.textContent).toBe('Dynamic Updated')
  })

  it('handles SVG elements correctly', () => {
    render(container, ['svg', { width: 100, height: 100 },
      ['circle', { cx: 50, cy: 50, r: 25, fill: 'red' }]
    ])
    
    const svg = container.querySelector('svg')!
    const circle = container.querySelector('circle')!
    
    render(container, ['svg', { width: 100, height: 100 },
      ['circle', { cx: 50, cy: 50, r: 30, fill: 'blue' }]
    ])
    
    expect(container.querySelector('svg')).toBe(svg)
    expect(container.querySelector('circle')).toBe(circle)
    expect(circle.getAttribute('r')).toBe('30')
    expect(circle.getAttribute('fill')).toBe('blue')
  })
})