/**
 * SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { describe, expect, it } from '@jest/globals'
import { describeFilter, filtersEqual } from './boardFilter.js'

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

	it('compares custom ranges by their dates', () => {
		const range = { ...empty, due: 'range', dueFrom: '2026-11-02', dueTo: '2026-11-15' }
		expect(filtersEqual(range, { ...range }, currentPeriod)).toBe(true)
		expect(filtersEqual(range, { ...range, dueTo: '2026-11-16' }, currentPeriod)).toBe(false)
	})

	it('treats missing keys of older saved filters as their defaults', () => {
		expect(filtersEqual({ tags: [1], completed: 'open' }, { ...empty, tags: [1], completed: 'open' }, currentPeriod)).toBe(true)
	})
})
