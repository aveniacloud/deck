<!--
  - SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
	<div class="due-range">
		<div v-if="mode !== 'range'" class="due-range__stepper">
			<NcButton
				variant="tertiary"
				:aria-label="mode === 'calendarWeek' ? t('deck', 'Previous week') : t('deck', 'Previous month')"
				@click="step(-1)">
				<template #icon>
					<ChevronLeftIcon :size="20" />
				</template>
			</NcButton>
			<div class="due-range__period" aria-live="polite" data-cy-due-range-period>
				<span class="due-range__title">{{ periodTitle }}</span>
				<span class="due-range__dates">{{ periodDates }}</span>
			</div>
			<NcButton
				variant="tertiary"
				:aria-label="mode === 'calendarWeek' ? t('deck', 'Next week') : t('deck', 'Next month')"
				@click="step(1)">
				<template #icon>
					<ChevronRightIcon :size="20" />
				</template>
			</NcButton>
		</div>
		<div v-else class="due-range__inputs">
			<NcDateTimePickerNative
				id="due-range-from"
				:modelValue="toDate(from)"
				type="date"
				:label="t('deck', 'From')"
				:max="toDate(to)"
				@update:modelValue="(date) => emitRange(toDay(date), to)" />
			<NcDateTimePickerNative
				id="due-range-to"
				:modelValue="toDate(to)"
				type="date"
				:label="t('deck', 'To')"
				:min="toDate(from)"
				@update:modelValue="(date) => emitRange(from, toDay(date))" />
		</div>
	</div>
</template>

<script>
import { getCanonicalLocale } from '@nextcloud/l10n'
import moment from '@nextcloud/moment'
import { NcButton, NcDateTimePickerNative } from '@nextcloud/vue'
import ChevronLeftIcon from 'vue-material-design-icons/ChevronLeft.vue'
import ChevronRightIcon from 'vue-material-design-icons/ChevronRight.vue'
import { periodAround } from '../helpers/periods.js'

const DAY = 'YYYY-MM-DD'

export default {
	name: 'DueDateRangeFilter',

	components: {
		NcButton,
		NcDateTimePickerNative,
		ChevronLeftIcon,
		ChevronRightIcon,
	},

	props: {
		/** 'calendarWeek', 'calendarMonth' or 'range' */
		mode: {
			type: String,
			required: true,
		},

		/** First day, inclusive, as YYYY-MM-DD; empty for an open start */
		from: {
			type: String,
			default: '',
		},

		/** Last day, inclusive, as YYYY-MM-DD; empty for an open end */
		to: {
			type: String,
			default: '',
		},
	},

	emits: ['update'],

	computed: {
		periodTitle() {
			const start = moment(this.from, DAY)
			if (this.mode === 'calendarWeek') {
				return t('deck', 'Week {week}, {year}', { week: start.isoWeek(), year: start.isoWeekYear() })
			}
			return start.format('MMMM YYYY')
		},

		periodDates() {
			// the year is already in the title, so a short, localized range is enough
			const format = new Intl.DateTimeFormat(getCanonicalLocale(), { day: 'numeric', month: 'short' })
			return format.formatRange(moment(this.from, DAY).toDate(), moment(this.to, DAY).toDate())
		},
	},

	methods: {
		step(direction) {
			const unit = this.mode === 'calendarWeek' ? 'week' : 'month'
			const day = moment(this.from, DAY).add(direction, unit).format(DAY)
			const { from, to } = periodAround(this.mode, day)
			this.emitRange(from, to)
		},

		emitRange(from, to) {
			this.$emit('update', { from, to })
		},

		toDate(day) {
			return day ? moment(day, DAY).toDate() : null
		},

		toDay(date) {
			return date ? moment(date).format(DAY) : ''
		},
	},
}
</script>

<style lang="scss" scoped>
.due-range {
	margin-block: var(--default-grid-baseline);
}

.due-range__stepper {
	display: flex;
	align-items: center;
	gap: var(--default-grid-baseline);
}

.due-range__period {
	display: flex;
	flex: 1;
	flex-direction: column;
	align-items: center;
	text-align: center;
}

.due-range__title {
	font-weight: bold;
}

.due-range__dates {
	color: var(--color-text-maxcontrast);
	font-size: var(--font-size-small, 13px);
}

.due-range__inputs {
	display: flex;
	flex-direction: column;
	gap: var(--default-grid-baseline);
}
</style>
