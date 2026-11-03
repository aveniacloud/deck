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
					:ariaLabelClose="t('deck', 'Clear filter')"
					@close="clearFilter">
					<template #icon>
						<FilterCheckIcon :size="18" />
					</template>
				</NcChip>
			</li>
			<li v-for="(part, index) in parts" :key="part.id">
				<NcChip
					:text="part.label"
					:ariaLabelClose="t('deck', 'Remove filter {name}', { name: part.label })"
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
import { emptyFilter, useBoardStore } from '../../stores/board.js'

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

.active-filters__list {
	display: flex;
	flex-wrap: wrap;
	gap: var(--default-grid-baseline);
	margin: 0;
	padding: 0;
	list-style: none;
}
</style>
