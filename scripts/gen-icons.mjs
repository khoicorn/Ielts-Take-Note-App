// Renders public/favicon.svg to the PWA icons with Playwright's bundled Chromium.
//   node scripts/gen-icons.mjs
// Output: public/icons/icon-192.png, icon-512.png, icon-maskable-512.png
// The maskable icon fills the square with the background color and scales the mark into the
// safe zone (the inner 80% circle), so Android can crop it to any shape.
import { mkdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const svg = await readFile(resolve(root, 'public/favicon.svg'), 'utf8')

const bg = svg.match(/<rect[^>]*id="bg"[^>]*fill="([^"]+)"[^>]*\/>/)
if (!bg) throw new Error('public/favicon.svg needs <rect id="bg" ... fill="#..."/> as its background.')
const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(bg[0], '')

const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${bg[1]}"/><g transform="translate(32 32) scale(0.72) translate(-32 -32)">${inner}</g></svg>`

const targets = [
  { file: 'icon-192.png', size: 192, markup: svg },
  { file: 'icon-512.png', size: 512, markup: svg },
  { file: 'icon-maskable-512.png', size: 512, markup: maskable },
]

await mkdir(resolve(root, 'public/icons'), { recursive: true })
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 })
  for (const t of targets) {
    await page.setViewportSize({ width: t.size, height: t.size })
    const src = `data:image/svg+xml;base64,${Buffer.from(t.markup).toString('base64')}`
    await page.setContent(
      `<!doctype html><html><body style="margin:0;background:transparent"><img id="i" src="${src}" width="${t.size}" height="${t.size}" style="display:block"></body></html>`,
    )
    await page.waitForFunction(() => {
      const img = document.getElementById('i')
      return img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0
    })
    const out = resolve(root, 'public/icons', t.file)
    await page.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: t.size, height: t.size } })
    console.log(`wrote public/icons/${t.file} (${t.size}x${t.size})`)
  }
} finally {
  await browser.close()
}
