<!--
  - SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
	<div
		v-if="shown"
		id="deck-filter-bar"
		ref="bar"
		class="active-filters"
		:class="{ 'active-filters--bar': filterBarFits }">
		<!-- wide boards: one menu per facet, like the filters of Files; the buttons show the filter -->
		<ul v-if="filterBarFits" class="active-filters__list" :aria-label="t('deck', 'Filter cards')">
			<li data-part-id="saved" class="active-filters__item">
				<NcPopover
					:shown="openMenu === 'saved'"
					placement="bottom-start"
					:aria-label="t('deck', 'Saved filters')"
					noFocusTrap
					@update:shown="(shown) => setMenu('saved', shown)"
					@afterShow="focusMenu('saved')"
					@afterHide="onMenuHidden('saved')">
					<template #trigger>
						<NcButton
							:variant="activeView ? 'secondary' : 'tertiary'"
							data-cy-bar-menu="saved"
							:title="activeView ? t('deck', 'Saved filter {name}', { name: activeView.name }) : null">
							<template #icon>
								<BookmarkCheckIcon v-if="activeView" :size="20" />
								<BookmarkIcon v-else :size="20" />
							</template>
							<span class="active-filters__label">{{ activeView ? activeView.name : t('deck', 'Saved filters') }}</span>
						</NcButton>
					</template>
					<div class="active-filters__menu">
						<SavedFilters
							v-if="renderedMenus.saved"
							:ref="(el) => { menuRefs.saved = el }"
							:board="board"
							@applied="setMenu('saved', false)" />
					</div>
				</NcPopover>
			</li>
			<li
				v-for="facet in facets"
				:key="facet.id"
				class="active-filters__item"
				:data-part-id="facet.id">
				<NcButton
					v-if="facet.step"
					variant="tertiary"
					:aria-label="facet.step === 'week' ? t('deck', 'Previous week') : t('deck', 'Previous month')"
					@click="stepPeriod(-1)">
					<template #icon>
						<ChevronLeftIcon :size="20" />
					</template>
				</NcButton>
				<NcPopover
					:shown="openMenu === facet.id"
					placement="bottom-start"
					:aria-label="facet.label"
					noFocusTrap
					@update:shown="(shown) => setMenu(facet.id, shown)"
					@afterShow="focusMenu(facet.id)"
					@afterHide="onMenuHidden(facet.id)">
					<template #trigger>
						<NcButton
							:variant="facet.value ? 'secondary' : 'tertiary'"
							:data-cy-bar-menu="facet.id"
							:aria-label="facet.value ? `${facet.label}: ${facet.value}` : facet.label"
							:title="facet.value || null">
							<template #icon>
								<component :is="facet.icon" :size="20" />
							</template>
							<span class="active-filters__label">{{ facet.value ? `${facet.label}: ${facet.shortValue}` : facet.label }}</span>
						</NcButton>
					</template>
					<div class="active-filters__menu">
						<FilterFacet
							v-if="renderedMenus[facet.id]"
							:ref="(el) => { menuRefs[facet.id] = el }"
							:board="board"
							:facet="facet.id"
							@chosen="setMenu(facet.id, false)" />
					</div>
				</NcPopover>
				<NcButton
					v-if="facet.step"
					variant="tertiary"
					:aria-label="facet.step === 'week' ? t('deck', 'Next week') : t('deck', 'Next month')"
					@click="stepPeriod(1)">
					<template #icon>
						<ChevronRightIcon :size="20" />
					</template>
				</NcButton>
				<NcButton
					v-if="facet.value"
					variant="tertiary"
					:aria-label="t('deck', 'Remove filter {name}', { name: `${facet.label}: ${facet.value}` })"
					:title="t('deck', 'Remove filter')"
					data-cy-bar-remove
					@click="removeFacet(facet.id)">
					<template #icon>
						<CloseIcon :size="20" />
					</template>
				</NcButton>
			</li>
		</ul>

		<!-- narrow boards: the active filter as removable chips, the popover holds the menus -->
		<ul v-else class="active-filters__list" :aria-label="t('deck', 'Active filters')">
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
		<NcButton
			v-if="parts.length > 0"
			variant="tertiary"
			:size="filterBarFits ? 'normal' : 'small'"
			@click="clearFilter()">
			{{ t('deck', 'Clear filter') }}
		</NcButton>
	</div>
</template>

<script>
import moment from '@nextcloud/moment'
import { NcAvatar, NcButton, NcChip, NcPopover } from '@nextcloud/vue'
import { mapActions, mapState } from 'pinia'
import { markRaw } from 'vue'
import AccountMultipleIcon from 'vue-material-design-icons/AccountMultipleOutline.vue'
import AccountOffIcon from 'vue-material-design-icons/AccountOffOutline.vue'
import BookmarkCheckIcon from 'vue-material-design-icons/BookmarkCheckOutline.vue'
import BookmarkIcon from 'vue-material-design-icons/BookmarkOutline.vue'
import CalendarIcon from 'vue-material-design-icons/CalendarOutline.vue'
import CheckCircleIcon from 'vue-material-design-icons/CheckCircleOutline.vue'
import ChevronLeftIcon from 'vue-material-design-icons/ChevronLeft.vue'
import ChevronRightIcon from 'vue-material-design-icons/ChevronRight.vue'
import CloseIcon from 'vue-material-design-icons/Close.vue'
import FilterCheckIcon from 'vue-material-design-icons/FilterCheckOutline.vue'
import MinusCircleIcon from 'vue-material-design-icons/MinusCircleOutline.vue'
import TagIcon from 'vue-material-design-icons/TagOutline.vue'
import FilterFacet from '../filter/FilterFacet.vue'
import SavedFilters from '../filter/SavedFilters.vue'
import { FACET_RESET, facetValue, filterParts, filtersEqual, isFilterActive } from '../../helpers/boardFilter.js'
import { periodAround } from '../../helpers/periods.js'
import { emptyFilter, rememberMatchModes, useBoardStore } from '../../stores/board.js'
import { useCardStore } from '../../stores/card.js'

/**
 * The board filter below the board header. On wide boards a bar with a menu per facet, like the
 * filters of the Files app; on narrow ones the active filter as removable chips, as Files shows
 * them, while the filter popover of the header holds the menus.
 */
export default {
	name: 'ActiveFilters',

	components: {
		BookmarkCheckIcon,
		BookmarkIcon,
		ChevronLeftIcon,
		ChevronRightIcon,
		CloseIcon,
		FilterCheckIcon,
		FilterFacet,
		NcAvatar,
		NcButton,
		NcChip,
		NcPopover,
		SavedFilters,
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

			// the menu open in the filter bar: 'saved', a facet or null
			openMenu: null,
			// menus whose content exists: it stays until a menu has finished closing, which its focus trap needs
			renderedMenus: {},
		}
	},

	computed: {
		...mapState(useBoardStore, ['filter', 'filterBarFits', 'filterBarOpen', 'filterBarKept']),

		parts() {
			return filterParts(this.filter, this.board)
		},

		filterActive() {
			return isFilterActive(this.filter)
		},

		shown() {
			return this.filterBarFits
				? this.filterBarOpen || this.filterBarKept || this.filterActive
				: this.parts.length > 0
		},

		facets() {
			const icons = this.icons
			return [
				{ id: 'tags', label: t('deck', 'Tags'), icon: icons.tags },
				{ id: 'users', label: t('deck', 'Assigned to'), icon: icons.users },
				{ id: 'status', label: t('deck', 'Status'), icon: icons.status },
				{ id: 'due', label: t('deck', 'Due date'), icon: icons.due },
			].map((facet) => {
				const value = facetValue(this.parts, facet.id)
				const step = facet.id === 'due' ? this.parts.find((part) => part.kind === 'due')?.step : undefined
				return {
					...facet,
					value,
					// a calendar period is named by its title, its dates are in the tooltip
					shortValue: step ? value.split(' · ')[0] : value,
					step,
				}
			})
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

	watch: {
		filterActive(active) {
			// the bar stays when its last filter is removed, rather than vanishing under the pointer
			if (active && this.filterBarFits) {
				this.keepFilterBar(true)
			}
		},

		filterBarFits() {
			this.openMenu = null
		},

		'board.id': function() {
			this.openMenu = null
		},
	},

	created() {
		// the content components of the menus, by menu
		this.menuRefs = {}
	},

	mounted() {
		if (this.filterActive && this.filterBarFits) {
			this.keepFilterBar(true)
		}
	},

	methods: {
		...mapActions(useBoardStore, ['setFilterValues', 'keepFilterBar']),

		/**
		 * @param {string} menu 'saved' or a facet
		 * @param {boolean} shown whether it is open now
		 */
		setMenu(menu, shown) {
			if (shown) {
				this.openMenu = menu
				this.renderedMenus = { ...this.renderedMenus, [menu]: true }
			} else if (this.openMenu === menu) {
				this.openMenu = null
				// like the filter popover of narrow boards, the menus have no focus trap that would
				// return focus; focus goes back to the menu's button unless the user went elsewhere
				const active = document.activeElement
				if (!active || active === document.body || active.closest('.v-popper__popper') || this.$refs.bar?.contains(active)) {
					this.$refs.bar?.querySelector(`[data-cy-bar-menu="${menu}"]`)?.focus()
				}
			}
		},

		/**
		 * @param {string} menu 'saved' or a facet
		 */
		onMenuHidden(menu) {
			if (this.openMenu !== menu) {
				this.renderedMenus = { ...this.renderedMenus, [menu]: false }
			}
		},

		focusMenu(menu) {
			this.menuRefs[menu]?.focusStart()
		},

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
		 * @param {string} facet 'tags', 'users', 'status' or 'due'
		 */
		removeFacet(facet) {
			this.setFilterValues(FACET_RESET[facet])
			this.focusPart(facet)
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
		 * Move focus after the next render to the control of a part of the filter: in the bar its
		 * facet's menu button, otherwise the close button of its chip. When that is gone (or no id
		 * is given), focus goes to the first menu of the bar or to the button that opens the filter.
		 *
		 * @param {string|null} partId id of the part, as in filterParts()
		 */
		focusPart(partId) {
			this.$nextTick(() => {
				let target
				if (this.filterBarFits) {
					const facet = partId?.startsWith('hidden-tag-') ? 'tags' : partId?.startsWith('hidden-user-') ? 'users' : partId
					target = (facet && this.$refs.bar?.querySelector(`[data-cy-bar-menu="${facet}"]`))
						|| this.$refs.bar?.querySelector('[data-cy-bar-menu]')
				} else {
					target = partId && this.$refs.bar?.querySelector(`li[data-part-id="${partId}"] .nc-chip button`)
				}
				target = target || document.querySelector('.board-action-buttons__filter .filter-button')
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

.active-filters__label {
	display: block;
	// long values stay readable in the title and the accessible name
	max-width: 14rem;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.active-filters__menu {
	box-sizing: border-box;
	width: 300px;
	max-height: calc(100vh - 200px);
	overflow: auto;
	padding: calc(2 * var(--default-grid-baseline));
}
</style>
