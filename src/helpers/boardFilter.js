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
 * @param {boolean} anyPeriod ignore which calendar week or month is shown, only compare that it is one
 * @return {object}
 */
export function normalizeFilter(filter, currentPeriod, anyPeriod = false) {
	const tags = [...(filter.tags ?? [])].sort()
	const users = [...(filter.users ?? [])].sort()
	const due = filter.due ?? ''
	let dueFrom = null
	let dueTo = null
	let dueIncludeOverdue = false
	if (due === 'range' || CALENDAR_PERIODS.includes(due)) {
		dueIncludeOverdue = !!filter.dueIncludeOverdue
	}
	if (due === 'range') {
		dueFrom = filter.dueFrom ?? ''
		dueTo = filter.dueTo ?? ''
	} else if (CALENDAR_PERIODS.includes(due) && !anyPeriod) {
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
		dueIncludeOverdue,
	}
}

/**
 * @param {object} a board filter
 * @param {object} b board filter
 * @param {(due: string) => {from: string, to: string}} currentPeriod see normalizeFilter
 * @param {object} options comparison options
 * @param {boolean} options.anyPeriod treat filters that only differ in the calendar week or month shown as equal,
 * e.g. a saved "current week" filter after stepping to the next week
 * @return {boolean} whether both filters show the same cards
 */
export function filtersEqual(a, b, currentPeriod, { anyPeriod = false } = {}) {
	return JSON.stringify(normalizeFilter(a, currentPeriod, anyPeriod)) === JSON.stringify(normalizeFilter(b, currentPeriod, anyPeriod))
}

/**
 * The active parts of a filter, in the order they are shown as chips or in a summary.
 * Each part knows the filter values that remove it.
 *
 * @param {object} filter board filter
 * @param {object} board the board, for tag titles and user display names
 * @param {string} locale BCP 47 locale for list and date formatting
 * @return {Array<{id: string, kind: string, label: string, step?: string, name?: string, user?: string, reset: object}>}
 */
export function filterParts(filter, board, locale = getCanonicalLocale()) {
	const list = (items, type) => new Intl.ListFormat(locale, { type }).format(items)
	const tagTitle = (id) => board.labels?.find((label) => label.id === id)?.title
	const userName = (uid) => board.users?.find((user) => user.uid === uid)?.displayname ?? uid
	const parts = []

	const tags = (filter.tags ?? []).map(tagTitle).filter(Boolean)
	if (tags.length > 0) {
		parts.push({ id: 'tags', kind: 'tags', label: list(tags, filter.tagMatch === 'any' ? 'disjunction' : 'conjunction'), reset: { tags: [] } })
	}

	const users = filter.users ?? []
	if (filter.unassigned) {
		parts.push({ id: 'users', kind: 'unassigned', label: t('deck', 'Unassigned'), reset: { unassigned: false } })
	} else if (users.length > 0) {
		parts.push({
			id: 'users',
			kind: 'users',
			label: list(users.map(userName), filter.userMatch === 'all' ? 'conjunction' : 'disjunction'),
			user: users.length === 1 ? users[0] : undefined,
			reset: { users: [] },
		})
	}

	for (const id of filter.excludedTags ?? []) {
		const name = tagTitle(id)
		if (name) {
			parts.push({ id: `hidden-tag-${id}`, kind: 'hidden', name, label: t('deck', 'Not: {name}', { name }), reset: { excludedTags: filter.excludedTags.filter((other) => other !== id) } })
		}
	}
	for (const uid of filter.excludedUsers ?? []) {
		const name = userName(uid)
		parts.push({ id: `hidden-user-${uid}`, kind: 'hidden', name, user: uid, label: t('deck', 'Not: {name}', { name }), reset: { excludedUsers: filter.excludedUsers.filter((other) => other !== uid) } })
	}

	if (filter.completed === 'open') {
		parts.push({ id: 'status', kind: 'status', label: t('deck', 'Open'), reset: { completed: 'both' } })
	} else if (filter.completed === 'completed') {
		parts.push({ id: 'status', kind: 'status', label: t('deck', 'Completed'), reset: { completed: 'both' } })
	}

	let due = describeDue(filter, locale)
	if (due && filter.dueIncludeOverdue && (filter.due === 'range' || CALENDAR_PERIODS.includes(filter.due))) {
		due = t('deck', '{period}, including overdue', { period: due })
	}
	if (due) {
		// a shown calendar week or month can be stepped through right from its chip
		const step = CALENDAR_PERIODS.includes(filter.due) && filter.dueFrom ? (filter.due === 'calendarWeek' ? 'week' : 'month') : undefined
		parts.push({ id: 'due', kind: 'due', label: due, step, reset: { due: '', dueFrom: '', dueTo: '', dueIncludeOverdue: false } })
	}

	return parts
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
	const parts = filterParts(filter, board, locale)
	const labels = parts.filter((part) => part.kind !== 'hidden').map((part) => part.label)
	const hidden = parts.filter((part) => part.kind === 'hidden').map((part) => part.name)
	if (hidden.length > 0) {
		// hidden entries read as one phrase right after the selected tags and users
		const afterSelection = parts.filter((part) => ['tags', 'users', 'unassigned'].includes(part.kind)).length
		labels.splice(afterSelection, 0, t('deck', 'without {names}', { names: new Intl.ListFormat(locale, { type: 'conjunction' }).format(hidden) }))
	}
	return labels.join(' · ')
}

/**
 * @param {string} value day as YYYY-MM-DD
 * @return {Date} that day at local midnight
 */
function toDay(value) {
	const [year, month, date] = value.split('-').map(Number)
	return new Date(year, month - 1, date)
}

/**
 * @param {string} value day as YYYY-MM-DD
 * @return {{week: number, year: number}} ISO week (Monday to Sunday) containing the day
 */
function isoWeek(value) {
	const [year, month, date] = value.split('-').map(Number)
	const day = new Date(Date.UTC(year, month - 1, date))
	// the Thursday of the week decides which year it belongs to
	day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7))
	const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1))
	return { week: Math.ceil(((day - yearStart) / 86400000 + 1) / 7), year: day.getUTCFullYear() }
}

/**
 * @param {object} filter board filter
 * @param {string} locale BCP 47 locale
 * @return {string} the due date part of a filter description, empty without a due date filter.
 * Calendar periods with dates name the period; without dates (as saved) they mean the current one.
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
		case 'calendarWeek': {
			if (!filter.dueFrom) {
				return t('deck', 'Current week')
			}
			// the week number alone does not tell everyone which days it covers
			const days = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).formatRange(toDay(filter.dueFrom), toDay(filter.dueTo))
			return `${t('deck', 'Week {week}, {year}', isoWeek(filter.dueFrom))} · ${days}`
		}
		case 'calendarMonth':
			return filter.dueFrom
				? new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(toDay(filter.dueFrom))
				: t('deck', 'Current month')
		case 'range': {
			const format = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' })
			if (filter.dueFrom && filter.dueTo) {
				return format.formatRange(toDay(filter.dueFrom), toDay(filter.dueTo))
			}
			if (filter.dueFrom) {
				return t('deck', 'Due from {date}', { date: format.format(toDay(filter.dueFrom)) })
			}
			if (filter.dueTo) {
				return t('deck', 'Due until {date}', { date: format.format(toDay(filter.dueTo)) })
			}
			return t('deck', 'With a due date')
		}
		default:
			return ''
	}
}

/**
 * The values that remove everything one facet filters, including its hidden entries.
 * Match modes are kept: they are a preference rather than part of a filter.
 */
export const FACET_RESET = {
	tags: { tags: [], excludedTags: [] },
	users: { users: [], excludedUsers: [], unassigned: false },
	status: { completed: 'both' },
	due: { due: '', dueFrom: '', dueTo: '', dueIncludeOverdue: false },
}

const FACET_KINDS = {
	tags: (part) => part.kind === 'tags' || part.id.startsWith('hidden-tag-'),
	users: (part) => ['users', 'unassigned'].includes(part.kind) || part.id.startsWith('hidden-user-'),
	status: (part) => part.kind === 'status',
	due: (part) => part.kind === 'due',
}

/**
 * What one facet currently filters, e.g. "Finished and To review · Not: Later".
 *
 * @param {Array} parts the result of filterParts()
 * @param {string} facet 'tags', 'users', 'status' or 'due'
 * @return {string} empty when the facet filters nothing
 */
export function facetValue(parts, facet) {
	return parts.filter(FACET_KINDS[facet]).map((part) => part.label).join(' · ')
}

/**
 * @param {object} filter board filter
 * @return {boolean} whether the filter leaves out any card
 */
export function isFilterActive(filter) {
	return filter.tags.length !== 0 || filter.users.length !== 0 || filter.unassigned
		|| filter.excludedTags.length !== 0 || filter.excludedUsers.length !== 0
		|| filter.due !== '' || filter.completed !== 'both'
}
