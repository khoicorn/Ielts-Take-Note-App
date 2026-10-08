import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Vitest globals are off, so Testing Library cannot register its own cleanup.
// Without this, rendered trees and portals (dialogs, toasts) leak into the next test.
afterEach(cleanup)

// Screens load their data from IndexedDB before they render. With 40+ test files in parallel (and on
// slower CI machines), that first render can take longer than Testing Library's 1s default.
configure({ asyncUtilTimeout: 5000 })
// Screen tests click through several async steps. A quiet run needs 0.1–4s per test; under full parallel
// load the slowest reach about 16s, so allow 30s to keep the deploy gate from failing on machine speed.
vi.setConfig({ testTimeout: 30_000 })
