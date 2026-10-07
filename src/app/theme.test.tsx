import { act, render, screen, cleanup } from '@testing-library/react'
import { beforeEach, describe, expect, it, afterEach } from 'vitest'
import { ThemeProvider, useTheme } from './theme'
afterEach(cleanup)

function Probe() {
  const { preference, resolved, setPreference } = useTheme()
  return (
    <div>
      <span data-testid="pref">{preference}</span>
      <span data-testid="resolved">{resolved}</span>
      <button type="button" onClick={() => setPreference('dark')}>
        Dark
      </button>
      <button type="button" onClick={() => setPreference('light')}>
        Light
      </button>
    </div>
  )
}

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.setAttribute('data-theme', 'light')
    document.head.innerHTML = '<meta name="theme-color" content="#F5F1E8" />'
  })

  it('Y1 setPreference("dark") sets data-theme="dark" and localStorage "ielts-theme"', async () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    await act(async () => {
      screen.getByRole('button', { name: 'Dark' }).click()
    })
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(localStorage.getItem('ielts-theme')).toBe('dark')
    expect(screen.getByTestId('pref')).toHaveTextContent('dark')
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark')
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#141319')

    await act(async () => {
      screen.getByRole('button', { name: 'Light' }).click()
    })
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(localStorage.getItem('ielts-theme')).toBe('light')
  })

  it('Y1 reads the saved preference on start', () => {
    localStorage.setItem('ielts-theme', 'dark')
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('pref')).toHaveTextContent('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })
})
