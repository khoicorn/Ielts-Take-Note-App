/** The notebook list views (All Notes, Speaking, Writing). */
export type ListView = 'compact' | 'reading'
export const LIST_VIEWS: readonly ListView[] = ['compact', 'reading']

export { DESKTOP_QUERY, MOBILE_QUERY, useMediaQuery, useStoredChoice } from '@/components/ui/uiState'
