import { describe, it, expect, beforeEach } from 'vitest'
import { render } from './singultus'

describe('Bioroid Singultus', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  it('renders simple text', () => {
    render(container, 'Hello World')
    expect(container.textContent).toBe('Hello World')
  })

  it('renders simple tag', () => {
    render(container, ['div', 'Hello'])
    expect(container.innerHTML).toBe('<div>Hello</div>')
  })

  it('renders tag with attributes', () => {
    render(container, ['div', { id: 'test', class: 'container' }, 'Hello'])
    expect(container.innerHTML).toBe('<div class="container" id="test">Hello</div>')
  })

  it('renders tag with CSS selector syntax', () => {
    render(container, ['div#main.container.active', 'Hello'])
    expect(container.innerHTML).toBe('<div id="main" class="container active">Hello</div>')
  })

  it('renders nested elements', () => {
    render(container, ['div', ['p', 'Paragraph'], ['span', 'Span']])
    expect(container.innerHTML).toBe('<div><p>Paragraph</p><span>Span</span></div>')
  })

  it('renders with style object', () => {
    render(container, ['div', { style: { color: 'red', fontSize: '16px' } }, 'Styled'])
    const div = container.querySelector('div') as HTMLElement
    expect(div.style.color).toBe('red')
    expect(div.style.fontSize).toBe('16px')
  })

  it('renders with style string', () => {
    render(container, ['div', { style: 'color: blue; font-size: 14px;' }, 'Styled'])
    expect(container.innerHTML).toBe('<div style="color: blue; font-size: 14px;">Styled</div>')
  })

  it('handles null and undefined children', () => {
    render(container, ['div', null, 'Hello', undefined, 'World'])
    expect(container.innerHTML).toBe('<div>HelloWorld</div>')
  })

  it('renders arrays of elements', () => {
    render(container, [
      ['h1', 'Title'],
      ['p', 'First paragraph'],
      ['p', 'Second paragraph']
    ])
    expect(container.innerHTML).toBe('<h1>Title</h1><p>First paragraph</p><p>Second paragraph</p>')
  })

  it('renders complex nested structures correctly', () => {
    render(container, ['div.container',
      ['div.card',
        ['h2', 'Test'],
        ['ul',
          ['li', 'First item'],
          ['li', 'Second item'],
          ['li.special', { style: { color: 'red' } }, 'Special item']
        ]
      ]
    ])
    
    const ul = container.querySelector('ul')
    expect(ul?.children.length).toBe(3)
    expect(ul?.children[0].textContent).toBe('First item')
    expect(ul?.children[1].textContent).toBe('Second item')
    expect(ul?.children[2].textContent).toBe('Special item')
    expect((ul?.children[2] as HTMLElement).style.color).toBe('red')
  })

  it('handles innerHTML attribute', () => {
    render(container, ['div', { innerHTML: '<strong>Bold</strong>' }])
    expect(container.innerHTML).toBe('<div><strong>Bold</strong></div>')
  })

  it('handles form input values', () => {
    render(container, ['input', { type: 'text', value: 'test value' }])
    const input = container.querySelector('input') as HTMLInputElement
    expect(input.value).toBe('test value')
  })

  it('handles checkbox checked state', () => {
    render(container, ['input', { type: 'checkbox', checked: true }])
    const input = container.querySelector('input') as HTMLInputElement
    expect(input.checked).toBe(true)
  })

  it('calls lifecycle hook', () => {
    let calledElement: Element | null = null
    
    render(container, ['div', { 
      'singultus/on-render': (el: Element) => { calledElement = el }
    }, 'Test'])
    
    expect(calledElement).toBeTruthy()
    expect(calledElement?.tagName).toBe('DIV')
  })

  it('handles event listeners', () => {
    let clicked = false
    
    render(container, ['button', { 
      on: { 
        click: () => { clicked = true }
      }
    }, 'Click me'])
    
    const button = container.querySelector('button')!
    button.click()
    expect(clicked).toBe(true)
  })

  it('handles boolean attributes correctly', () => {
    render(container, ['input', { type: 'text', disabled: true, required: false }])
    const input = container.querySelector('input') as HTMLInputElement
    expect(input.hasAttribute('disabled')).toBe(true)
    expect(input.hasAttribute('required')).toBe(false)
    expect(input.disabled).toBe(true)
  })

  it('handles DOM properties vs attributes', () => {
    render(container, ['input', { type: 'text', value: 'test', tabIndex: 5 }])
    const input = container.querySelector('input') as HTMLInputElement
    expect(input.value).toBe('test')
    expect(input.tabIndex).toBe(5)
  })

  it('handles data attributes', () => {
    render(container, ['div', { 'data-test': 'value', 'data-number': 42 }])
    const div = container.querySelector('div')!
    expect(div.getAttribute('data-test')).toBe('value')
    expect(div.getAttribute('data-number')).toBe('42')
  })

  it('handles aria attributes', () => {
    render(container, ['button', { 'aria-label': 'Close dialog', 'aria-expanded': 'false' }])
    const button = container.querySelector('button')!
    expect(button.getAttribute('aria-label')).toBe('Close dialog')
    expect(button.getAttribute('aria-expanded')).toBe('false')
  })

  it('handles textContent attribute', () => {
    render(container, ['div', { textContent: 'Plain text <b>not bold</b>' }])
    expect(container.textContent).toBe('Plain text <b>not bold</b>')
    expect(container.innerHTML).toBe('<div>Plain text &lt;b&gt;not bold&lt;/b&gt;</div>')
  })

  it('removes boolean attributes when false', () => {
    render(container, ['input', { type: 'checkbox', checked: true }])
    let input = container.querySelector('input') as HTMLInputElement
    expect(input.checked).toBe(true)
    
    render(container, ['input', { type: 'checkbox', checked: false }])
    input = container.querySelector('input') as HTMLInputElement
    expect(input.checked).toBe(false)
    expect(input.hasAttribute('checked')).toBe(false)
  })

  it('handles null/undefined attribute values', () => {
    render(container, ['div', { title: null, 'data-test': undefined, id: 'test' }])
    const div = container.querySelector('div')!
    expect(div.hasAttribute('title')).toBe(false)
    expect(div.hasAttribute('data-test')).toBe(false)
    expect(div.id).toBe('test')
  })

  it('creates SVG elements with proper namespace', () => {
    render(container, ['svg', { width: 100, height: 100 },
      ['circle', { cx: 50, cy: 50, r: 40, fill: 'red' }]
    ])
    
    const svg = container.querySelector('svg')!
    const circle = container.querySelector('circle')!
    expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg')
    expect(circle.namespaceURI).toBe('http://www.w3.org/2000/svg')
    expect(circle.getAttribute('fill')).toBe('red')
  })

  it('handles form elements with proper properties', () => {
    render(container, ['select', { multiple: true, disabled: false },
      ['option', { value: '1', selected: true }, 'Option 1'],
      ['option', { value: '2', selected: false }, 'Option 2']
    ])
    
    const select = container.querySelector('select') as HTMLSelectElement
    const options = container.querySelectorAll('option') as NodeListOf<HTMLOptionElement>
    
    expect(select.multiple).toBe(true)
    expect(select.disabled).toBe(false)
    expect(options[0].selected).toBe(true)
    expect(options[1].selected).toBe(false)
  })
})