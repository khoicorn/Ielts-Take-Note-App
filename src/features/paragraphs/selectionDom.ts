/**
 * Maps between the DOM selection inside a rendered paragraph body and offsets in its plain text.
 * Every text run in the body is a leaf element with `data-o` (its start offset) holding one text node.
 */
import type { TextRange } from './paragraphText'
import { trimRange } from './paragraphText'

const LEAF = '[data-o]'

function leavesIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(LEAF))
}

function startOf(leaf: HTMLElement): number {
  return Number(leaf.dataset.o) || 0
}

/** Plain-text offset of a DOM boundary point inside `root`. */
function offsetOf(root: HTMLElement, node: Node, offset: number, textLength: number): number {
  if (node.nodeType === Node.TEXT_NODE) {
    const leaf = node.parentElement?.closest<HTMLElement>(LEAF)
    if (leaf && root.contains(leaf)) return startOf(leaf) + Math.min(offset, node.textContent?.length ?? 0)
  }
  // An element boundary (a double-click can select a whole element): the first leaf at or after it.
  const point = document.createRange()
  point.setStart(node, offset)
  for (const leaf of leavesIn(root)) {
    if (point.comparePoint(leaf, 0) >= 0) return startOf(leaf)
  }
  return textLength
}

/** The current selection inside `root`, trimmed. Null when nothing in the body is selected. */
export function readSelection(root: HTMLElement, text: string): TextRange | null {
  const sel = typeof document.getSelection === 'function' ? document.getSelection() : null
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null
  const range = sel.getRangeAt(0)
  if (!range.intersectsNode(root)) return null
  const start = root.contains(range.startContainer)
    ? offsetOf(root, range.startContainer, range.startOffset, text.length)
    : 0
  const end = root.contains(range.endContainer) ? offsetOf(root, range.endContainer, range.endOffset, text.length) : text.length
  return trimRange(text, start, end)
}

/** The live DOM range of the selection, when it touches `root`. */
export function liveRange(root: HTMLElement): Range | null {
  const sel = typeof document.getSelection === 'function' ? document.getSelection() : null
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null
  const range = sel.getRangeAt(0)
  return range.intersectsNode(root) ? range : null
}

function pointAt(root: HTMLElement, offset: number, side: 'start' | 'end'): [Node, number] | null {
  let last: [Node, number] | null = null
  for (const leaf of leavesIn(root)) {
    const t = leaf.firstChild
    if (!t || t.nodeType !== Node.TEXT_NODE) continue
    const s = startOf(leaf)
    const len = t.textContent?.length ?? 0
    const inside = side === 'start' ? offset >= s && offset < s + len : offset > s && offset <= s + len
    if (inside) return [t, offset - s]
    if (s > offset && !last) return [t, 0]
    last = [t, len]
  }
  return last
}

/** Selects [start, end) of the plain text in the DOM, the way a mouse drag would. */
export function selectOffsets(root: HTMLElement, start: number, end: number): void {
  const sel = typeof document.getSelection === 'function' ? document.getSelection() : null
  const a = pointAt(root, start, 'start')
  const b = pointAt(root, end, 'end')
  if (!sel || !a || !b) return
  const range = document.createRange()
  range.setStart(a[0], a[1])
  range.setEnd(b[0], b[1])
  sel.removeAllRanges()
  sel.addRange(range)
}

export function clearSelection(): void {
  const sel = typeof document.getSelection === 'function' ? document.getSelection() : null
  sel?.removeAllRanges()
}

/** Line boxes of a range. Empty where layout is not available (tests). */
export function rangeRects(range: Range | null): DOMRect[] {
  if (!range || typeof range.getClientRects !== 'function') return []
  return Array.from(range.getClientRects()).filter((r) => r.width > 0 || r.height > 0)
}
