// Screenshots of app routes at three viewports, light and dark, for visual review.
//   node scripts/screenshots.mjs [--base http://localhost:5180] [--out e2e/screenshots/foundation]
//     [--viewports desktop,tablet,mobile] [--themes light,dark] [--slices] [route ...]
// --slices also saves long pages as viewport-height pieces (name-01.png, name-02.png ...).
// Routes default to "/design" and "/". A route may carry a query, e.g. "/design?open=dialog".
// The theme is set through localStorage 'ielts-theme' before the page loads.
// --seed loads the example notes into each fresh browser profile first (dev server only: it imports
// /src/lib/repo.ts through Vite). Without it, every profile starts with an empty notebook.
// Git Bash rewrites "/design" into "C:/Program Files/Git/design"; such routes are turned back here,
// so MSYS_NO_PATHCONV=1 is no longer required.
import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = args.indexOf(name)
  if (i === -1) return fallback
  const v = args[i + 1]
  args.splice(i, 2)
  return v
}
const base = opt('--base', 'http://localhost:5180')
const outDir = resolve(root, opt('--out', 'e2e/screenshots/foundation'))
const only = opt('--viewports', '')
const themesArg = opt('--themes', 'light,dark')
const full = opt('--full', 'auto')
const flag = (name) => {
  const i = args.indexOf(name)
  if (i === -1) return false
  args.splice(i, 1)
  return true
}
const slices = flag('--slices')
const seed = flag('--seed')

/** Undoes Git Bash (MSYS) path conversion: "C:/Program Files/Git/design?x=1" → "/design?x=1". */
function unmangle(route) {
  const m = /^[A-Za-z]:[\\/](?:.*?[\\/])?Git(?:[\\/](?:usr|mingw64))?([\\/].*)?$/i.exec(route)
  if (!m) return route
  const fixed = (m[1] ?? '/').replace(/\\/g, '/')
  console.log(`note: Git Bash rewrote "${fixed}" into "${route}"; using "${fixed}"`)
  return fixed
}
const routes = (args.length ? args : ['/design', '/']).map(unmangle)

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'mobile', width: 390, height: 844 },
].filter((v) => !only || only.split(',').includes(v.name))
const THEMES = themesArg.split(',')

const slug = (route) =>
  route === '/' ? 'today' : route.replace(/^\//, '').replace(/[/?=&]+/g, '-').replace(/-+$/, '') || 'root'

await mkdir(outDir, { recursive: true })
const browser = await chromium.launch()
const problems = []
try {
  for (const theme of THEMES) {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
        colorScheme: theme === 'dark' ? 'dark' : 'light',
        reducedMotion: 'reduce',
      })
      await context.addInitScript((t) => {
        try {
          localStorage.setItem('ielts-theme', t)
        } catch {}
      }, theme)
      const page = await context.newPage()
      page.on('pageerror', (e) => problems.push(`${vp.name} ${theme}: page error: ${e.message}`))
      page.on('console', (m) => {
        if (m.type() === 'error') problems.push(`${vp.name} ${theme}: console: ${m.text()}`)
      })
      if (seed) {
        await page.goto(base + '/', { waitUntil: 'networkidle' })
        const added = await page.evaluate(async () => {
          const repo = await import(/* @vite-ignore */ '/src/lib/repo.ts')
          return (await repo.loadExampleData()).notes
        })
        if (!added) problems.push(`${vp.name} ${theme}: --seed added no notes`)
      }
      for (const route of routes) {
        await page.goto(base + route, { waitUntil: 'networkidle' })
        await page.evaluate(() => document.fonts.ready)
        await page.waitForTimeout(route.includes('open=') ? 900 : 250)
        const scrollW = await page.evaluate(() => document.documentElement.scrollWidth)
        if (scrollW > vp.width) problems.push(`${vp.name} ${theme} ${route}: horizontal scroll (${scrollW}px > ${vp.width}px)`)
        const fullPage = full === 'auto' ? !route.includes('open=') : full === 'true'
        const file = resolve(outDir, `${slug(route)}-${vp.name}-${theme}.png`)
        await page.screenshot({ path: file, fullPage })
        console.log(`saved ${file}`)
        if (slices && fullPage) {
          // Long pages also as viewport-height pieces, so details stay readable.
          // Scroll and capture the viewport, so fixed bars appear as a user sees them.
          const height = await page.evaluate(() => document.documentElement.scrollHeight)
          for (let i = 0, y = 0; y < height; i++, y += vp.height - 80) {
            await page.evaluate((top) => window.scrollTo(0, top), y)
            await page.waitForTimeout(120)
            const part = resolve(outDir, `${slug(route)}-${vp.name}-${theme}-${String(i + 1).padStart(2, '0')}.png`)
            await page.screenshot({ path: part })
            if (y + vp.height >= height) break
          }
          await page.evaluate(() => window.scrollTo(0, 0))
        }
      }
      await context.close()
    }
  }
} finally {
  await browser.close()
}
if (problems.length) {
  console.log('\nProblems:')
  for (const p of problems) console.log(' - ' + p)
}
