import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, afterEach } from 'vitest'
import { Combobox } from './Combobox'
afterEach(cleanup)

const TOPICS = ['Travel', 'Food', 'Transport', 'Work']

describe('Combobox', { timeout: 15_000 }, () => {
  it('B1 typing filters options and Enter selects the active one', async () => {
    const user = userEvent.setup({ delay: null })
    const onChange = vi.fn()
    render(<Combobox id="topic" aria-label="Topic" value="" onChange={onChange} options={TOPICS} />)
    const input = screen.getByRole('combobox', { name: 'Topic' })
    await user.click(input)
    await user.type(input, 'tra')
    const names = screen.getAllByRole('option').map((o) => o.textContent)
    expect(names).toEqual(['Travel', 'Transport'])
    expect(input).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard('{ArrowDown}')
    // The active option carries a visible left bar, not only a faint tint.
    const active = screen.getByRole('option', { name: 'Transport' })
    expect(active).toHaveAttribute('aria-selected', 'true')
    expect(active).toHaveClass('before:bg-brass', 'before:w-0.5')
    expect(screen.getByRole('option', { name: 'Travel' })).not.toHaveClass('before:bg-brass')
    await user.keyboard('{Enter}')
    expect(onChange).toHaveBeenLastCalledWith('Transport')
    expect(input).toHaveAttribute('aria-expanded', 'false')
  })

  it('B1 allowCreate offers “Use “Foo”” and accepts free text', async () => {
    const user = userEvent.setup({ delay: null })
    const onChange = vi.fn()
    render(<Combobox id="topic" aria-label="Topic" value="" onChange={onChange} options={TOPICS} allowCreate />)
    const input = screen.getByRole('combobox', { name: 'Topic' })
    await user.click(input)
    await user.type(input, 'Foo')
    const options = screen.getAllByRole('option').map((o) => o.textContent)
    expect(options).toEqual(['Food', 'Use “Foo”'])
    await user.click(screen.getByRole('option', { name: 'Use “Foo”' }))
    expect(onChange).toHaveBeenLastCalledWith('Foo')
  })

  it('B1 without allowCreate there is no create option, and Esc closes the list', async () => {
    const user = userEvent.setup({ delay: null })
    render(<Combobox id="topic" aria-label="Topic" value="" onChange={() => {}} options={TOPICS} />)
    const input = screen.getByRole('combobox', { name: 'Topic' })
    await user.click(input)
    await user.type(input, 'Foo')
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Food'])
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
