/**
 * Keeps keyboard focus in place when the focused row leaves a list (Restore on the archive, unmark on Must Remember).
 * Call it before the change and call the returned function after it. Focus moves to the next row's first link,
 * else the previous row's, else the page heading. Nothing moves when focus was not inside the row.
 */
export function keepFocusAfterRemoval(itemSelector: string): () => void {
  const active = document.activeElement
  const row = active instanceof HTMLElement ? active.closest(itemSelector) : null
  if (!row) return () => {}
  const items = [...document.querySelectorAll(itemSelector)]
  const i = items.indexOf(row)
  const neighbor = items[i + 1] ?? items[i - 1]
  const target = neighbor?.querySelector<HTMLElement>('a[href]') ?? null
  return () => {
    const now = document.activeElement
    // The person moved on (clicked or tabbed elsewhere): leave focus alone.
    if (now && now !== document.body && !row.contains(now)) return
    if (target?.isConnected) {
      target.focus()
      return
    }
    focusPageHeading()
  }
}

/** The page title takes focus when the list is empty, so a screen reader keeps its place on the page. */
function focusPageHeading(): void {
  const heading = document.querySelector<HTMLElement>('#main h1') ?? document.querySelector<HTMLElement>('h1')
  if (!heading) return
  if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1')
  heading.focus()
}
