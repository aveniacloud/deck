<!--
  - SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
	<div v-if="parts.length > 0" class="active-filters">
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
			<li v-for="part in parts" :key="part.id">
				<NcChip
					:text="part.label"
					:ariaLabelClose="t('deck', 'Remove filter {name}', { name: part.label })"
					@close="setFilterValues(part.reset)">
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
		<NcButton variant="tertiary" size="small" @click="clearFilter">
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
			return (this.board.settings?.savedFilters ?? []).find((saved) => filtersEqual(this.filter, saved.filter, periodAround))
		},
	},

	methods: {
		...mapActions(useBoardStore, ['setFilterValues']),

		clearFilter() {
			this.setFilterValues(emptyFilter(this.board.id))
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
