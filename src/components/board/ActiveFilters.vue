<!--
  - SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
	<div v-if="parts.length > 0" ref="bar" class="active-filters">
		<ul class="active-filters__list" :aria-label="t('deck', 'Active filters')">
			<li v-if="activeView" data-part-id="view">
				<NcChip
					:text="activeView.name"
					variant="primary"
					:ariaLabelClose="t('deck', 'Remove saved filter {name}', { name: activeView.name })"
					@close="clearFilter">
					<template #icon>
						<FilterCheckIcon :size="18" />
					</template>
				</NcChip>
			</li>
			<li
				v-for="(part, index) in parts"
				:key="part.id"
				class="active-filters__item"
				:data-part-id="part.id">
				<NcButton
					v-if="part.step"
					variant="tertiary"
					size="small"
					:aria-label="part.step === 'week' ? t('deck', 'Previous week') : t('deck', 'Previous month')"
					@click="stepPeriod(-1)">
					<template #icon>
						<ChevronLeftIcon :size="20" />
					</template>
				</NcButton>
				<NcChip
					:text="part.label"
					:ariaLabelClose="closeLabel(part)"
					@close="removePart(part, index)">
					<template #icon>
						<NcAvatar
							v-if="part.kind === 'users' && part.user"
							:user="part.user"
							:size="18"
							disableMenu
							hideStatus />
						<component :is="icons[part.kind]" v-else :size="18" />
					</template>
				</NcChip>
				<NcButton
					v-if="part.step"
					variant="tertiary"
					size="small"
					:aria-label="part.step === 'week' ? t('deck', 'Next week') : t('deck', 'Next month')"
					@click="stepPeriod(1)">
					<template #icon>
						<ChevronRightIcon :size="20" />
					</template>
				</NcButton>
			</li>
		</ul>
		<!-- the explanation and its way out stay together when the row wraps -->
		<div v-if="noCardsMatch" class="active-filters__empty">
			<span>{{ t('deck', 'No cards match.') }}</span>
			<NcButton
				v-if="widenTo"
				variant="tertiary"
				size="small"
				@click="widen">
				{{ widenTo.label }}
			</NcButton>
		</div>
		<NcButton variant="tertiary" size="small" @click="clearFilter()">
			{{ t('deck', 'Clear filter') }}
		</NcButton>
	</div>
</template>

<script>
import moment from '@nextcloud/moment'
import { NcAvatar, NcButton, NcChip } from '@nextcloud/vue'
import { mapActions, mapState } from 'pinia'
import AccountMultipleIcon from 'vue-material-design-icons/AccountMultipleOutline.vue'
import AccountOffIcon from 'vue-material-design-icons/AccountOffOutline.vue'
import CalendarIcon from 'vue-material-design-icons/CalendarOutline.vue'
import CheckCircleIcon from 'vue-material-design-icons/CheckCircleOutline.vue'
import ChevronLeftIcon from 'vue-material-design-icons/ChevronLeft.vue'
import ChevronRightIcon from 'vue-material-design-icons/ChevronRight.vue'
import FilterCheckIcon from 'vue-material-design-icons/FilterCheckOutline.vue'
import MinusCircleIcon from 'vue-material-design-icons/MinusCircleOutline.vue'
import TagIcon from 'vue-material-design-icons/TagOutline.vue'
import { periodAround } from '../DueDateRangeFilter.vue'
import { filterParts, filtersEqual } from '../../helpers/boardFilter.js'
import { emptyFilter, rememberMatchModes, useBoardStore } from '../../stores/board.js'
import { useCardStore } from '../../stores/card.js'

/**
 * The active board filter as removable chips below the board header, following the
 * "Active filters" chips of the Files app, so the filter stays visible with its popover closed.
 */
export default {
	name: 'ActiveFilters',

	components: {
		NcAvatar,
		NcButton,
		NcChip,
		FilterCheckIcon,
		ChevronLeftIcon,
		ChevronRightIcon,
	},

	props: {
		board: {
			type: Object,
			required: true,
		},
	},

	data() {
		return {
			icons: {
				tags: TagIcon,
				users: AccountMultipleIcon,
				unassigned: AccountOffIcon,
				hidden: MinusCircleIcon,
				status: CheckCircleIcon,
				due: CalendarIcon,
			},
		}
	},

	computed: {
		...mapState(useBoardStore, ['filter']),

		parts() {
			return filterParts(this.filter, this.board)
		},

		noCardsMatch() {
			// a board without any cards or one still loading is not a filter result
			const cardStore = useCardStore()
			return cardStore.cardCountOnBoard(this.board.id) === 0
				&& cardStore.cardCountOnBoard(this.board.id, { filtered: false }) > 0
		},

		/**
		 * When "all" of several tags or users is the likely reason for an empty result,
		 * offer to switch to "any" of them. The default is not changed.
		 *
		 * @return {{key: string, label: string}|null}
		 */
		widenTo() {
			if (this.filter.tags.length > 1 && this.filter.tagMatch !== 'any') {
				return { key: 'tagMatch', label: t('deck', 'Show cards with any of these tags') }
			}
			if (this.filter.users.length > 1 && this.filter.userMatch === 'all') {
				return { key: 'userMatch', label: t('deck', 'Show cards assigned to any of these users') }
			}
			return null
		},

		activeView() {
			// a saved calendar week or month stays recognised while stepping to other weeks or months
			return (this.board.settings?.savedFilters ?? []).find((saved) => filtersEqual(this.filter, saved.filter, periodAround, { anyPeriod: true }))
		},
	},

	methods: {
		...mapActions(useBoardStore, ['setFilterValues']),

		/**
		 * The chip text alone ("Open") lacks context for screen readers, so name the facet as well.
		 *
		 * @param {object} part entry of filterParts()
		 * @return {string}
		 */
		closeLabel(part) {
			const facets = {
				tags: t('deck', 'Tags'),
				users: t('deck', 'Assigned to'),
				unassigned: t('deck', 'Assigned to'),
				status: t('deck', 'Status'),
				due: t('deck', 'Due date'),
			}
			// hidden entries already read "Not: …"
			const name = facets[part.kind] ? `${facets[part.kind]}: ${part.label}` : part.label
			return t('deck', 'Remove filter {name}', { name })
		},

		/**
		 * Show the previous or next calendar week or month, as the stepper in the popover does.
		 *
		 * @param {number} direction -1 or 1
		 */
		stepPeriod(direction) {
			const unit = this.filter.due === 'calendarWeek' ? 'week' : 'month'
			const day = moment(this.filter.dueFrom, 'YYYY-MM-DD').add(direction, unit).format('YYYY-MM-DD')
			const { from, to } = periodAround(this.filter.due, day)
			this.setFilterValues({ dueFrom: from, dueTo: to })
		},

		widen() {
			const key = this.widenTo.key
			this.setFilterValues({ [key]: 'any' })
			rememberMatchModes(this.board.id, this.filter)
			// the button disappears with the empty result, so keep focus on the chip it changed
			this.focusChip(key === 'tagMatch' ? 'tags' : 'users')
		},

		/**
		 * @param {object} part entry of filterParts()
		 * @param {number} index its position in parts
		 */
		removePart(part, index) {
			// chips may disappear together (the saved filter chip with the last matching part),
			// so aim at a neighbour by id rather than by position
			const neighbour = this.parts[index + 1] ?? this.parts[index - 1]
			this.setFilterValues(part.reset)
			this.focusChip(neighbour?.id)
		},

		clearFilter() {
			this.setFilterValues(emptyFilter(this.board.id))
			this.focusChip(null)
		},

		/**
		 * Move focus to the close button of a chip after the next render or, when that chip is
		 * gone (or no id is given), to the filter button that opens the filter.
		 *
		 * @param {string|null} partId id of the chip, as in filterParts()
		 */
		focusChip(partId) {
			this.$nextTick(() => {
				const target = (partId && this.$refs.bar?.querySelector(`li[data-part-id="${partId}"] button`))
					|| document.querySelector('.board-action-buttons__filter .filter-button')
				target?.focus()
			})
		},
	},
}
</script>

<style lang="scss" scoped>
@use '../../css/variables.scss' as *;

.active-filters {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--default-grid-baseline) calc(2 * var(--default-grid-baseline));
	padding: 0 $board-gap calc(2 * var(--default-grid-baseline));
}

.active-filters__empty {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--default-grid-baseline);
	color: var(--color-text-maxcontrast);
}

.active-filters__item {
	display: flex;
	align-items: center;
}

.active-filters__list {
	display: flex;
	flex-wrap: wrap;
	gap: var(--default-grid-baseline);
	margin: 0;
	padding: 0;
	list-style: none;
}
</style>
