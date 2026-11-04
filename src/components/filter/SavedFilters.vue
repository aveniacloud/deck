<!--
  - SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
	<div ref="root" class="saved-filters">
		<template v-if="section !== 'save' && savedFilters.length > 0">
			<h3 class="saved-filters__heading">
				{{ t('deck', 'Saved filters') }}
			</h3>
			<ul class="saved-filters__list">
				<li v-for="({ saved, summary, active }, index) in rows" :key="saved.name" class="filter--saved">
					<button
						type="button"
						class="filter--saved-apply"
						:aria-current="active ? 'true' : null"
						:title="summary ? `${saved.name}\n${summary}` : saved.name"
						@click="apply(saved)">
						<CheckIcon v-if="active" class="filter--saved-icon" :size="20" />
						<BookmarkIcon v-else class="filter--saved-icon" :size="20" />
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
						@click="remove(index)">
						<template #icon>
							<TrashIcon :size="18" />
						</template>
					</NcButton>
				</li>
			</ul>
		</template>

		<form v-if="section !== 'list' && isSaving" class="filter--save" @submit.prevent="save">
			<NcTextField
				ref="name"
				v-model="name"
				:label="t('deck', 'Name of the filter')"
				:maxlength="100" />
			<p v-if="replaced" class="filter--save-hint">
				{{ t('deck', 'Replaces the saved filter "{name}".', { name: replaced.name }) }}
			</p>
			<p v-if="filter.due === 'calendarWeek'" class="filter--save-hint">
				{{ t('deck', 'The saved filter always shows the current week.') }}
			</p>
			<p v-else-if="filter.due === 'calendarMonth'" class="filter--save-hint">
				{{ t('deck', 'The saved filter always shows the current month.') }}
			</p>
			<div class="filter--save-actions">
				<NcButton variant="tertiary" @click="cancel">
					{{ t('deck', 'Cancel') }}
				</NcButton>
				<NcButton type="submit" variant="primary" :disabled="name.trim() === ''">
					{{ replaced ? t('deck', 'Replace') : t('deck', 'Save') }}
				</NcButton>
			</div>
		</form>
		<template v-else-if="section !== 'list'">
			<NcButton
				ref="saveButton"
				:disabled="!filterActive"
				:aria-describedby="filterActive ? null : 'saved-filters-hint'"
				:wide="true"
				@click="startSaving">
				{{ t('deck', 'Save filter…') }}
			</NcButton>
			<p v-if="!filterActive" id="saved-filters-hint" class="filter--save-hint">
				{{ t('deck', 'Choose a filter first to save it') }}
			</p>
		</template>
	</div>
</template>

<script>
import { showError, showUndo } from '@nextcloud/dialogs'
import { NcButton, NcTextField } from '@nextcloud/vue'
import { mapActions, mapState } from 'pinia'
import BookmarkIcon from 'vue-material-design-icons/BookmarkOutline.vue'
import CheckIcon from 'vue-material-design-icons/Check.vue'
import TrashIcon from 'vue-material-design-icons/TrashCanOutline.vue'
import { describeFilter, filtersEqual, isFilterActive } from '../../helpers/boardFilter.js'
import { periodAround } from '../../helpers/periods.js'
import { emptyFilter, useBoardStore } from '../../stores/board.js'
import { useSettingsStore } from '../../stores/settings.js'

/**
 * The saved filters of a board for the current user: apply, delete with undo, and save the current filter.
 */
export default {
	name: 'SavedFilters',

	components: {
		BookmarkIcon,
		CheckIcon,
		NcButton,
		NcTextField,
		TrashIcon,
	},

	props: {
		board: {
			type: Object,
			required: true,
		},

		/**
		 * 'all', or only the 'list' of saved filters or the 'save' button and form, for menus that
		 * show them apart; there the parent moves focus between them (saved and removed events)
		 */
		section: {
			type: String,
			default: 'all',
		},
	},

	// saving: whether the form to name a new saved filter is open
	emits: ['applied', 'saving', 'saved', 'removed'],

	data() {
		return {
			isSaving: false,
			name: '',
		}
	},

	computed: {
		...mapState(useBoardStore, ['filter']),

		savedFilters() {
			return this.board.settings?.savedFilters ?? []
		},

		rows() {
			return this.savedFilters.map((saved) => ({
				saved,
				summary: describeFilter(saved.filter, this.board),
				// a saved calendar week or month stays recognised while stepping to other weeks or months
				active: filtersEqual(this.filter, saved.filter, periodAround, { anyPeriod: true }),
			}))
		},

		filterActive() {
			return isFilterActive(this.filter)
		},

		/**
		 * The saved filter that saving under the typed name would replace; names ignore case.
		 *
		 * @return {object|undefined}
		 */
		replaced() {
			const name = this.name.trim().toLowerCase()
			return name ? this.savedFilters.find((saved) => saved.name.toLowerCase() === name) : undefined
		},
	},

	watch: {
		'board.id': function() {
			this.cancel()
		},

		isSaving(saving) {
			this.$emit('saving', saving)
		},
	},

	methods: {
		...mapActions(useBoardStore, ['setFilterValues', 'setCurrentBoardSetting']),
		...mapActions(useSettingsStore, ['setConfig']),

		/**
		 * Focus the first saved filter, or the save button when there is none.
		 */
		focusStart() {
			this.focusAt('.filter--saved-apply', 0, true)
		},

		focusAt(selector, index, fallback = false) {
			this.$nextTick(() => {
				const elements = this.$refs.root?.querySelectorAll(selector) ?? []
				const target = elements[Math.min(index, elements.length - 1)]
				if (target) {
					target.focus()
				} else if (fallback) {
					this.$refs.saveButton?.$el.focus()
				}
			})
		},

		async store(savedFilters) {
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

		apply(saved) {
			const filter = { ...emptyFilter(this.board.id), ...saved.filter }
			if (filter.due === 'calendarWeek' || filter.due === 'calendarMonth') {
				const { from, to } = periodAround(filter.due)
				filter.dueFrom = from
				filter.dueTo = to
			}
			this.setFilterValues(filter)
			this.$emit('applied')
		},

		remove(index) {
			const before = this.savedFilters
			const remaining = before.filter((saved, i) => i !== index)
			this.store(remaining)
			showUndo(t('deck', 'Saved filter "{name}" deleted', { name: before[index].name }), () => this.store(before))
			this.focusAt('.filter--saved-apply', index, this.section === 'all')
			this.$emit('removed', remaining.length)
		},

		startSaving() {
			this.isSaving = true
			this.$nextTick(() => this.$refs.name?.focus())
		},

		async save() {
			const name = this.name.trim()
			const filter = { ...this.filter }
			// weeks and months are saved as "the current one", custom ranges with their dates
			if (filter.due === 'calendarWeek' || filter.due === 'calendarMonth') {
				filter.dueFrom = ''
				filter.dueTo = ''
			}
			const others = this.savedFilters.filter((saved) => saved.name.toLowerCase() !== name.toLowerCase())
			await this.store([...others, { name, filter }])
			this.isSaving = false
			this.name = ''
			// focus the new entry, which also scrolls it into view as confirmation
			if (this.section === 'all') {
				this.focusAt('.filter--saved-apply', others.length)
			}
			this.$emit('saved', others.length)
		},

		cancel() {
			const wasSaving = this.isSaving
			this.isSaving = false
			this.name = ''
			if (wasSaving) {
				this.$nextTick(() => this.$refs.saveButton?.$el.focus())
			}
		},
	},
}
</script>

<style lang="scss" scoped>
.saved-filters {
	display: flex;
	flex-direction: column;
	gap: var(--default-grid-baseline);
}

.saved-filters__heading {
	margin: 0;
	font-size: var(--default-font-size);
	font-weight: bold;
	line-height: var(--default-clickable-area);
}

.saved-filters__list {
	margin: 0;
	padding: 0;
	list-style: none;
}

.filter--saved {
	display: flex;
	align-items: center;
	gap: var(--default-grid-baseline);
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

	&[aria-current='true'] {
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
}

.filter--save-hint {
	margin: 0;
	color: var(--color-text-maxcontrast);
	font-size: var(--font-size-small, 13px);
}

.filter--save-actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--default-grid-baseline);
}
</style>
