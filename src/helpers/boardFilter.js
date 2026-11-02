/**
 * SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { getCanonicalLocale, translate as t } from '@nextcloud/l10n'

const CALENDAR_PERIODS = ['calendarWeek', 'calendarMonth']

/**
 * Bring a board filter into a canonical shape, so that two filters showing the same cards compare equal.
 * Match modes only matter with two or more entries, and a saved calendar week or month
 * without dates means the current one.
 *
 * @param {object} filter board filter as kept in the board store or a saved filter
 * @param {(due: string) => {from: string, to: string}} currentPeriod returns {from, to} of the current calendar week or month for a due mode
 * @return {object}
 */
export function normalizeFilter(filter, currentPeriod) {
	const tags = [...(filter.tags ?? [])].sort()
	const users = [...(filter.users ?? [])].sort()
	const due = filter.due ?? ''
	let dueFrom = null
	let dueTo = null
	if (due === 'range') {
		dueFrom = filter.dueFrom ?? ''
		dueTo = filter.dueTo ?? ''
	} else if (CALENDAR_PERIODS.includes(due)) {
		({ from: dueFrom, to: dueTo } = filter.dueFrom ? { from: filter.dueFrom, to: filter.dueTo } : currentPeriod(due))
	}
	return {
		tags,
		tagMatch: tags.length > 1 ? (filter.tagMatch === 'any' ? 'any' : 'all') : null,
		excludedTags: [...(filter.excludedTags ?? [])].sort(),
		users,
		userMatch: users.length > 1 ? (filter.userMatch === 'all' ? 'all' : 'any') : null,
		excludedUsers: [...(filter.excludedUsers ?? [])].sort(),
		unassigned: !!filter.unassigned,
		completed: filter.completed ?? 'both',
		due,
		dueFrom,
		dueTo,
	}
}

/**
 * @param {object} a board filter
 * @param {object} b board filter
 * @param {(due: string) => {from: string, to: string}} currentPeriod see normalizeFilter
 * @return {boolean} whether both filters show the same cards
 */
export function filtersEqual(a, b, currentPeriod) {
	return JSON.stringify(normalizeFilter(a, currentPeriod)) === JSON.stringify(normalizeFilter(b, currentPeriod))
}

/**
 * One line describing what a filter shows, e.g. "Finished or To review · without bob · Open · Current week".
 *
 * @param {object} filter board filter
 * @param {object} board the board, for tag titles and user display names
 * @param {string} locale BCP 47 locale for list and date formatting
 * @return {string}
 */
export function describeFilter(filter, board, locale = getCanonicalLocale()) {
	const list = (items, type) => new Intl.ListFormat(locale, { type }).format(items)
	const tagTitle = (id) => board.labels?.find((label) => label.id === id)?.title
	const userName = (uid) => board.users?.find((user) => user.uid === uid)?.displayname ?? uid
	const parts = []

	const tags = (filter.tags ?? []).map(tagTitle).filter(Boolean)
	if (tags.length > 0) {
		parts.push(list(tags, filter.tagMatch === 'any' ? 'disjunction' : 'conjunction'))
	}

	const users = (filter.users ?? []).map(userName)
	if (filter.unassigned) {
		parts.push(t('deck', 'Unassigned'))
	} else if (users.length > 0) {
		parts.push(list(users, filter.userMatch === 'all' ? 'conjunction' : 'disjunction'))
	}

	const excluded = [...(filter.excludedTags ?? []).map(tagTitle), ...(filter.excludedUsers ?? []).map(userName)].filter(Boolean)
	if (excluded.length > 0) {
		parts.push(t('deck', 'without {names}', { names: list(excluded, 'conjunction') }))
	}

	if (filter.completed === 'open') {
		parts.push(t('deck', 'Open'))
	} else if (filter.completed === 'completed') {
		parts.push(t('deck', 'Completed'))
	}

	const due = describeDue(filter, locale)
	if (due) {
		parts.push(due)
	}

	return parts.join(' · ')
}

/**
 * @param {object} filter board filter
 * @param {string} locale BCP 47 locale
 * @return {string} the due date part of a filter description, empty without a due date filter
 */
function describeDue(filter, locale) {
	switch (filter.due) {
		case 'overdue':
			return t('deck', 'Overdue')
		case 'dueToday':
			return t('deck', 'Next 24 hours')
		case 'dueWeek':
			return t('deck', 'Next 7 days')
		case 'dueMonth':
			return t('deck', 'Next 30 days')
		case 'noDue':
			return t('deck', 'No due date')
		case 'calendarWeek':
			return t('deck', 'Current week')
		case 'calendarMonth':
			return t('deck', 'Current month')
		case 'range': {
			const format = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' })
			const day = (value) => {
				const [year, month, date] = value.split('-').map(Number)
				return new Date(year, month - 1, date)
			}
			if (filter.dueFrom && filter.dueTo) {
				return format.formatRange(day(filter.dueFrom), day(filter.dueTo))
			}
			if (filter.dueFrom) {
				return t('deck', 'Due from {date}', { date: format.format(day(filter.dueFrom)) })
			}
			if (filter.dueTo) {
				return t('deck', 'Due until {date}', { date: format.format(day(filter.dueTo)) })
			}
			return t('deck', 'With a due date')
		}
		default:
			return ''
	}
}
