import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { GlobalHotkeys } from './GlobalHotkeys'
import { OverlayProvider, useQuickAdd, useSearch } from './overlays'

function Probe() {
  const search = useSearch()
  const quickAdd = useQuickAdd()
  return (
    <>
      <input aria-label="Field" />
      <output aria-label="state">{`search:${search.isOpen} add:${quickAdd.isOpen}`}</output>
    </>
  )
}

function setup() {
  render(
    <MemoryRouter>
      <OverlayProvider>
        <GlobalHotkeys />
        <Probe />
      </OverlayProvider>
    </MemoryRouter>,
  )
  return screen.getByLabelText('Field')
}

describe('GlobalHotkeys', () => {
  it('H6 Ctrl+K opens search while typing in a text field; N and / do not', () => {
    const field = setup()
    act(() => field.focus())
    fireEvent.keyDown(field, { key: 'n' })
    fireEvent.keyDown(field, { key: '/' })
    expect(screen.getByLabelText('state')).toHaveTextContent('search:false add:false')
    fireEvent.keyDown(field, { key: 'k', ctrlKey: true })
    expect(screen.getByLabelText('state')).toHaveTextContent('search:true add:false')
  })

  it('H7 N and Ctrl+K do nothing while a popover or menu is open', () => {
    setup()
    const layer = document.createElement('div')
    layer.setAttribute('data-floating', '')
    layer.tabIndex = -1
    document.body.appendChild(layer)
    act(() => layer.focus())
    fireEvent.keyDown(layer, { key: 'n' })
    fireEvent.keyDown(layer, { key: 'k', ctrlKey: true })
    expect(screen.getByLabelText('state')).toHaveTextContent('search:false add:false')
    layer.remove()
    fireEvent.keyDown(document.body, { key: '/' })
    expect(screen.getByLabelText('state')).toHaveTextContent('search:true add:false')
  })
})
