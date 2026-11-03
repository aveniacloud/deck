<!--
  - SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
	<div v-if="parts.length > 0" ref="bar" class="active-filters">
		<ul class="active-filters__list" :aria-label="t('deck', 'Active filters')">
			<li v-if="activeView">
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
			<li v-for="(part, index) in parts" :key="part.id" :title="part.detail">
				<NcChip
					:text="part.label"
					:ariaLabelClose="closeLabel(part)"
					@close="removePart(part, index + (activeView ? 1 : 0))">
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
			</li>
		</ul>
		<p v-if="noCardsMatch" class="active-filters__empty">
			{{ t('deck', 'No cards match.') }}
		</p>
		<NcButton
			v-if="noCardsMatch && widenTo"
			variant="tertiary"
			size="small"
			@click="widen">
			{{ widenTo.label }}
		</NcButton>
		<NcButton variant="tertiary" size="small" @click="clearFilter()">
			{{ t('deck', 'Clear filter') }}
		</NcButton>
	</div>
</template>

<script>
import { NcAvatar, NcButton, NcChip } from '@nextcloud/vue'
import { mapActions, mapState } from 'pinia'
import AccountMultipleIcon from 'vue-material-design-icons/AccountMultipleOutline.vue'
import AccountOffIcon from 'vue-material-design-icons/AccountOffOutline.vue'
import CalendarIcon from 'vue-material-design-icons/CalendarOutline.vue'
import CheckCircleIcon from 'vue-material-design-icons/CheckCircleOutline.vue'
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
		 * @param {object} part entry of filterParts()
		 * @param {number} index position of its chip, to keep keyboard focus nearby
		 */
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

		widen() {
			this.setFilterValues({ [this.widenTo.key]: 'any' })
			rememberMatchModes(this.board.id, this.filter)
		},

		removePart(part, index) {
			this.setFilterValues(part.reset)
			this.focusChip(index)
		},

		clearFilter() {
			this.setFilterValues(emptyFilter(this.board.id))
			this.focusChip(0)
		},

		/**
		 * Keep focus near a removed chip: on the chip now at its position, the one before, or,
		 * once no chip is left and the bar is gone, on the filter button that opens the filter.
		 *
		 * @param {number} index position of the removed chip
		 */
		focusChip(index) {
			this.$nextTick(() => {
				const closeButtons = this.$refs.bar?.querySelectorAll('li button') ?? []
				const target = closeButtons[Math.min(index, closeButtons.length - 1)]
					?? document.querySelector('.board-action-buttons__filter .filter-button')
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
	margin: 0;
	color: var(--color-text-maxcontrast);
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
