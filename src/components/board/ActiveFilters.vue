<!--
  - SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
	<div
		v-if="parts.length > 0"
		ref="bar"
		class="active-filters">
		<!-- the active filter as removable chips; their text opens the filter menu at that part -->
		<ul class="active-filters__list" :aria-label="t('deck', 'Active filters')">
			<li v-if="activeView" data-part-id="view">
				<NcChip
					variant="primary"
					:ariaLabelClose="t('deck', 'Remove saved filter {name}', { name: activeView.name })"
					@close="clearFilter">
					<!-- icon and text together are the button, a target big enough for touch -->
					<button
						type="button"
						class="active-filters__edit"
						:aria-label="t('deck', 'Change filter {name}', { name: activeView.name })"
						:title="t('deck', 'Change filter')"
						@click="editFilter(null)">
						<FilterCheckIcon :size="18" />
						<span class="active-filters__text">{{ activeView.name }}</span>
					</button>
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
					:ariaLabelClose="t('deck', 'Remove filter {name}', { name: partName(part) })"
					@close="removePart(part, index)">
					<button
						type="button"
						class="active-filters__edit"
						:aria-label="t('deck', 'Change filter {name}', { name: partName(part) })"
						:title="t('deck', 'Change filter')"
						@click="editFilter(facetOf(part))">
						<NcAvatar
							v-if="part.kind === 'users' && part.user"
							:user="part.user"
							:size="18"
							disableMenu
							hideStatus />
						<component :is="icons[part.kind]" v-else :size="18" />
						<span class="active-filters__text">{{ part.label }}</span>
					</button>
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
		<NcButton
			variant="tertiary"
			size="small"
			@click="clearFilter()">
			{{ t('deck', 'Clear filter') }}
		</NcButton>
	</div>
</template>

<script>
import { emit } from '@nextcloud/event-bus'
import moment from '@nextcloud/moment'
import { NcAvatar, NcButton, NcChip } from '@nextcloud/vue'
import { mapActions, mapState } from 'pinia'
import { markRaw } from 'vue'
import AccountMultipleIcon from 'vue-material-design-icons/AccountMultipleOutline.vue'
import AccountOffIcon from 'vue-material-design-icons/AccountOffOutline.vue'
import CalendarIcon from 'vue-material-design-icons/CalendarOutline.vue'
import CheckCircleIcon from 'vue-material-design-icons/CheckCircleOutline.vue'
import ChevronLeftIcon from 'vue-material-design-icons/ChevronLeft.vue'
import ChevronRightIcon from 'vue-material-design-icons/ChevronRight.vue'
import FilterCheckIcon from 'vue-material-design-icons/FilterCheckOutline.vue'
import MinusCircleIcon from 'vue-material-design-icons/MinusCircleOutline.vue'
import TagIcon from 'vue-material-design-icons/TagOutline.vue'
import { filterParts, filtersEqual } from '../../helpers/boardFilter.js'
import { periodAround } from '../../helpers/periods.js'
import { emptyFilter, rememberMatchModes, useBoardStore } from '../../stores/board.js'
import { useCardStore } from '../../stores/card.js'

/**
 * The active board filter below the board header, as removable chips like Files shows them. The
 * text of a chip opens the filter menu of the header at its part of the filter.
 */
export default {
	name: 'ActiveFilters',

	components: {
		ChevronLeftIcon,
		ChevronRightIcon,
		FilterCheckIcon,
		NcAvatar,
		NcButton,
		NcChip,
	},

	props: {
		board: {
			type: Object,
			required: true,
		},
	},

	data() {
		return {
			// components must not become reactive
			icons: markRaw({
				tags: TagIcon,
				users: AccountMultipleIcon,
				unassigned: AccountOffIcon,
				hidden: MinusCircleIcon,
				status: CheckCircleIcon,
				due: CalendarIcon,
			}),
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
		 * The smallest change to an empty result that shows cards again, with how many: first "any"
		 * instead of "all" of several tags or users, then leaving out one part of the filter.
		 * Nothing is offered when no single change helps; "Clear filter" remains.
		 *
		 * @return {{values: object, focus: string|null, label: string}|null}
		 */
		widenTo() {
			if (!this.noCardsMatch) {
				return null
			}
			const shownWith = (values) => useCardStore().cardCountOnBoard(this.board.id, { filter: { ...this.filter, ...values } })
			const candidates = []
			if (this.filter.tags.length > 1 && this.filter.tagMatch !== 'any') {
				candidates.push({
					values: { tagMatch: 'any' },
					focus: 'tags',
					label: (count) => n('deck', 'Show %n card with any of these tags', 'Show %n cards with any of these tags', count),
				})
			}
			if (this.filter.users.length > 1 && this.filter.userMatch === 'all') {
				candidates.push({
					values: { userMatch: 'any' },
					focus: 'users',
					label: (count) => n('deck', 'Show %n card assigned to any of these users', 'Show %n cards assigned to any of these users', count),
				})
			}
			for (const [index, part] of this.parts.entries()) {
				// a calendar period is named by its title, its dates would make the button long
				const name = part.step ? part.label.split(' · ')[0] : part.label
				candidates.push({
					values: part.reset,
					focus: (this.parts[index + 1] ?? this.parts[index - 1])?.id ?? null,
					label: (count) => n('deck', 'Show %n card without "{name}"', 'Show %n cards without "{name}"', count, { name }),
				})
			}
			for (const candidate of candidates) {
				const shown = shownWith(candidate.values)
				if (shown > 0) {
					return { ...candidate, label: candidate.label(shown) }
				}
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
		 * The facet whose page in the filter menu holds a part of the filter.
		 *
		 * @param {object} part entry of filterParts()
		 * @return {string} 'tags', 'users', 'status' or 'due'
		 */
		facetOf(part) {
			if (part.kind === 'hidden') {
				return part.id.startsWith('hidden-tag-') ? 'tags' : 'users'
			}
			return part.kind === 'unassigned' ? 'users' : part.kind
		},

		/**
		 * The chip text alone ("Open") lacks context for screen readers, so name the facet as well.
		 *
		 * @param {object} part entry of filterParts()
		 * @return {string}
		 */
		partName(part) {
			const facets = {
				tags: t('deck', 'Tags'),
				users: t('deck', 'Assigned to'),
				unassigned: t('deck', 'Assigned to'),
				status: t('deck', 'Status'),
				due: t('deck', 'Due date'),
			}
			// hidden entries already read "Not: …"
			return facets[part.kind] ? `${facets[part.kind]}: ${part.label}` : part.label
		},

		/**
		 * Open the filter menu of the header, at a facet or at its overview.
		 *
		 * @param {string|null} facet 'tags', 'users', 'status', 'due' or null
		 */
		editFilter(facet) {
			emit('deck:board:edit-filter', { facet, returnFocus: document.activeElement })
		},

		/**
		 * Show the previous or next calendar week or month, as the stepper in the menu does.
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
			const { values, focus } = this.widenTo
			this.setFilterValues(values)
			if (values.tagMatch || values.userMatch) {
				rememberMatchModes(this.board.id, this.filter)
			}
			// the button disappears with the empty result, so keep focus on the chip it changed
			// or, when a chip was removed, on its neighbour
			this.focusPart(focus)
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
			this.focusPart(neighbour?.id)
		},

		clearFilter() {
			this.setFilterValues(emptyFilter(this.board.id))
			this.focusPart(null)
		},

		/**
		 * Move focus after the next render to the remove button of a part's chip, so parts can be
		 * removed one after another. When that is gone (or no id is given), focus goes to the button
		 * that opens the filter.
		 *
		 * @param {string|null} partId id of the part, as in filterParts()
		 */
		focusPart(partId) {
			this.$nextTick(() => {
				const target = (partId && this.$refs.bar?.querySelector(`li[data-part-id="${partId}"] .nc-chip button:not(.active-filters__edit)`))
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

// icon and text of a chip, as a button of its own that opens the filter menu at its part
button.active-filters__edit {
	display: flex;
	align-items: center;
	gap: var(--default-grid-baseline);
	max-width: 100%;
	min-height: 0;
	margin: 0;
	// apart from the remove button, so a tap meant for one does not hit the other
	margin-inline-end: var(--default-grid-baseline);
	padding: 2px 0;
	border: none;
	border-radius: var(--border-radius-small, 4px);
	background: transparent;
	color: inherit;
	font: inherit;
	font-weight: normal;
	cursor: pointer;

	&:hover .active-filters__text {
		text-decoration: underline;
	}

	&:focus-visible {
		outline: 2px solid currentColor;
		outline-offset: 1px;
	}
}

.active-filters__text {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
