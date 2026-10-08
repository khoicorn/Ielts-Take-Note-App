import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { DocumentTitle, formatDocumentTitle, routeTitle, useDocumentTitle } from './documentTitle'

function Named(props: { name: string | null }): null {
  useDocumentTitle(props.name)
  return null
}

describe('document title', () => {
  it('T1 names every route', () => {
    expect(routeTitle('/')).toBe('Today')
    expect(routeTitle('/review')).toBe('Review')
    expect(routeTitle('/mistakes/')).toBe('My Mistakes')
    expect(routeTitle('/notes')).toBe('All Notes')
    expect(routeTitle('/notes/abc')).toBe('Note')
    expect(routeTitle('/writing/paragraphs/p1')).toBe('Model paragraph')
    expect(routeTitle('/nowhere')).toBe('Page not found')
    expect(formatDocumentTitle('Today')).toBe('Today · Upgrade Notebook')
    expect(formatDocumentTitle('  ')).toBe('IELTS Upgrade Notebook')
    expect(formatDocumentTitle('x'.repeat(80))).toBe(`${'x'.repeat(59)}… · Upgrade Notebook`)
  })

  it('T2 sets the tab title per route; a screen name wins while it is mounted', () => {
    const view = render(
      <MemoryRouter initialEntries={['/must-remember']}>
        <DocumentTitle />
      </MemoryRouter>,
    )
    expect(document.title).toBe('Must Remember · Upgrade Notebook')
    view.rerender(
      <MemoryRouter initialEntries={['/must-remember']}>
        <DocumentTitle />
        <Named name="The scenery was beautiful." />
      </MemoryRouter>,
    )
    expect(document.title).toBe('The scenery was beautiful. · Upgrade Notebook')
    view.rerender(
      <MemoryRouter initialEntries={['/must-remember']}>
        <DocumentTitle />
        <Named name={null} />
      </MemoryRouter>,
    )
    expect(document.title).toBe('Must Remember · Upgrade Notebook')
  })
})
