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
					<NcPopover
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
								:variant="isFilterActive ? 'primary' : 'tertiary'">
								<template #icon>
									<FilterIcon v-if="isFilterActive" :size="20" decorative />
									<FilterOffIcon v-else :size="20" decorative />
								</template>
							</NcButton>
						</template>

						<template #default>
							<div ref="filterContent" class="filter">
								<template v-if="filterView === null">
									<template v-if="savedFilters.length > 0">
										<div class="filter--heading">
											<h3>{{ t('deck', 'Saved filters') }}</h3>
										</div>
										<div v-for="({ saved, summary, active }, index) in savedFilterRows" :key="saved.name" class="filter--saved">
											<button
												type="button"
												class="filter--saved-apply"
												:aria-pressed="active ? 'true' : 'false'"
												:title="summary ? `${saved.name}\n${summary}` : saved.name"
												@click="applySavedFilter(saved)">
												<CheckIcon v-if="active" class="filter--saved-icon" :size="20" />
												<FilterIcon v-else class="filter--saved-icon" :size="20" />
												<span class="filter--saved-text">
													<span class="filter--saved-name">{{ saved.name }}</span>
													<span v-if="summary" class="filter--saved-summary">{{ summary }}</span>
												</span>
											</button>
											<NcButton
												variant="tertiary"
												size="small"
												:aria-label="t('deck', 'Delete saved filter {name}', { name: saved.name })"
												:title="t('deck', 'Delete saved filter')"
												@click="deleteSavedFilter(index)">
												<template #icon>
													<TrashIcon :size="18" />
												</template>
											</NcButton>
										</div>
									</template>

									<ul class="filter--facets">
										<li v-for="facet in facets" :key="facet.id">
											<button
												type="button"
												class="filter--facet"
												:data-cy-facet="facet.id"
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

									<form v-if="isSavingFilter" class="filter--save" @submit.prevent="saveFilter">
										<NcTextField
											ref="savedFilterName"
											v-model="savedFilterName"
											:label="t('deck', 'Name of the filter')"
											:maxlength="100" />
										<p v-if="replacedSavedFilter" class="filter--save-hint">
											{{ t('deck', 'Replaces the saved filter "{name}".', { name: replacedSavedFilter.name }) }}
										</p>
										<p v-if="filter.due === 'calendarWeek'" class="filter--save-hint">
											{{ t('deck', 'The saved filter always shows the current week.') }}
										</p>
										<p v-else-if="filter.due === 'calendarMonth'" class="filter--save-hint">
											{{ t('deck', 'The saved filter always shows the current month.') }}
										</p>
										<div class="filter--save-actions">
											<NcButton variant="tertiary" @click="cancelSaveFilter">
												{{ t('deck', 'Cancel') }}
											</NcButton>
											<NcButton type="submit" variant="primary" :disabled="savedFilterName.trim() === ''">
												{{ replacedSavedFilter ? t('deck', 'Replace') : t('deck', 'Save') }}
											</NcButton>
										</div>
									</form>
									<NcButton
										v-else
										ref="saveFilterButton"
										:disabled="!isFilterActive"
										:title="isFilterActive ? undefined : t('deck', 'Choose a filter first to save it')"
										:wide="true"
										@click="startSavingFilter">
										{{ t('deck', 'Save filter…') }}
									</NcButton>
									<NcButton
										v-if="!isSavingFilter"
										:disabled="!isFilterActive"
										:wide="true"
										@click="clearFilterFromPopover">
										{{ t('deck', 'Clear filter') }}
									</NcButton>
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
									<div class="filter--facet-view">
										<template v-if="filterView === 'tags'">
											<div class="filter--heading">
												<h3>{{ t('deck', 'Tags') }}</h3>
												<div
													v-if="filter.tags.length > 1"
													class="filter--match"
													role="radiogroup"
													:aria-label="t('deck', 'Show cards with any or all of the selected tags')">
													<NcCheckboxRadioSwitch
														v-for="mode in ['any', 'all']"
														:key="mode"
														:modelValue="filter.tagMatch"
														type="radio"
														name="filter-tagMatch"
														:value="mode"
														:buttonVariant="true"
														buttonVariantGrouped="horizontal"
														:data-cy-match="`tags-${mode}`"
														@update:modelValue="setMatchMode('tagMatch', mode)">
														{{ mode === 'any' ? t('deck', 'Any') : t('deck', 'All') }}
													</NcCheckboxRadioSwitch>
												</div>
											</div>
											<div
												v-for="label in labelsSorted"
												:key="label.id"
												class="filter--item filter--item-excludable"
												:class="{ 'filter--item-excluded': filter.excludedTags.includes(label.id) }">
												<input
													:id="label.id"
													v-model="filter.tags"
													type="checkbox"
													class="checkbox"
													:value="label.id"
													@change="setFilter">
												<label :for="label.id"><span class="label" :style="labelStyle(label)">{{ label.title }}</span></label>
												<NcButton
													class="filter--hide"
													variant="tertiary"
													size="small"
													:pressed="filter.excludedTags.includes(label.id)"
													:aria-label="t('deck', 'Hide cards with tag {tag}', { tag: label.title })"
													:title="t('deck', 'Hide cards with this tag')"
													@update:pressed="toggleExcluded('excludedTags', 'tags', label.id)">
													<template #icon>
														<MinusCircleIcon v-if="filter.excludedTags.includes(label.id)" :size="18" />
														<MinusCircleOutlineIcon v-else :size="18" />
													</template>
												</NcButton>
											</div>
										</template>
										<template v-else-if="filterView === 'users'">
											<div class="filter--heading">
												<h3>{{ t('deck', 'Assigned to') }}</h3>
												<div
													v-if="filter.users.length > 1"
													class="filter--match"
													role="radiogroup"
													:aria-label="t('deck', 'Show cards assigned to any or all of the selected users')">
													<NcCheckboxRadioSwitch
														v-for="mode in ['any', 'all']"
														:key="mode"
														:modelValue="filter.userMatch"
														type="radio"
														name="filter-userMatch"
														:value="mode"
														:buttonVariant="true"
														buttonVariantGrouped="horizontal"
														:data-cy-match="`users-${mode}`"
														@update:modelValue="setMatchMode('userMatch', mode)">
														{{ mode === 'any' ? t('deck', 'Any') : t('deck', 'All') }}
													</NcCheckboxRadioSwitch>
												</div>
											</div>
											<div class="filter--item">
												<input
													id="unassigned"
													v-model="filter.unassigned"
													type="checkbox"
													class="checkbox"
													value="unassigned"
													@change="setFilter"
													@click="beforeSetFilter">
												<label for="unassigned">{{ t('deck', 'Unassigned') }}</label>
											</div>
											<div
												v-for="user in usersSorted"
												:key="user.uid"
												class="filter--item filter--item-excludable"
												:class="{ 'filter--item-excluded': filter.excludedUsers.includes(user.uid) }">
												<input
													:id="user.uid"
													v-model="filter.users"
													type="checkbox"
													class="checkbox"
													:value="user.uid"
													@change="setFilter">
												<label :for="user.uid"><NcAvatar
													:user="user.uid"
													:size="24"
													:disableMenu="true"
													:hideStatus="true" /> {{ user.uid === currentUserId ? t('deck', '{name} (you)', { name: user.displayname }) : user.displayname }}</label>
												<NcButton
													class="filter--hide"
													variant="tertiary"
													size="small"
													:pressed="filter.excludedUsers.includes(user.uid)"
													:aria-label="t('deck', 'Hide cards assigned to {user}', { user: user.displayname })"
													:title="t('deck', 'Hide cards assigned to this user')"
													@update:pressed="toggleExcluded('excludedUsers', 'users', user.uid)">
													<template #icon>
														<MinusCircleIcon v-if="filter.excludedUsers.includes(user.uid)" :size="18" />
														<MinusCircleOutlineIcon v-else :size="18" />
													</template>
												</NcButton>
											</div>
										</template>
										<template v-else-if="filterView === 'status'">
											<div class="filter--heading">
												<h3>{{ t('deck', 'Status') }}</h3>
											</div>
											<div class="filter--item">
												<input
													id="filter-option-both"
													v-model="filter.completed"
													type="radio"
													name="filter-status"
													class="radio"
													value="both"
													@change="setFilter"
													@click="beforeSetFilter">
												<label for="filter-option-both">{{ t('deck', 'Open and completed') }}</label>
											</div>
											<div class="filter--item">
												<input
													id="filter-option-open"
													v-model="filter.completed"
													type="radio"
													name="filter-status"
													class="radio"
													value="open"
													@change="setFilter"
													@click="beforeSetFilter">
												<label for="filter-option-open">{{ t('deck', 'Open') }}</label>
											</div>

											<div class="filter--item">
												<input
													id="filter-option-completed"
													v-model="filter.completed"
													type="radio"
													name="filter-status"
													class="radio"
													value="completed"
													@change="setFilter"
													@click="beforeSetFilter">
												<label for="filter-option-completed">{{ t('deck', 'Completed') }}</label>
											</div>
										</template>
										<template v-else>
											<div class="filter--heading">
												<h3>{{ t('deck', 'Due date') }}</h3>
											</div>
											<div class="filter--item">
												<input
													id="overdue"
													v-model="filter.due"
													type="radio"
													name="filter-due"
													class="radio"
													value="overdue"
													@change="setFilter"
													@click="beforeSetFilter">
												<label for="overdue">{{ t('deck', 'Overdue') }}</label>
											</div>

											<div class="filter--item">
												<input
													id="dueToday"
													v-model="filter.due"
													type="radio"
													name="filter-due"
													class="radio"
													value="dueToday"
													aria-describedby="filter-due-next-hint"
													@change="setFilter"
													@click="beforeSetFilter">
												<label for="dueToday">{{ t('deck', 'Next 24 hours') }}</label>
											</div>

											<div class="filter--item">
												<input
													id="dueWeek"
													v-model="filter.due"
													type="radio"
													name="filter-due"
													class="radio"
													value="dueWeek"
													aria-describedby="filter-due-next-hint"
													@change="setFilter"
													@click="beforeSetFilter">
												<label for="dueWeek">{{ t('deck', 'Next 7 days') }}</label>
											</div>

											<div class="filter--item">
												<input
													id="dueMonth"
													v-model="filter.due"
													type="radio"
													name="filter-due"
													class="radio"
													value="dueMonth"
													aria-describedby="filter-due-next-hint"
													@change="setFilter"
													@click="beforeSetFilter">
												<label for="dueMonth">{{ t('deck', 'Next 30 days') }}</label>
											</div>

											<p id="filter-due-next-hint" class="filter--hint">
												{{ t('deck', 'Counted from now, without overdue cards') }}
											</p>

											<div class="filter--item">
												<input
													id="dueCalendarWeek"
													:checked="filter.due === 'calendarWeek'"
													type="radio"
													name="filter-due"
													class="radio"
													value="calendarWeek"
													@click="togglePeriod('calendarWeek')">
												<label for="dueCalendarWeek">{{ t('deck', 'Calendar week') }}</label>
											</div>
											<!-- the period controls belong to the option right above them -->
											<div v-if="filter.due === 'calendarWeek'" class="filter--due-options">
												<DueDateRangeFilter
													mode="calendarWeek"
													:from="filter.dueFrom"
													:to="filter.dueTo"
													@update="updateDueRange" />
												<div class="filter--item">
													<input
														id="due-include-overdue"
														v-model="filter.dueIncludeOverdue"
														type="checkbox"
														class="checkbox"
														@change="setFilter">
													<label for="due-include-overdue">{{ t('deck', 'Also show overdue open cards') }}</label>
												</div>
											</div>

											<div class="filter--item">
												<input
													id="duePeriod"
													:checked="isDuePeriod"
													type="radio"
													name="filter-due"
													class="radio"
													value="period"
													@click="togglePeriod('calendarMonth')">
												<label for="duePeriod">{{ t('deck', 'Month or date range') }}</label>
											</div>
											<div v-if="isDuePeriod" class="filter--due-options">
												<div
													class="filter--match"
													role="radiogroup"
													:aria-label="t('deck', 'Kind of period')">
													<NcCheckboxRadioSwitch
														v-for="option in dueRangeOptions"
														:key="option.value"
														:modelValue="filter.due"
														type="radio"
														name="filter-due-period"
														:value="option.value"
														:buttonVariant="true"
														buttonVariantGrouped="horizontal"
														:data-cy-period="option.value"
														@update:modelValue="choosePeriod(option.value)">
														{{ option.label }}
													</NcCheckboxRadioSwitch>
												</div>
												<DueDateRangeFilter
													:mode="filter.due"
													:from="filter.dueFrom"
													:to="filter.dueTo"
													@update="updateDueRange" />
												<div class="filter--item">
													<input
														id="due-include-overdue"
														v-model="filter.dueIncludeOverdue"
														type="checkbox"
														class="checkbox"
														@change="setFilter">
													<label for="due-include-overdue">{{ t('deck', 'Also show overdue open cards') }}</label>
												</div>
											</div>

											<div class="filter--item">
												<input
													id="noDue"
													v-model="filter.due"
													type="radio"
													name="filter-due"
													class="radio"
													value="noDue"
													@change="setFilter"
													@click="beforeSetFilter">
												<label for="noDue">{{ t('deck', 'No due date') }}</label>
											</div>
										</template>
									</div>
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
import { showError, showUndo } from '@nextcloud/dialogs'
import { subscribe, unsubscribe } from '@nextcloud/event-bus'
import { NcActionButton, NcActions, NcActionSeparator, NcAvatar, NcButton, NcCheckboxRadioSwitch, NcModal, NcPopover, NcTextField } from '@nextcloud/vue'
import { vOnClickOutside } from '@vueuse/components'
import { mapActions, mapState, mapWritableState } from 'pinia'
import AccountMultipleIcon from 'vue-material-design-icons/AccountMultipleOutline.vue'
import ArchiveIcon from 'vue-material-design-icons/ArchiveOutline.vue'
import ArrowCollapseVerticalIcon from 'vue-material-design-icons/ArrowCollapseVertical.vue'
import ArrowExpandVerticalIcon from 'vue-material-design-icons/ArrowExpandVertical.vue'
import ArrowLeftIcon from 'vue-material-design-icons/ArrowLeft.vue'
import CalendarIcon from 'vue-material-design-icons/CalendarOutline.vue'
import ChartGanttIcon from 'vue-material-design-icons/ChartGantt.vue'
import CheckIcon from 'vue-material-design-icons/Check.vue'
import CheckCircleIcon from 'vue-material-design-icons/CheckCircleOutline.vue'
import ChevronRightIcon from 'vue-material-design-icons/ChevronRight.vue'
import FilterOffIcon from 'vue-material-design-icons/FilterOffOutline.vue'
import FilterIcon from 'vue-material-design-icons/FilterOutline.vue'
import ImageIcon from 'vue-material-design-icons/ImageMultipleOutline.vue'
import MinusCircleIcon from 'vue-material-design-icons/MinusCircle.vue'
import MinusCircleOutlineIcon from 'vue-material-design-icons/MinusCircleOutline.vue'
import TableColumnPlusAfter from 'vue-material-design-icons/TableColumnPlusAfter.vue'
import TagIcon from 'vue-material-design-icons/TagOutline.vue'
import TrashIcon from 'vue-material-design-icons/TrashCanOutline.vue'
import ViewColumnIcon from 'vue-material-design-icons/ViewColumn.vue'
import CreateNewCardCustomPicker from '../views/CreateNewCardCustomPicker.vue'
import DueDateRangeFilter from './DueDateRangeFilter.vue'
import SessionList from './SessionList.vue'
import { describeFilter, filterParts, filtersEqual } from '../helpers/boardFilter.js'
import { periodAround } from '../helpers/periods.js'
import labelStyle from '../mixins/labelStyle.js'
import { isNotifyPushEnabled } from '../sessions.js'
import { emptyFilter, rememberMatchModes, useBoardStore } from '../stores/board.js'
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
		NcCheckboxRadioSwitch,
		NcPopover,
		NcTextField,
		NcAvatar,
		ArchiveIcon,
		ImageIcon,
		FilterIcon,
		FilterOffIcon,
		ArrowLeftIcon,
		ChevronRightIcon,
		MinusCircleIcon,
		MinusCircleOutlineIcon,
		ArrowCollapseVerticalIcon,
		ArrowExpandVerticalIcon,
		ViewColumnIcon,
		ChartGanttIcon,
		NcActionSeparator,
		TableColumnPlusAfter,
		TrashIcon,
		CheckIcon,
		SessionList,
		DueDateRangeFilter,
	},

	directives: {
		vOnClickOutside,
	},

	mixins: [labelStyle],
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
			// a copy of the store's filter, which may have been restored for this board
			filter: JSON.parse(JSON.stringify(useBoardStore().filter)),
			showAddCardModal: false,
			isSavingFilter: false,
			// null for the overview, otherwise the facet shown: 'tags', 'users', 'status' or 'due'
			filterView: null,
			// the store filter as this popover last wrote it, to tell its own changes from others'
			lastWrittenFilter: null,
			filterAnnouncement: '',
			announceTimeout: null,
			skipAnnouncement: false,
			savedFilterName: '',
			defaultPageTitle: false,
			isNotifyPushEnabled: isNotifyPushEnabled(),
		}
	},

	computed: {
		...mapState(useBoardStore, { storeFilter: 'filter' }),
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

		savedFilterRows() {
			return this.savedFilters.map((saved) => ({
				saved,
				summary: describeFilter(saved.filter, this.board),
				active: filtersEqual(this.filter, saved.filter, periodAround, { anyPeriod: true }),
			}))
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
			const value = (kinds, hiddenPrefix) => parts
				.filter((part) => kinds.includes(part.kind) || part.id.startsWith(hiddenPrefix))
				.map((part) => part.label)
				.join(' · ')
			return [
				{ id: 'tags', label: t('deck', 'Tags'), icon: TagIcon, value: value(['tags'], 'hidden-tag-') },
				{ id: 'users', label: t('deck', 'Assigned to'), icon: AccountMultipleIcon, value: value(['users', 'unassigned'], 'hidden-user-') },
				{ id: 'status', label: t('deck', 'Status'), icon: CheckCircleIcon, value: value(['status'], '-') },
				{ id: 'due', label: t('deck', 'Due date'), icon: CalendarIcon, value: value(['due'], '-') },
			]
		},

		/**
		 * The saved filter that saving under the typed name would replace; names ignore case.
		 *
		 * @return {object|undefined}
		 */
		replacedSavedFilter() {
			const name = this.savedFilterName.trim().toLowerCase()
			return name ? this.savedFilters.find((saved) => saved.name.toLowerCase() === name) : undefined
		},

		dueRangeOptions() {
			return [
				{ value: 'calendarMonth', label: t('deck', 'Month') },
				{ value: 'range', label: t('deck', 'Range') },
			]
		},

		isDuePeriod() {
			// the calendar week has an option of its own, being what most people look for
			return ['calendarMonth', 'range'].includes(this.filter.due)
		},

		isFilterActive() {
			return this.filter.tags.length !== 0 || this.filter.users.length !== 0 || this.filter.excludedTags.length !== 0 || this.filter.excludedUsers.length !== 0 || this.filter.due !== '' || this.filter.completed !== 'both'
		},

		labelsSorted() {
			return [...this.board.labels].sort((a, b) => (a.title < b.title) ? -1 : 1)
		},

		currentUserId() {
			return getCurrentUser()?.uid
		},

		usersSorted() {
			// filtering for one's own cards is the most common user filter, so offer it first
			return [...this.board.users].sort((a, b) => (b.uid === this.currentUserId) - (a.uid === this.currentUserId))
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
			this.filter = JSON.parse(JSON.stringify(this.storeFilter))
		},

		storeFilter: {
			deep: true,
			handler(storeFilter) {
				// the filter can also change outside the popover (filter chips, clicking a tag on a card).
				// Adopt only those changes: the popover's own writes can lag behind its local state.
				const current = JSON.stringify(storeFilter)
				if (current !== this.lastWrittenFilter && current !== JSON.stringify(this.filter)) {
					this.filter = JSON.parse(current)
				}
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
		...mapActions(useBoardStore, { setViewMode: 'setViewMode', toggleShowArchived: 'toggleShowArchived', storeSetFilter: 'setFilterInStore', setCurrentBoardSetting: 'setCurrentBoardSetting' }),
		...mapActions(useStackStore, ['createStack']),
		...mapActions(useSettingsStore, {
			setSearchQuery: 'setSearchQuery',
			setShortcutLock: 'toggleShortcutLock',
			setNavShown: 'toggleNav',
			toggleCompact: 'toggleCompactMode',
			toggleCardCover: 'toggleShowCardCover',
			setConfig: 'setConfig',
		}),

		beforeSetFilter(e) {
			if (this.filter.due === e.target.value) {
				this.filter.due = ''
				this.setFilterInStore({ ...this.filter })
			}
			if (e.target.value === 'unassigned') {
				this.filter.users = []
				this.setFilterInStore({ ...this.filter })
			}
			this.setFilterInStore({ ...this.filter })
		},

		setFilter() {
			if (this.filter.users.length > 0) {
				this.filter.unassigned = false
			}
			// selecting an entry takes it out of the excluded ones
			this.filter.excludedTags = this.filter.excludedTags.filter((id) => !this.filter.tags.includes(id))
			this.filter.excludedUsers = this.filter.excludedUsers.filter((uid) => !this.filter.users.includes(uid))
			this.$nextTick(() => this.setFilterInStore({ ...this.filter }))
		},

		/**
		 * Switch between calendar week, calendar month and custom range. Weeks and months start at the
		 * current one; a custom range keeps the dates shown before.
		 *
		 * @param {string} mode 'calendarWeek', 'calendarMonth' or 'range'
		 */
		choosePeriod(mode) {
			this.filter.due = mode
			if (mode !== 'range') {
				const { from, to } = periodAround(mode)
				this.filter.dueFrom = from
				this.filter.dueTo = to
			}
			this.setFilterInStore({ ...this.filter })
		},

		/**
		 * Like the other due date options, choosing the calendar week or "Month or date range"
		 * again turns it off.
		 *
		 * @param {string} mode 'calendarWeek', or 'calendarMonth' as the start of "Month or date range"
		 */
		togglePeriod(mode) {
			const active = mode === 'calendarWeek' ? this.filter.due === 'calendarWeek' : this.isDuePeriod
			if (active) {
				this.filter.due = ''
				this.setFilterInStore({ ...this.filter })
			} else {
				this.choosePeriod(mode)
			}
		},

		async storeSavedFilters(savedFilters) {
			const previous = this.savedFilters
			this.setCurrentBoardSetting('savedFilters', savedFilters)
			try {
				await this.setConfig({ [`board:${this.board.id}:savedFilters`]: savedFilters })
			} catch (e) {
				this.setCurrentBoardSetting('savedFilters', previous)
				showError(t('deck', 'The saved filters could not be updated'))
				throw e
			}
		},

		/**
		 * Write the popover's filter to the store, remembering the result.
		 *
		 * @param {object} filter filter values to write
		 */
		setFilterInStore(filter) {
			this.lastWrittenFilter = JSON.stringify({ ...this.storeFilter, ...filter })
			this.storeSetFilter(filter)
		},

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
			this.focusInFilter('.filter--saved-apply, .filter--facet, .filter--facet-view input:not([disabled]), .filter--facet-view button:not([disabled])')
		},

		/**
		 * Show one facet's controls instead of the overview, like the narrow filter menu of Files.
		 *
		 * @param {string} facet 'tags', 'users', 'status' or 'due'
		 */
		openFacet(facet) {
			this.filterView = facet
			this.$nextTick(() => {
				// start at the chosen option: on an unchecked radio, an arrow key would change the filter
				const view = this.$refs.filterContent?.querySelector('.filter--facet-view')
				const target = view?.querySelector('.filter--item input[type="radio"]:checked')
					?? view?.querySelector('.filter--item input:not([type="radio"]):not([disabled])')
					?? view?.querySelector('input:not([disabled]), button:not([disabled])')
				target?.focus()
			})
		},

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

		startSavingFilter() {
			this.isSavingFilter = true
			this.$nextTick(() => this.$refs.savedFilterName?.focus())
		},

		clearFilterFromPopover() {
			this.clearFilter()
			// the clear button disables itself, so keep focus in the popover
			this.focusFirstFilterControl()
		},

		async saveFilter() {
			const name = this.savedFilterName.trim()
			const filter = { ...this.filter }
			// weeks and months are saved as "the current one", custom ranges with their dates
			if (filter.due === 'calendarWeek' || filter.due === 'calendarMonth') {
				filter.dueFrom = ''
				filter.dueTo = ''
			}
			const others = this.savedFilters.filter((saved) => saved.name.toLowerCase() !== name.toLowerCase())
			await this.storeSavedFilters([...others, { name, filter }])
			this.isSavingFilter = false
			this.savedFilterName = ''
			// focus the new entry, which also scrolls it into view as confirmation
			this.focusInFilter('.filter--saved-apply', others.length)
		},

		cancelSaveFilter() {
			this.isSavingFilter = false
			this.savedFilterName = ''
			this.$nextTick(() => this.$refs.saveFilterButton?.$el.focus())
		},

		applySavedFilter(saved) {
			this.clearFilter()
			Object.assign(this.filter, saved.filter)
			if (this.filter.due === 'calendarWeek' || this.filter.due === 'calendarMonth') {
				const { from, to } = periodAround(this.filter.due)
				this.filter.dueFrom = from
				this.filter.dueTo = to
			}
			this.setFilterInStore({ ...this.filter })
		},

		deleteSavedFilter(index) {
			const before = this.savedFilters
			const remaining = before.filter((saved, i) => i !== index)
			this.storeSavedFilters(remaining)
			showUndo(t('deck', 'Saved filter "{name}" deleted', { name: before[index].name }), () => this.storeSavedFilters(before))
			if (remaining.length > 0) {
				this.focusInFilter('.filter--saved-apply', index)
			} else {
				this.focusFirstFilterControl()
			}
		},

		setMatchMode(key, mode) {
			this.filter[key] = mode
			if (this.board) {
				rememberMatchModes(this.board.id, this.filter)
			}
			this.setFilterInStore({ ...this.filter })
		},

		toggleExcluded(excludedKey, selectedKey, value) {
			const excluded = this.filter[excludedKey]
			if (excluded.includes(value)) {
				this.filter[excludedKey] = excluded.filter((v) => v !== value)
			} else {
				this.filter[excludedKey] = [...excluded, value]
				this.filter[selectedKey] = this.filter[selectedKey].filter((v) => v !== value)
			}
			this.setFilterInStore({ ...this.filter })
		},

		updateDueRange({ from, to }) {
			this.filter.dueFrom = from
			this.filter.dueTo = to
			this.setFilterInStore({ ...this.filter })
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
			const filterReset = emptyFilter(this.board?.id ?? null)
			this.setFilterInStore({ ...filterReset })
			this.filter = filterReset
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
			this.$refs.filterPopover.$el.click()
		},

		triggerClearFilter() {
			this.clearFilter()
		},

		triggerFilterByMe() {
			if (this.isFilterActive) {
				this.clearFilter()
			} else {
				this.filter.users = [getCurrentUser().uid]
				this.setFilter()
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

	.filter--item {
		input + label {
			display: block;
			padding: var(--default-grid-baseline) 0;
			.avatardiv {
				vertical-align: middle;
				margin-bottom: 2px;
				margin-inline-end: 3px;
			}
			.label {
				padding: 5px;
				border-radius: 3px;
			}
		}
	}

	.filter {
		width: 280px;
		max-height: calc(100vh - 150px);
		position: relative;
		overflow: auto;
		padding: 8px;
	}

	.filter--item-excludable {
		display: flex;
		align-items: center;

		input + label {
			flex: 1;
			min-width: 0;
		}
	}

	.filter--item-excluded input + label {
		text-decoration: line-through;
		opacity: .7;
	}

	.filter--saved {
		display: flex;
		align-items: center;
		gap: var(--default-grid-baseline);
	}

	.filter--facets {
		margin: 0 0 var(--default-grid-baseline);
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

	button.filter--saved-apply {
		display: flex;
		flex: 1;
		align-items: flex-start;
		gap: calc(2 * var(--default-grid-baseline));
		min-width: 0;
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

		&[aria-pressed='true'] {
			background: var(--color-primary-element-light);
			color: var(--color-primary-element-light-text);

			.filter--saved-summary {
				color: inherit;
			}
		}
	}

	.filter--saved-icon {
		flex-shrink: 0;
		margin-top: 2px;
	}

	.filter--saved-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.filter--saved-name,
	.filter--saved-summary {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.filter--saved-summary {
		color: var(--color-text-maxcontrast);
		font-size: var(--font-size-small, 13px);
	}

	.filter--save {
		display: flex;
		flex-direction: column;
		gap: var(--default-grid-baseline);
		margin-bottom: var(--default-grid-baseline);
	}

	.filter--save-hint {
		margin: 0;
		color: var(--color-text-maxcontrast);
		font-size: var(--font-size-small, 13px);
	}

	.filter--hint {
		margin: 0 0 var(--default-grid-baseline);
		// in line with the option labels
		padding-inline-start: calc(var(--default-clickable-area) - var(--default-grid-baseline));
		color: var(--color-text-maxcontrast);
		font-size: var(--font-size-small, 13px);
	}

	.filter--save-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--default-grid-baseline);
	}

	.filter--due-options {
		margin-block-end: calc(2 * var(--default-grid-baseline));
		margin-inline-start: calc(4 * var(--default-grid-baseline));
	}

	.filter--match {
		display: flex;
		margin-bottom: var(--default-grid-baseline);

		// stretched segments would only be clickable on their text, so they keep their size
	}

	.filter--heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: calc(2 * var(--default-grid-baseline));
		// room for the any/all switch, so the row keeps its height when the switch appears
		min-height: calc(var(--default-clickable-area) + 4px);
		margin-top: calc(3 * var(--default-grid-baseline));

		&:first-child {
			margin-top: 0;
		}

		h3 {
			margin: 0;
			font-size: var(--default-font-size);
			font-weight: bold;
			line-height: var(--default-clickable-area);
		}

		.filter--match {
			flex: 0 0 auto;
			margin: 0;

			> * {
				flex: none;
			}
		}
	}

	// hide buttons only take attention where a pointer can reveal them; touch screens keep showing them
	@media (hover: hover) {
		.filter--item-excludable .filter--hide {
			transition: opacity var(--animation-quick) ease-out;
		}

		.filter--item-excludable .filter--hide:not([aria-pressed='true']) {
			opacity: 0;
		}

		.filter--item-excludable:hover .filter--hide,
		.filter--item-excludable:focus-within .filter--hide {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.filter--item-excludable .filter--hide {
			transition: none;
		}
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
