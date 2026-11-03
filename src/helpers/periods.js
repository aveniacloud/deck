/**
 * SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import moment from '@nextcloud/moment'

const DAY = 'YYYY-MM-DD'

/**
 * First and last day of the calendar week or month containing the given day.
 * Weeks are ISO weeks (Monday to Sunday), matching the week numbers people use.
 *
 * @param {string} mode 'calendarWeek' or 'calendarMonth'
 * @param {string} day any day of the period, as YYYY-MM-DD; today if empty
 * @return {{from: string, to: string}}
 */
export function periodAround(mode, day) {
	const unit = mode === 'calendarWeek' ? 'isoWeek' : 'month'
	const anchor = day ? moment(day, DAY) : moment()
	return {
		from: anchor.clone().startOf(unit).format(DAY),
		to: anchor.clone().endOf(unit).format(DAY),
	}
}
