<!--
  - SPDX-FileCopyrightText: 2018 Nextcloud GmbH and Nextcloud contributors
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
	<div class="controls">
		<NcModal v-if="showAddCardModal" class="card-selector" @close="clickHideAddCardModel">
			<CreateNewCardCustomPicker showCreatedNotice @cancel="clickHideAddCardModel" />
		</NcModal>
		<div v-if="overviewName" class="board-title">
			<div class="board-bullet icon-calendar-dark" />
			<h2 dir="auto">
				{{ overviewName }}
			</h2>
			<NcActions>
				<NcActionButton data-cy="action:add-card" icon="icon-add" @click="clickShowAddCardModel">
					{{ t('deck', 'Add card') }}
				</NcActionButton>
			</NcActions>
		</div>
		<div v-else-if="board" class="board-title">
			<div :style="{backgroundColor: '#' + board.color}" class="board-bullet" />
			<h2 dir="auto">
				{{ board.title }}
			</h2>
			<p v-if="showArchived">
				({{ t('deck', 'Archived cards') }})
			</p>
		</div>
		<div class="board-actions">
			<SessionList
				v-if="isNotifyPushEnabled && presentUsers.length"
				:sessions="presentUsers" />
			<div
				v-if="board && canManage && !showArchived && !board.archived"
				id="stack-add"
				v-v-on-click-outside="hideAddStack">
				<NcActions v-if="!isAddStackVisible">
					<NcActionButton @click.stop="showAddStack">
						{{ t('deck', 'Add list') }}
						<template #icon>
							<TableColumnPlusAfter :size="20" />
						</template>
					</NcActionButton>
				</NcActions>
				<form v-else @submit.prevent="addNewStack()">
					<label for="new-stack-input-main" class="hidden-visually">{{ t('deck', 'Add list') }}</label>
					<input
						id="new-stack-input-main"
						v-model="newStackTitle"
						v-focus
						type="text"
						class="no-close"
						:placeholder="t('deck', 'List name')"
						required
						@focus="toggleShortcutLock(true)"
						@blur="toggleShortcutLock(false)">
					<input
						:title="t('deck', 'Add list')"
						class="icon-confirm"
						type="submit"
						value="">
				</form>
			</div>
			<template v-if="showSearch">
				<!-- Not type="search": NcTextField only fills the trailing button's icon
					slot when type !== 'search', which leaves the clear button iconless. -->
				<NcTextField
					id="deck-search-input"
					v-model="searchQuery"
					class="board-search"
					type="text"
					:label="searchLabel"
					:title="searchHint || null"
					:showTrailingButton="searchQuery !== ''"
					:trailingButtonLabel="t('deck', 'Clear search')"
					:aria-describedby="searchHint ? 'deck-search-hint' : null"
					@trailingButtonClick="clearSearchQuery"
					@focus="toggleShortcutLock(true)"
					@blur="toggleShortcutLock(false)" />
				<!-- title is for pointer users, aria-describedby for assistive tech. No double
					announcement: title is only the fallback description per HTML-AAM. -->
				<span v-if="searchHint" id="deck-search-hint" class="hidden-visually">{{ searchHint }}</span>
			</template>
			<p v-if="board" class="hidden-visually" aria-live="polite">
				{{ filterAnnouncement }}
			</p>
			<div v-if="board" class="board-action-buttons">
				<div class="board-action-buttons__filter">
					<!-- on wide boards the filter is a bar of facet buttons below the header, shown by this button -->
					<NcButton
						v-if="filterBarFits"
						:title="t('deck', 'Apply filter')"
						:aria-label="t('deck', 'Apply filter')"
						:aria-expanded="filterBarShown ? 'true' : 'false'"
						aria-controls="deck-filter-bar"
						class="filter-button"
						:variant="filterActive ? 'primary' : 'tertiary'"
						@click="toggleFilterBar">
						<template #icon>
							<FilterIcon v-if="filterActive" :size="20" decorative />
							<FilterOffIcon v-else :size="20" decorative />
						</template>
					</NcButton>
					<NcPopover
						v-else
						placement="bottom-end"
						noFocusTrap
						:aria-label="t('deck', 'Filter cards')"
						:name="t('deck', 'Filter cards')"
						@afterShow="focusFilterOnOpen"
						@afterHide="returnFocusOnClose">
						<!-- We cannot use NcActions here as we can't style NcActionCheckbox labels dynamically -->
						<template #trigger>
							<NcButton
								ref="filterPopover"
								:title="t('deck', 'Apply filter')"
								:aria-label="t('deck', 'Apply filter')"
								class="filter-button"
								:variant="filterActive ? 'primary' : 'tertiary'">
								<template #icon>
									<FilterIcon v-if="filterActive" :size="20" decorative />
									<FilterOffIcon v-else :size="20" decorative />
								</template>
							</NcButton>
						</template>

						<template #default>
							<div ref="filterContent" class="filter">
								<template v-if="filterView === null">
									<SavedFilters
										v-if="savedFilters.length > 0"
										section="list"
										:board="board"
										class="filter--group"
										@removed="onSavedFilterRemoved" />
									<div class="filter--group">
										<h3 v-if="savedFilters.length > 0" class="filter--group-heading">
											{{ t('deck', 'Filter by') }}
										</h3>
										<ul class="filter--facets">
											<li v-for="facet in facets" :key="facet.id">
												<button
													type="button"
													class="filter--facet"
													:data-cy-facet="facet.id"
													:aria-label="facet.value ? `${facet.label}: ${facet.value}` : facet.label"
													:title="facet.value || null"
													@click="openFacet(facet.id)">
													<component :is="facet.icon" class="filter--facet-icon" :size="20" />
													<span class="filter--facet-text">
														<span>{{ facet.label }}</span>
														<span v-if="facet.value" class="filter--facet-value">{{ facet.value }}</span>
													</span>
													<ChevronRightIcon class="filter--facet-icon" :size="20" />
												</button>
											</li>
										</ul>
									</div>
									<div class="filter--group">
										<SavedFilters
											section="save"
											:board="board"
											@saving="isSavingFilter = $event"
											@saved="(index) => focusInFilter('.filter--saved-apply', index)" />
										<NcButton
											v-if="!isSavingFilter"
											:disabled="!filterActive"
											:wide="true"
											@click="clearFilterFromPopover">
											{{ t('deck', 'Clear filter') }}
										</NcButton>
									</div>
								</template>
								<template v-else>
									<NcButton
										variant="tertiary"
										alignment="start"
										:wide="true"
										data-cy-filter-back
										@click="closeFacet">
										<template #icon>
											<ArrowLeftIcon :size="20" />
										</template>
										{{ t('deck', 'Back to filters') }}
									</NcButton>
									<FilterFacet
										ref="facet"
										class="filter--facet-view"
										:board="board"
										:facet="filterView"
										@chosen="closeFacet" />
								</template>
							</div>
						</template>
					</NcPopover>
				</div>

				<NcActions
					:aria-label="t('deck', 'View Modes')"
					:name="t('deck', 'Toggle View Modes')">
					<NcActionButton
						:modelValue="viewMode === 'kanban'"
						@click="setViewMode('kanban')">
						<template #icon>
							<ViewColumnIcon :size="20" decorative />
						</template>
						{{ t('deck', 'Kanban view') }}
					</NcActionButton>
					<NcActionButton
						:modelValue="viewMode === 'gantt'"
						@click="setViewMode('gantt')">
						<template #icon>
							<ChartGanttIcon :size="20" decorative />
						</template>
						{{ t('deck', 'Gantt view') }}
					</NcActionButton>
					<NcActionSeparator />
					<NcActionButton @click="() => toggleShowArchived()">
						<template #icon>
							<ArchiveIcon :size="20" decorative />
						</template>
						{{ showArchived ? t('deck', 'Hide archived cards') : t('deck', 'Show archived cards') }}
					</NcActionButton>
					<NcActionButton
						v-if="compactMode"
						@click="toggleCompactMode">
						<template #icon>
							<ArrowExpandVerticalIcon :size="20" decorative />
						</template>
						{{ t('deck', 'Toggle compact mode') }}
					</NcActionButton>
					<NcActionButton
						v-else
						@click="toggleCompactMode">
						<template #icon>
							<ArrowCollapseVerticalIcon :size="20" decorative />
						</template>
						{{ t('deck', 'Toggle compact mode') }}
					</NcActionButton>
					<NcActionButton @click="toggleShowCardCover">
						<template #icon>
							<ImageIcon :size="20" decorative />
						</template>
						{{ showCardCover ? t('deck', 'Hide card cover images') : t('deck', 'Show card cover images') }}
					</NcActionButton>
				</NcActions>
				<!-- FIXME: NcActionRouter currently doesn't work as an inline action -->
				<NcActions v-if="isFullApp">
					<NcActionButton
						icon="icon-menu-sidebar"
						:aria-label="t('deck', 'Open details')"
						:name="t('deck', 'Details')"
						@click="toggleDetailsView" />
				</NcActions>
			</div>
		</div>
	</div>
</template>

<script>
import { getCurrentUser } from '@nextcloud/auth'
import { subscribe, unsubscribe } from '@nextcloud/event-bus'
import { NcActionButton, NcActions, NcActionSeparator, NcButton, NcModal, NcPopover, NcTextField } from '@nextcloud/vue'
import { vOnClickOutside } from '@vueuse/components'
import { mapActions, mapState, mapWritableState } from 'pinia'
import AccountMultipleIcon from 'vue-material-design-icons/AccountMultipleOutline.vue'
import ArchiveIcon from 'vue-material-design-icons/ArchiveOutline.vue'
import ArrowCollapseVerticalIcon from 'vue-material-design-icons/ArrowCollapseVertical.vue'
import ArrowExpandVerticalIcon from 'vue-material-design-icons/ArrowExpandVertical.vue'
import ArrowLeftIcon from 'vue-material-design-icons/ArrowLeft.vue'
import CalendarIcon from 'vue-material-design-icons/CalendarOutline.vue'
import ChartGanttIcon from 'vue-material-design-icons/ChartGantt.vue'
import CheckCircleIcon from 'vue-material-design-icons/CheckCircleOutline.vue'
import ChevronRightIcon from 'vue-material-design-icons/ChevronRight.vue'
import FilterOffIcon from 'vue-material-design-icons/FilterOffOutline.vue'
import FilterIcon from 'vue-material-design-icons/FilterOutline.vue'
import ImageIcon from 'vue-material-design-icons/ImageMultipleOutline.vue'
import TableColumnPlusAfter from 'vue-material-design-icons/TableColumnPlusAfter.vue'
import TagIcon from 'vue-material-design-icons/TagOutline.vue'
import ViewColumnIcon from 'vue-material-design-icons/ViewColumn.vue'
import CreateNewCardCustomPicker from '../views/CreateNewCardCustomPicker.vue'
import FilterFacet from './filter/FilterFacet.vue'
import SavedFilters from './filter/SavedFilters.vue'
import SessionList from './SessionList.vue'
import { facetValue, filterParts, isFilterActive } from '../helpers/boardFilter.js'
import { isNotifyPushEnabled } from '../sessions.js'
import { emptyFilter, useBoardStore } from '../stores/board.js'
import { useCardStore } from '../stores/card.js'
import { useSettingsStore } from '../stores/settings.js'
import { useStackStore } from '../stores/stack.js'

export default {
	name: 'Controls',
	components: {
		CreateNewCardCustomPicker,
		NcModal,
		NcActions,
		NcActionButton,
		NcButton,
		NcPopover,
		NcTextField,
		ArchiveIcon,
		ImageIcon,
		FilterIcon,
		FilterOffIcon,
		ArrowLeftIcon,
		ChevronRightIcon,
		ArrowCollapseVerticalIcon,
		ArrowExpandVerticalIcon,
		ViewColumnIcon,
		ChartGanttIcon,
		NcActionSeparator,
		TableColumnPlusAfter,
		SessionList,
		FilterFacet,
		SavedFilters,
	},

	directives: {
		vOnClickOutside,
	},

	props: {
		board: {
			type: Object,
			required: false,
			default: null,
		},

		overviewName: {
			type: String,
			required: false,
			default: null,
		},

		showSearch: {
			type: Boolean,
			default: false,
		},

		searchLabel: {
			type: String,
			default: '',
		},

		// Only pass this where the card prefixes actually apply
		searchHint: {
			type: String,
			default: '',
		},
	},

	data() {
		return {
			newStackTitle: '',
			stack: '',
			isAddStackVisible: false,
			showAddCardModal: false,
			isSavingFilter: false,
			// null for the overview, otherwise the facet shown: 'tags', 'users', 'status' or 'due'
			filterView: null,
			filterAnnouncement: '',
			announceTimeout: null,
			skipAnnouncement: false,
			defaultPageTitle: false,
			isNotifyPushEnabled: isNotifyPushEnabled(),
		}
	},

	computed: {
		...mapState(useBoardStore, ['filter', 'filterBarFits', 'filterBarOpen', 'filterBarKept']),
		...mapState(useBoardStore, [
			'canManage',
			'viewMode',
			'showArchived',
		]),

		...mapState(useSettingsStore, {
			isFullApp: (state) => state.isFullApp,
			navShown: (state) => state.navShown,
			compactMode: (state) => state.compactMode,
			showCardCover: (state) => state.showCardCover,
		}),

		...mapState(useCardStore, ['cardById']),
		...mapWritableState(useSettingsStore, ['searchQuery']),
		pageTitle() {
			if (!this.board?.title) {
				return ''
			}
			const cardTitle = this.$route.params.cardId && this.cardById(Number(this.$route.params.cardId))?.title
			return cardTitle ? `${cardTitle} - ${this.board.title}` : this.board.title
		},

		detailsRoute() {
			return {
				name: 'board.details',
			}
		},

		savedFilters() {
			return this.board?.settings?.savedFilters ?? []
		},

		visibleCardCount() {
			return useCardStore().cardCountOnBoard(this.board.id)
		},

		/**
		 * The overview rows of the popover, one per facet, each with what it currently filters.
		 *
		 * @return {Array<{id: string, label: string, icon: object, value: string}>}
		 */
		facets() {
			const parts = filterParts(this.filter, this.board)
			return [
				{ id: 'tags', label: t('deck', 'Tags'), icon: TagIcon },
				{ id: 'users', label: t('deck', 'Assigned to'), icon: AccountMultipleIcon },
				{ id: 'status', label: t('deck', 'Status'), icon: CheckCircleIcon },
				{ id: 'due', label: t('deck', 'Due date'), icon: CalendarIcon },
			].map((facet) => ({ ...facet, value: facetValue(parts, facet.id) }))
		},

		filterActive() {
			return isFilterActive(this.filter)
		},

		filterBarShown() {
			return this.filterBarFits && (this.filterBarOpen || this.filterBarKept || this.filterActive)
		},

		presentUsers() {
			if (!this.board) {
				return []
			}
			// get user object including displayname from the list of all users with acces
			return this.board.users.filter((user) => this.board.activeSessions.includes(user.uid))
		},
	},

	watch: {
		// The board object is replaced wholesale by the store, so watching the
		// two properties we actually care about is enough - and avoids
		// traversing labels, acl and users on every unrelated board mutation.
		'board.id': function() {
			// opening another board brings its own (possibly restored) filter; not a result worth announcing
			this.skipAnnouncement = true
			this.isSavingFilter = false
			this.filterView = null
		},

		filter: {
			deep: true,
			handler() {
				if (this.skipAnnouncement) {
					this.skipAnnouncement = false
					return
				}
				clearTimeout(this.announceTimeout)
				this.filterAnnouncement = ''
				this.announceTimeout = setTimeout(() => {
					this.filterAnnouncement = n('deck', '%n card shown', '%n cards shown', this.visibleCardCount)
				}, 500)
			},
		},

		pageTitle: {
			immediate: true,
			handler(title) {
				if (title) {
					this.setPageTitle(title)
				}
			},
		},
	},

	beforeMount() {
		subscribe('deck:board:show-new-card', this.clickShowAddCardModel)
		subscribe('deck:board:toggle-filter-popover', this.triggerOpenFilters)
		subscribe('deck:board:clear-filter', this.triggerClearFilter)
		subscribe('deck:board:toggle-filter-by-me', this.triggerFilterByMe)
	},

	beforeUnmount() {
		clearTimeout(this.announceTimeout)
		unsubscribe('deck:board:show-new-card', this.clickShowAddCardModel)
		unsubscribe('deck:board:toggle-filter-popover', this.triggerOpenFilters)
		unsubscribe('deck:board:clear-filter', this.triggerClearFilter)
		unsubscribe('deck:board:toggle-filter-by-me', this.triggerFilterByMe)
		this.setPageTitle('')
	},

	methods: {
		...mapActions(useBoardStore, ['setViewMode', 'toggleShowArchived', 'setFilterValues', 'setFilterBarOpen']),
		...mapActions(useStackStore, ['createStack']),
		...mapActions(useSettingsStore, {
			setSearchQuery: 'setSearchQuery',
			setShortcutLock: 'toggleShortcutLock',
			setNavShown: 'toggleNav',
			toggleCompact: 'toggleCompactMode',
			toggleCardCover: 'toggleShowCardCover',
		}),

		/**
		 * Move focus to the index-th match of a selector inside the filter popover, after the next render.
		 *
		 * @param {string} selector elements to choose from, in document order
		 * @param {number} index position to focus, clamped to the last match
		 */
		focusInFilter(selector, index = 0) {
			this.$nextTick(() => {
				const elements = this.$refs.filterContent?.querySelectorAll(selector) ?? []
				elements[Math.min(index, elements.length - 1)]?.focus()
			})
		},

		focusFirstFilterControl() {
			this.focusInFilter('.filter--saved-apply, .filter--facet')
		},

		/**
		 * Show one facet's controls instead of the overview, like the narrow filter menu of Files.
		 *
		 * @param {string} facet 'tags', 'users', 'status' or 'due'
		 */
		openFacet(facet) {
			this.filterView = facet
			this.$nextTick(() => this.$refs.facet?.focusStart())
		},

		/**
		 * Back to the overview, also after a choice that completes a facet, like a status.
		 */
		closeFacet() {
			const facet = this.filterView
			this.filterView = null
			this.focusInFilter(`[data-cy-facet="${facet}"]`)
		},

		focusFilterOnOpen() {
			// the popover reports being shown only after its transition; by then the user may already be working in it
			if (!this.$refs.filterContent?.contains(document.activeElement)) {
				this.focusFirstFilterControl()
			}
		},

		returnFocusOnClose() {
			// the next opening starts at the overview again
			this.filterView = null
			// without a focus trap the popover does not return focus itself, e.g. after Escape
			const active = document.activeElement
			if (!active || active === document.body || this.$refs.filterContent?.contains(active)) {
				this.$refs.filterPopover?.$el.focus()
			}
		},

		clearFilterFromPopover() {
			this.clearFilter()
			// the clear button disables itself, so keep focus in the popover
			this.focusFirstFilterControl()
		},

		onSavedFilterRemoved(remaining) {
			// the list moves focus to a remaining saved filter itself
			if (remaining === 0) {
				this.focusFirstFilterControl()
			}
		},

		/**
		 * Show or hide the filter bar of wide boards. It cannot be hidden while a filter is active,
		 * then the button takes the user to it instead.
		 */
		toggleFilterBar() {
			if (this.filterBarShown && this.filterActive) {
				document.querySelector('#deck-filter-bar button')?.focus()
				return
			}
			const open = !this.filterBarShown
			this.setFilterBarOpen(open)
			if (open) {
				this.$nextTick(() => document.querySelector('#deck-filter-bar button')?.focus())
			}
		},

		clearSearchQuery() {
			this.setSearchQuery('')
		},

		toggleShortcutLock(lock) {
			this.setShortcutLock(lock)
		},

		toggleNav() {
			this.setNavShown(!this.navShown)
		},

		toggleCompactMode() {
			this.toggleCompact()
		},

		toggleShowCardCover() {
			this.toggleCardCover()
		},

		addNewStack() {
			this.stack = { title: this.newStackTitle }
			this.createStack(this.stack)
			this.newStackTitle = ''
			this.stack = null
			this.isAddStackVisible = false
		},

		showAddStack() {
			this.isAddStackVisible = true
		},

		hideAddStack() {
			this.isAddStackVisible = false
		},

		toggleDetailsView() {
			if (this.$route.name === 'board.details') {
				this.$router.push({ name: 'board' })
			} else {
				this.$router.push({ name: 'board.details' })
			}
		},

		clearFilter() {
			this.setFilterValues(emptyFilter(this.board?.id ?? null))
		},

		clickShowAddCardModel() {
			this.showAddCardModal = true
		},

		clickHideAddCardModel() {
			this.showAddCardModal = false
		},

		setPageTitle(title) {
			if (!this.isFullApp) {
				return
			}
			if (this.defaultPageTitle === false) {
				this.defaultPageTitle = window.document.title
				if (this.defaultPageTitle.indexOf(' - Deck - ') !== -1) {
					this.defaultPageTitle = this.defaultPageTitle.substring(this.defaultPageTitle.indexOf(' - Deck - ') + 3)
				}
				if (this.defaultPageTitle.indexOf('Deck - ') !== 0) {
					this.defaultPageTitle = 'Deck - ' + this.defaultPageTitle
				}
			}
			let newTitle = this.defaultPageTitle
			if (title !== '') {
				newTitle = `${title} - ${newTitle}`
			}
			window.document.title = newTitle
		},

		triggerOpenFilters() {
			if (this.filterBarFits) {
				this.toggleFilterBar()
			} else {
				this.$refs.filterPopover?.$el.click()
			}
		},

		triggerClearFilter() {
			this.clearFilter()
		},

		/**
		 * Add or remove the current user in the user filter, keeping the rest of the filter: with
		 * filters kept across visits, clearing everything would be a surprise.
		 */
		triggerFilterByMe() {
			const uid = getCurrentUser().uid
			if (this.filter.users.includes(uid)) {
				this.setFilterValues({ users: this.filter.users.filter((user) => user !== uid) })
			} else {
				this.setFilterValues({
					users: [...this.filter.users, uid],
					unassigned: false,
					excludedUsers: this.filter.excludedUsers.filter((user) => user !== uid),
				})
			}
		},
	},
}
</script>

<style lang="scss" scoped>
	@use '../css/variables.scss' as *;

	.controls {
		display: flex;
		// min-height, not height: the search wraps to a second row on narrow screens
		flex-wrap: wrap;
		row-gap: var(--default-grid-baseline);
		margin: calc(var(--default-grid-baseline) * 2);
		min-height: var(--default-clickable-area);
		padding-inline-start: var(--default-clickable-area);

		.board-title {
			display: flex;
			align-items: center;
			// lets the h2 below actually truncate
			min-width: 0;

			h2 {
				margin: 0;
				margin-inline-end: 10px;
				font-size: 18px;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}

			.board-bullet {
				display: inline-block;
				width: 16px;
				height: 16px;
				border: none;
				border-radius: 50%;
				background-color: transparent;
				margin: var(--default-grid-baseline);
			}
		}

		#stack-add form {
			display: flex;

			#new-stack-input-main {
				margin-inline-end: 8px;
			}
			.icon-confirm {
				border: 2px solid var(--color-border-maxcontrast) !important;
				border-inline-start: none !important;
			}
			&:focus-within, &:focus, &:focus-visible,
			&:hover {
				.icon-confirm {
					border-color: var(--color-main-text) !important;
				}
			}
		}
	}

	#app-navigation-toggle-custom {
		position: static;
		width: var(--default-clickable-area);
		height: var(--default-clickable-area);
		cursor: pointer;
		opacity: 1;
		display: inline-block !important;
	}

	.board-actions {
		flex-grow: 1;
		order: 100;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		row-gap: var(--default-grid-baseline);
		justify-content: flex-end;
	}

	.board-action-buttons {
		display: flex;
	}

	.board-search {
		flex: 0 1 15rem;
		min-width: 0;
		margin-inline-end: var(--default-grid-baseline);
	}

	@media (max-width: $breakpoint-small-mobile) {
		// Own row below the buttons, spanning the full header. The negative margin cancels
		// the padding .controls reserves for the navigation toggle, which only occupies the
		// first row; the oversized basis keeps the search alone on its line, so it is safe.
		.board-search {
			order: 1;
			flex-basis: calc(100% + var(--default-clickable-area));
			margin-inline: calc(-1 * var(--default-clickable-area)) 0;
		}
	}

	.filter {
		display: flex;
		flex-direction: column;
		width: 280px;
		max-height: calc(100vh - 150px);
		position: relative;
		overflow: auto;
		padding: 8px;
	}

	// saved filters, the facets and the actions on the filter as a whole
	.filter--group {
		display: flex;
		flex-direction: column;
		gap: var(--default-grid-baseline);

		& + & {
			margin-top: calc(2 * var(--default-grid-baseline));
			padding-top: calc(2 * var(--default-grid-baseline));
			border-top: 1px solid var(--color-border);
		}
	}

	.filter--group-heading {
		margin: 0;
		font-size: var(--default-font-size);
		font-weight: bold;
		line-height: var(--default-clickable-area);
	}

	.filter--facets {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	button.filter--facet {
		display: flex;
		align-items: center;
		gap: calc(2 * var(--default-grid-baseline));
		width: 100%;
		min-height: var(--default-clickable-area);
		margin: 0;
		padding: var(--default-grid-baseline) calc(2 * var(--default-grid-baseline));
		border: none;
		border-radius: var(--border-radius-element, var(--border-radius-large));
		background: transparent;
		color: var(--color-main-text);
		font-weight: normal;
		text-align: start;
		cursor: pointer;

		&:hover {
			background: var(--color-background-hover);
		}

		&:focus-visible {
			outline: 2px solid var(--color-main-text);
			outline-offset: -2px;
		}
	}

	.filter--facet-icon {
		flex-shrink: 0;
	}

	.filter--facet-text {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-width: 0;

		> * {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
	}

	.filter--facet-value {
		color: var(--color-text-maxcontrast);
		font-size: var(--font-size-small, 13px);
	}

	.filter--facet-view {
		margin-top: var(--default-grid-baseline);
	}

	.filter-button {
		padding: 0;
		border-radius: 50%;
		width: var(--default-clickable-area);
		height: var(--default-clickable-area);
	}
</style>

<style lang="scss">
	.popover:focus {
		outline: 2px solid var(--color-main-text);
	}
</style>
