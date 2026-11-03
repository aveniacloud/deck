/**
 * SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { describe, expect, it } from '@jest/globals'
import { describeFilter, filterParts, filtersEqual } from './boardFilter.js'

const board = {
	labels: [
		{ id: 1, title: 'Finished' },
		{ id: 2, title: 'To review' },
		{ id: 3, title: 'Later' },
	],
	users: [
		{ uid: 'alice', displayname: 'Alice' },
		{ uid: 'bob', displayname: 'Bob' },
	],
}

const empty = { tags: [], tagMatch: 'all', excludedTags: [], users: [], userMatch: 'any', excludedUsers: [], due: '', dueFrom: '', dueTo: '', unassigned: false, completed: 'both' }
const currentPeriod = (due) => (due === 'calendarWeek' ? { from: '2026-11-02', to: '2026-11-08' } : { from: '2026-11-01', to: '2026-11-30' })

describe('describeFilter', () => {
	it('joins tags with "or" for any and "and" for all', () => {
		expect(describeFilter({ ...empty, tags: [1, 2], tagMatch: 'any' }, board, 'en')).toBe('Finished or To review')
		expect(describeFilter({ ...empty, tags: [1, 2] }, board, 'en')).toBe('Finished and To review')
	})

	it('joins users the other way round by default', () => {
		expect(describeFilter({ ...empty, users: ['alice', 'bob'] }, board, 'en')).toBe('Alice or Bob')
		expect(describeFilter({ ...empty, users: ['alice', 'bob'], userMatch: 'all' }, board, 'en')).toBe('Alice and Bob')
	})

	it('describes every part of a combined filter in order', () => {
		const filter = { ...empty, tags: [1], excludedTags: [3], excludedUsers: ['bob'], completed: 'open', due: 'calendarWeek' }
		expect(describeFilter(filter, board, 'en')).toBe('Finished · without Later and Bob · Open · Current week')
	})

	it('describes custom ranges with open ends', () => {
		// Intl puts thin spaces around the dash of a range
		expect(describeFilter({ ...empty, due: 'range', dueFrom: '2026-11-02', dueTo: '2026-11-15' }, board, 'en').replace(/\s/g, ' ')).toBe('Nov 2 – 15, 2026')
		expect(describeFilter({ ...empty, due: 'range', dueFrom: '2026-11-02' }, board, 'en')).toBe('Due from Nov 2, 2026')
		expect(describeFilter({ ...empty, due: 'range', dueTo: '2026-11-15' }, board, 'en')).toBe('Due until Nov 15, 2026')
	})

	it('mentions included overdue cards for periods', () => {
		expect(describeFilter({ ...empty, due: 'calendarWeek', dueIncludeOverdue: true }, board, 'en')).toBe('Current week, including overdue')
		// irrelevant for fixed periods, where it cannot be switched on
		expect(describeFilter({ ...empty, due: 'dueWeek', dueIncludeOverdue: true }, board, 'en')).toBe('Next 7 days')
	})

	it('skips tags that no longer exist on the board', () => {
		expect(describeFilter({ ...empty, tags: [1, 99], tagMatch: 'any' }, board, 'en')).toBe('Finished')
	})

	it('uses the locale for lists', () => {
		expect(describeFilter({ ...empty, tags: [1, 2], tagMatch: 'any' }, board, 'de')).toBe('Finished oder To review')
	})
})

describe('filtersEqual', () => {
	it('ignores the order of selected entries', () => {
		expect(filtersEqual({ ...empty, tags: [2, 1] }, { ...empty, tags: [1, 2] }, currentPeriod)).toBe(true)
	})

	it('ignores match modes with fewer than two entries', () => {
		expect(filtersEqual({ ...empty, tags: [1], tagMatch: 'any' }, { ...empty, tags: [1] }, currentPeriod)).toBe(true)
		expect(filtersEqual({ ...empty, tags: [1, 2], tagMatch: 'any' }, { ...empty, tags: [1, 2] }, currentPeriod)).toBe(false)
	})

	it('matches a saved calendar week only while the current week is shown', () => {
		const saved = { ...empty, due: 'calendarWeek' }
		expect(filtersEqual({ ...empty, due: 'calendarWeek', dueFrom: '2026-11-02', dueTo: '2026-11-08' }, saved, currentPeriod)).toBe(true)
		expect(filtersEqual({ ...empty, due: 'calendarWeek', dueFrom: '2026-11-09', dueTo: '2026-11-15' }, saved, currentPeriod)).toBe(false)
	})

	it('tells periods with and without overdue cards apart', () => {
		const week = { ...empty, due: 'calendarWeek' }
		expect(filtersEqual({ ...week, dueIncludeOverdue: true }, week, currentPeriod)).toBe(false)
		expect(filtersEqual({ ...empty, due: 'overdue', dueIncludeOverdue: true }, { ...empty, due: 'overdue' }, currentPeriod)).toBe(true)
	})

	it('can ignore which calendar period is shown', () => {
		const saved = { ...empty, due: 'calendarWeek' }
		const nextWeek = { ...empty, due: 'calendarWeek', dueFrom: '2026-11-09', dueTo: '2026-11-15' }
		expect(filtersEqual(nextWeek, saved, currentPeriod, { anyPeriod: true })).toBe(true)
		expect(filtersEqual({ ...nextWeek, due: 'calendarMonth' }, saved, currentPeriod, { anyPeriod: true })).toBe(false)
		// custom ranges keep comparing their dates
		const range = { ...empty, due: 'range', dueFrom: '2026-11-02', dueTo: '2026-11-15' }
		expect(filtersEqual(range, { ...range, dueTo: '2026-11-16' }, currentPeriod, { anyPeriod: true })).toBe(false)
	})

	it('compares custom ranges by their dates', () => {
		const range = { ...empty, due: 'range', dueFrom: '2026-11-02', dueTo: '2026-11-15' }
		expect(filtersEqual(range, { ...range }, currentPeriod)).toBe(true)
		expect(filtersEqual(range, { ...range, dueTo: '2026-11-16' }, currentPeriod)).toBe(false)
	})

	it('treats missing keys of older saved filters as their defaults', () => {
		expect(filtersEqual({ tags: [1], completed: 'open' }, { ...empty, tags: [1], completed: 'open' }, currentPeriod)).toBe(true)
	})
})

describe('filterParts', () => {
	it('gives every part the values that remove it', () => {
		const filter = { ...empty, tags: [1, 2], tagMatch: 'any', excludedTags: [3], excludedUsers: ['bob', 'alice'], completed: 'open', due: 'dueWeek' }
		const parts = filterParts(filter, board, 'en')
		expect(parts.map((part) => part.label)).toEqual(['Finished or To review', 'Not: Later', 'Not: Bob', 'Not: Alice', 'Open', 'Next 7 days'])
		expect(parts[0].reset).toEqual({ tags: [] })
		expect(parts[2].reset).toEqual({ excludedUsers: ['alice'] })
		expect(parts[4].reset).toEqual({ completed: 'both' })
		expect(parts[5].reset).toEqual({ due: '', dueFrom: '', dueTo: '', dueIncludeOverdue: false })
	})

	it('names the shown calendar period', () => {
		expect(filterParts({ ...empty, due: 'calendarWeek', dueFrom: '2026-11-02', dueTo: '2026-11-08' }, board, 'en')[0].label).toBe('Week 45, 2026')
		// the ISO week of 2026-12-28 belongs to 2026, that of 2027-01-01 still to week 53 of 2026
		expect(filterParts({ ...empty, due: 'calendarWeek', dueFrom: '2026-12-28', dueTo: '2027-01-03' }, board, 'en')[0].label).toBe('Week 53, 2026')
		expect(filterParts({ ...empty, due: 'calendarMonth', dueFrom: '2026-11-01', dueTo: '2026-11-30' }, board, 'en')[0].label).toBe('November 2026')
	})

	it('gives calendar periods their dates as detail', () => {
		const part = filterParts({ ...empty, due: 'calendarWeek', dueFrom: '2026-11-02', dueTo: '2026-11-08' }, board, 'en')[0]
		expect(part.detail.replace(/\s/g, ' ')).toBe('Nov 2 – 8, 2026')
		expect(filterParts({ ...empty, due: 'dueWeek' }, board, 'en')[0].detail).toBeUndefined()
	})

	it('offers the avatar of a single selected user', () => {
		expect(filterParts({ ...empty, users: ['alice'] }, board, 'en')[0]).toMatchObject({ kind: 'users', user: 'alice', label: 'Alice' })
		expect(filterParts({ ...empty, users: ['alice', 'bob'] }, board, 'en')[0].user).toBeUndefined()
	})

	it('is empty without a filter', () => {
		expect(filterParts(empty, board, 'en')).toEqual([])
	})
})
