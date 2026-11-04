<!--
  - SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
	<div ref="root" class="filter-facet" :data-cy-facet-view="facet">
		<template v-if="facet === 'tags'">
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
					:checked="filter.tags.includes(label.id)"
					type="checkbox"
					class="checkbox"
					:value="label.id"
					@change="toggleSelected('tags', 'excludedTags', label.id, $event.target.checked)">
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

		<template v-else-if="facet === 'users'">
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
					:checked="filter.unassigned"
					type="checkbox"
					class="checkbox"
					value="unassigned"
					@change="toggleUnassigned($event.target.checked)">
				<label for="unassigned">{{ t('deck', 'Unassigned') }}</label>
			</div>
			<div
				v-for="user in usersSorted"
				:key="user.uid"
				class="filter--item filter--item-excludable"
				:class="{ 'filter--item-excluded': filter.excludedUsers.includes(user.uid) }">
				<input
					:id="user.uid"
					:checked="filter.users.includes(user.uid)"
					type="checkbox"
					class="checkbox"
					:value="user.uid"
					@change="toggleSelected('users', 'excludedUsers', user.uid, $event.target.checked)">
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

		<template v-else-if="facet === 'status'">
			<div class="filter--heading">
				<h3>{{ t('deck', 'Status') }}</h3>
			</div>
			<div v-for="option in statusOptions" :key="option.value" class="filter--item">
				<input
					:id="`filter-option-${option.value}`"
					:checked="filter.completed === option.value"
					type="radio"
					name="filter-status"
					class="radio"
					:value="option.value"
					@change="setStatus(option.value)">
				<label :for="`filter-option-${option.value}`">{{ option.label }}</label>
			</div>
		</template>

		<template v-else>
			<div class="filter--heading">
				<h3>{{ t('deck', 'Due date') }}</h3>
			</div>
			<div v-for="option in dueOptions" :key="option.value" class="filter--item">
				<input
					:id="option.value"
					:checked="filter.due === option.value"
					type="radio"
					name="filter-due"
					class="radio"
					:value="option.value"
					:aria-describedby="option.counted ? 'filter-due-next-hint' : null"
					@click="chooseDue(option.value)">
				<label :for="option.value">{{ option.label }}</label>
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
						:checked="filter.dueIncludeOverdue"
						type="checkbox"
						class="checkbox"
						@change="setFilterValues({ dueIncludeOverdue: $event.target.checked })">
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
						v-for="option in periodOptions"
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
						:checked="filter.dueIncludeOverdue"
						type="checkbox"
						class="checkbox"
						@change="setFilterValues({ dueIncludeOverdue: $event.target.checked })">
					<label for="due-include-overdue">{{ t('deck', 'Also show overdue open cards') }}</label>
				</div>
			</div>

			<div class="filter--item">
				<input
					id="noDue"
					:checked="filter.due === 'noDue'"
					type="radio"
					name="filter-due"
					class="radio"
					value="noDue"
					@click="chooseDue('noDue')">
				<label for="noDue">{{ t('deck', 'No due date') }}</label>
			</div>
		</template>
	</div>
</template>

<script>
import { getCurrentUser } from '@nextcloud/auth'
import { NcAvatar, NcButton, NcCheckboxRadioSwitch } from '@nextcloud/vue'
import { mapActions, mapState } from 'pinia'
import MinusCircleIcon from 'vue-material-design-icons/MinusCircle.vue'
import MinusCircleOutlineIcon from 'vue-material-design-icons/MinusCircleOutline.vue'
import DueDateRangeFilter from '../DueDateRangeFilter.vue'
import { periodAround } from '../../helpers/periods.js'
import labelStyle from '../../mixins/labelStyle.js'
import { rememberMatchModes, useBoardStore } from '../../stores/board.js'

/**
 * The options of one part of the board filter (tags, assigned users, status or due date).
 * Shown as a page of the filter menu, or in its own popover in the filter bar of wide boards.
 * Changes go straight to the board store.
 */
export default {
	name: 'FilterFacet',

	components: {
		DueDateRangeFilter,
		MinusCircleIcon,
		MinusCircleOutlineIcon,
		NcAvatar,
		NcButton,
		NcCheckboxRadioSwitch,
	},

	mixins: [labelStyle],

	props: {
		board: {
			type: Object,
			required: true,
		},

		/** 'tags', 'users', 'status' or 'due' */
		facet: {
			type: String,
			required: true,
		},
	},

	// a choice that completes the facet, like a status or a fixed due date period
	emits: ['chosen'],

	computed: {
		...mapState(useBoardStore, ['filter']),

		labelsSorted() {
			return [...this.board.labels].sort((a, b) => (a.title < b.title) ? -1 : 1)
		},

		currentUserId() {
			return getCurrentUser()?.uid
		},

		usersSorted() {
			// filtering for one's own cards is the most common user filter, so offer it first
			return [...this.board.users].sort((a, b) => (b.uid === this.currentUserId) - (a.uid === this.currentUserId)
				|| a.displayname.localeCompare(b.displayname))
		},

		statusOptions() {
			return [
				{ value: 'both', label: t('deck', 'Open and completed') },
				{ value: 'open', label: t('deck', 'Open') },
				{ value: 'completed', label: t('deck', 'Completed') },
			]
		},

		dueOptions() {
			return [
				{ value: 'overdue', label: t('deck', 'Overdue') },
				{ value: 'dueToday', label: t('deck', 'Next 24 hours'), counted: true },
				{ value: 'dueWeek', label: t('deck', 'Next 7 days'), counted: true },
				{ value: 'dueMonth', label: t('deck', 'Next 30 days'), counted: true },
			]
		},

		periodOptions() {
			return [
				{ value: 'calendarMonth', label: t('deck', 'Month') },
				{ value: 'range', label: t('deck', 'Range') },
			]
		},

		isDuePeriod() {
			// the calendar week has an option of its own, being what most people look for
			return ['calendarMonth', 'range'].includes(this.filter.due)
		},
	},

	methods: {
		...mapActions(useBoardStore, ['setFilterValues']),

		/**
		 * Move focus to where work in this facet starts: the chosen option, as an arrow key on an
		 * unchecked radio button would change the filter, otherwise the first option.
		 */
		focusStart() {
			this.$nextTick(() => {
				const root = this.$refs.root
				const target = root?.querySelector('.filter--item input[type="radio"]:checked')
					?? root?.querySelector('.filter--item input:not([disabled])')
				target?.focus()
			})
		},

		/**
		 * Select or deselect a tag or user; selecting one takes it out of the hidden ones.
		 *
		 * @param {string} selectedKey 'tags' or 'users'
		 * @param {string} excludedKey 'excludedTags' or 'excludedUsers'
		 * @param {number|string} value tag id or user id
		 * @param {boolean} checked whether it is selected now
		 */
		toggleSelected(selectedKey, excludedKey, value, checked) {
			const selected = this.filter[selectedKey].filter((other) => other !== value)
			const values = { [selectedKey]: checked ? [...selected, value] : selected }
			if (checked) {
				values[excludedKey] = this.filter[excludedKey].filter((other) => other !== value)
				if (selectedKey === 'users') {
					values.unassigned = false
				}
			}
			this.setFilterValues(values)
		},

		toggleUnassigned(checked) {
			this.setFilterValues(checked ? { unassigned: true, users: [] } : { unassigned: false })
		},

		setMatchMode(key, mode) {
			this.setFilterValues({ [key]: mode })
			rememberMatchModes(this.board.id, this.filter)
		},

		toggleExcluded(excludedKey, selectedKey, value) {
			const excluded = this.filter[excludedKey]
			if (excluded.includes(value)) {
				this.setFilterValues({ [excludedKey]: excluded.filter((other) => other !== value) })
			} else {
				this.setFilterValues({
					[excludedKey]: [...excluded, value],
					[selectedKey]: this.filter[selectedKey].filter((other) => other !== value),
				})
			}
		},

		setStatus(completed) {
			this.setFilterValues({ completed })
			this.$emit('chosen')
		},

		/**
		 * Choose a fixed due date period; like a toggle, choosing the chosen one again turns it off.
		 *
		 * @param {string} due 'overdue', 'dueToday', 'dueWeek', 'dueMonth' or 'noDue'
		 */
		chooseDue(due) {
			this.setFilterValues(this.filter.due === due
				? { due: '', dueFrom: '', dueTo: '', dueIncludeOverdue: false }
				: { due, dueFrom: '', dueTo: '', dueIncludeOverdue: false })
			this.$emit('chosen')
		},

		/**
		 * Switch between calendar week, calendar month and custom range. Weeks and months start at the
		 * current one; a custom range keeps the dates shown before.
		 *
		 * @param {string} mode 'calendarWeek', 'calendarMonth' or 'range'
		 */
		choosePeriod(mode) {
			if (mode === 'range') {
				this.setFilterValues({ due: mode })
			} else {
				const { from, to } = periodAround(mode)
				this.setFilterValues({ due: mode, dueFrom: from, dueTo: to })
			}
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
				this.setFilterValues({ due: '', dueFrom: '', dueTo: '', dueIncludeOverdue: false })
			} else {
				this.choosePeriod(mode)
			}
		},

		updateDueRange({ from, to }) {
			this.setFilterValues({ dueFrom: from, dueTo: to })
		},
	},
}
</script>

<style lang="scss" scoped>
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

.filter--hint {
	margin: 0 0 var(--default-grid-baseline);
	// in line with the option labels
	padding-inline-start: calc(var(--default-clickable-area) - var(--default-grid-baseline));
	color: var(--color-text-maxcontrast);
	font-size: var(--font-size-small, 13px);
}

.filter--due-options {
	margin-block-end: calc(2 * var(--default-grid-baseline));
	margin-inline-start: calc(4 * var(--default-grid-baseline));
}

.filter--match {
	display: flex;
	// stretched segments would only be clickable on their text, so they keep their size
	margin-bottom: var(--default-grid-baseline);
}

.filter--heading {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: calc(2 * var(--default-grid-baseline));
	// room for the any/all switch, so the row keeps its height when the switch appears
	min-height: calc(var(--default-clickable-area) + 4px);

	h3 {
		margin: 0;
		font-size: var(--default-font-size);
		font-weight: bold;
		line-height: var(--default-clickable-area);
	}

	.filter--match {
		flex: 0 0 auto;
		margin: 0;
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
</style>
