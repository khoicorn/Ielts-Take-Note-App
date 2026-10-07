import { describe, expect, it } from 'vitest'
import {
  addDays,
  dayKeyToDate,
  daysBetween,
  endOfDay,
  formatDue,
  formatInterval,
  formatLongDate,
  formatRelativeDay,
  formatShortDate,
  startOfDay,
  toDayKey,
  todayKey,
} from './dates'

describe('dates', () => {
  it('D1 formats the long date', () => {
    expect(formatLongDate(new Date(2026, 9, 7))).toBe('Wednesday, 7 October')
  })

  it('D2 formats review intervals in plain words', () => {
    expect([1, 3, 7, 14, 30, 60, 120].map(formatInterval)).toEqual([
      'Tomorrow',
      '3 days',
      '1 week',
      '2 weeks',
      '1 month',
      '2 months',
      '4 months',
    ])
    expect(formatInterval(0)).toBe('Today')
    expect(formatInterval(2)).toBe('2 days')
    expect(formatInterval(10)).toBe('1 week')
    expect(formatInterval(21)).toBe('3 weeks')
    expect(formatInterval(45)).toBe('2 months')
  })

  it('D3 formats relative days', () => {
    const now = new Date(2026, 9, 7, 15, 0)
    expect(formatRelativeDay(new Date(2026, 9, 7, 9, 0), now)).toBe('today')
    expect(formatRelativeDay(new Date(2026, 9, 6, 23, 30), now)).toBe('yesterday')
    expect(formatRelativeDay('2026-10-04', now)).toBe('3 days ago')
    expect(formatRelativeDay(new Date(2026, 8, 27, 12).toISOString(), now)).toBe('27 Sep')
  })

  it('D4 formats an unscheduled due date', () => {
    expect(formatDue(null)).toBe('Not scheduled')
  })

  it('D5 says "Due today" for a time earlier today', () => {
    const now = new Date(2026, 9, 7, 20, 0)
    expect(formatDue(new Date(2026, 9, 7, 8, 0).toISOString(), now)).toBe('Due today')
    expect(formatDue(new Date(2026, 9, 1, 8, 0).toISOString(), now)).toBe('Due today')
    expect(formatDue(new Date(2026, 9, 8, 0, 0).toISOString(), now)).toBe('Tomorrow')
    expect(formatDue(new Date(2026, 9, 12, 0, 0).toISOString(), now)).toBe('In 5 days')
    expect(formatDue(new Date(2026, 9, 30, 0, 0).toISOString(), now)).toBe('30 Oct')
  })

  it('D6 uses the local day, not the UTC day', () => {
    expect(toDayKey(new Date(2026, 9, 7, 23, 59))).toBe('2026-10-07')
    expect(toDayKey(new Date(2026, 9, 7, 0, 1))).toBe('2026-10-07')
    expect(todayKey(new Date(2026, 0, 2, 0, 0))).toBe('2026-01-02')
    expect(toDayKey('2026-10-07')).toBe('2026-10-07')
    expect(toDayKey(new Date(2026, 9, 7, 23, 59).toISOString())).toBe('2026-10-07')
  })

  it('D7 adds calendar days across a DST change', () => {
    expect(toDayKey(addDays(new Date(2026, 2, 7, 12), 1))).toBe('2026-03-08')
    expect(toDayKey(addDays(new Date(2026, 2, 8, 0), 1))).toBe('2026-03-09')
    expect(toDayKey(addDays(new Date(2026, 10, 1, 0), 1))).toBe('2026-11-02')
    expect(startOfDay(addDays(new Date(2026, 2, 7, 23, 30), 1)).getHours()).toBe(0)
    expect(toDayKey(addDays(new Date(2026, 9, 7), -7))).toBe('2026-09-30')
  })

  it('D8 counts whole days between day keys', () => {
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2)
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2)
    expect(daysBetween('2026-10-07', '2026-10-01')).toBe(-6)
  })

  it('D9 converts day keys to local midnight and back', () => {
    const d = dayKeyToDate('2026-03-08')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(2)
    expect(d.getDate()).toBe(8)
    expect(d.getHours()).toBe(0)
    expect(toDayKey(d)).toBe('2026-03-08')
  })

  it('D10 gives start and end of the local day', () => {
    const d = new Date(2026, 9, 7, 13, 45)
    expect(startOfDay(d).getTime()).toBe(new Date(2026, 9, 7).getTime())
    const e = endOfDay(d)
    expect([e.getHours(), e.getMinutes(), e.getSeconds(), e.getMilliseconds()]).toEqual([23, 59, 59, 999])
  })

  it('D11 adds the year to short dates outside this year', () => {
    const now = new Date(2026, 9, 7)
    expect(formatShortDate('2026-10-07', now)).toBe('7 Oct')
    expect(formatShortDate('2025-10-07', now)).toBe('7 Oct 2025')
    expect(formatShortDate(new Date(2026, 0, 1), now)).toBe('1 Jan')
  })
})
