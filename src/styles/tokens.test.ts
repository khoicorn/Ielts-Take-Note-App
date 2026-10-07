import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Vitest stubs CSS imports, so read the file from disk.
const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'index.css'), 'utf8')

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`)
  if (start < 0) throw new Error(`Missing ${selector} block`)
  const body = css.slice(start, css.indexOf('}', start))
  const tokens: Record<string, string> = {}
  for (const m of body.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})\b/gi)) tokens[m[1]] = m[2]
  return tokens
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const [r, g, b] = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const THEMES = { light: block(':root'), dark: block('[data-theme="dark"]') }
const TEXT = ['ink', 'graphite', 'indigo', 'plum', 'crimson', 'upgrade'] as const

describe('design tokens', () => {
  it('C1 text tokens meet WCAG AA in light and dark', () => {
    const failures: string[] = []
    for (const [theme, t] of Object.entries(THEMES)) {
      const check = (fg: string, bg: string) => {
        expect(t[fg], `${theme} --${fg}`).toBeDefined()
        expect(t[bg], `${theme} --${bg}`).toBeDefined()
        const ratio = contrast(t[fg], t[bg])
        if (ratio < 4.5) failures.push(`${theme}: ${fg} on ${bg} = ${ratio.toFixed(2)}:1`)
      }
      for (const fg of TEXT) {
        check(fg, 'page')
        check(fg, 'paper')
      }
      check('ink', 'stone')
      check('on-accent', 'indigo')
    }
    expect(failures).toEqual([])
  })

  it('C1b contrast helper matches known values', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2)
  })
})
