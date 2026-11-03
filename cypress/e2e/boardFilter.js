/**
 * SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { randUser } from '../utils/index.js'

const user = randUser()

// the any/all switch keeps its radio input visually hidden; click its label like a user would
const chooseMatch = (mode) => cy.get(`input[data-cy-match="${mode}"]`).parent().click()
const choosePeriodKind = (kind) => cy.get(`input[data-cy-period="${kind}"]`).parent().click()

// sampleBoard() only ships one card, so searching would have nothing to discriminate
const filterBoard = {
	title: 'FilterBoard',
	color: '00ff00',
	stacks: [
		{
			title: 'TestList',
			cards: [
				{ title: 'Alpha task' },
				{ title: 'Beta task' },
				{ title: 'Gamma thing' },
			],
		},
	],
}

const tagBoard = {
	title: 'TagFilterBoard',
	color: '0000ff',
	stacks: [
		{
			title: 'TestList',
			cards: [
				{ title: 'Finished and review', labels: ['Finished', 'To review'] },
				{ title: 'Finished and action', labels: ['Finished', 'Action needed'] },
				{ title: 'Review only', labels: ['To review'] },
				{ title: 'No tags' },
			],
		},
	],
}

const alice = randUser()
const bob = randUser()

const userBoard = {
	title: 'UserFilterBoard',
	color: '00ffff',
	shareWith: [alice.userId, bob.userId],
	stacks: [
		{
			title: 'TestList',
			cards: [
				{ title: 'Alice and Bob', assignedUsers: [alice.userId, bob.userId] },
				{ title: 'Alice only', assignedUsers: [alice.userId] },
				{ title: 'Bob only', assignedUsers: [bob.userId] },
				{ title: 'Nobody' },
			],
		},
	],
}

const inHours = (hours) => new Date(Date.now() + hours * 3600 * 1000).toISOString()

const dateBoard = {
	title: 'DateFilterBoard',
	color: 'ff00ff',
	stacks: [
		{
			title: 'TestList',
			cards: [
				{ title: 'Overdue', duedate: inHours(-24) },
				{ title: 'In three hours', duedate: inHours(3) },
				{ title: 'In five days', duedate: inHours(5 * 24) },
				{ title: 'In twenty days', duedate: inHours(20 * 24) },
				{ title: 'In fifty days', duedate: inHours(50 * 24) },
				{ title: 'Undated' },
			],
		},
	],
}

// Fixed dates around a frozen "today" (Wednesday 2026-10-28, ISO week 44), in local time
const localIso = (month, day, hour) => new Date(2026, month - 1, day, hour).toISOString()
const today = new Date(2026, 9, 28, 12).getTime()

const rangeBoard = {
	title: 'DateRangeFilterBoard',
	color: 'ffff00',
	stacks: [
		{
			title: 'TestList',
			cards: [
				{ title: 'Due Oct 27', duedate: localIso(10, 27, 10) },
				{ title: 'Due Nov 4', duedate: localIso(11, 4, 10) },
				{ title: 'Due Nov 30 late', duedate: localIso(11, 30, 22) },
				{ title: 'Due Dec 1', duedate: localIso(12, 1, 9) },
				{ title: 'Undated' },
			],
		},
	],
}

const otherBoard = {
	title: 'UnrelatedBoard',
	color: 'ff0000',
	stacks: [],
}

describe('Board filter', function() {
	let boardId
	let tagBoardId
	let userBoardId
	let dateBoardId
	let rangeBoardId

	before(function() {
		cy.createUser(user)
		cy.createUser(alice)
		cy.createUser(bob)
		cy.login(user)
		cy.createExampleBoard({ user, board: filterBoard }).then((board) => {
			boardId = board.id
		})
		cy.createExampleBoard({ user, board: tagBoard }).then((board) => {
			tagBoardId = board.id
		})
		cy.createExampleBoard({ user, board: userBoard }).then((board) => {
			userBoardId = board.id
		})
		cy.createExampleBoard({ user, board: dateBoard }).then((board) => {
			dateBoardId = board.id
		})
		cy.createExampleBoard({ user, board: rangeBoard }).then((board) => {
			rangeBoardId = board.id
		})
		cy.createExampleBoard({ user, board: otherBoard })
	})

	describe('On a board', function() {
		beforeEach(function() {
			cy.login(user)
			cy.visit(`/apps/deck/#/board/${boardId}`)
			cy.get('.board .card').should('have.length', 3)
		})

		it('Filters cards as you type', function() {
			cy.get('#deck-search-input').type('Alpha')

			cy.get('.board .card').should('have.length', 1)
			cy.get('.board .card:contains("Alpha task")').should('be.visible')
		})

		it('Restores all cards when the filter is cleared', function() {
			cy.get('#deck-search-input').type('Alpha')
			cy.get('.board .card').should('have.length', 1)

			cy.get('.board-search .input-field__trailing-button').click()

			cy.get('#deck-search-input').should('have.value', '')
			cy.get('.board .card').should('have.length', 3)
		})

		it('Supports the title: prefix', function() {
			cy.get('#deck-search-input').type('title:Gamma')

			cy.get('.board .card').should('have.length', 1)
			cy.get('.board .card:contains("Gamma thing")').should('be.visible')
		})

		// Not asserting where focus lands: core's unified search also claims Ctrl+F unless
		// the path is in its appHandlesSearchShortcut list, so that depends on the server
		// version. Deck owns only that this no longer throws, which Cypress checks for us.
		it('Handles Ctrl+F without throwing', function() {
			cy.get('body').type('{ctrl}f')

			cy.get('#deck-search-input').should('exist')
		})
	})

	describe('By tag', function() {
		beforeEach(function() {
			cy.login(user)
			cy.visit(`/apps/deck/#/board/${tagBoardId}`)
			cy.get('.board .card').should('have.length', 4)
			cy.get('[aria-label="Apply filter"]').click()
			cy.get('.filter label:contains("Finished")').click()
		})

		it('Offers the match mode once two tags are selected', function() {
			cy.get('input[data-cy-match="tags-any"]').should('not.exist')

			cy.get('.filter label:contains("To review")').click()

			cy.get('.filter--heading:contains("Tags") input[data-cy-match="tags-all"]').should('be.checked')
		})

		it('Announces how many cards are shown', function() {
			cy.get('p.hidden-visually[aria-live]').should('contain', '2 cards shown')
		})

		it('Returns focus to the filter button when the popover is closed with Escape', function() {
			cy.focused().type('{esc}')

			cy.get('.filter').should('not.be.visible')
			cy.focused().should('have.attr', 'aria-label', 'Apply filter')
		})

		it('Keeps focus in the popover after clearing the filter', function() {
			cy.get('.filter button:contains("Clear filter")').click()

			cy.focused().should('match', '.filter--item input')
			cy.get('p.hidden-visually[aria-live]').should('contain', '4 cards shown')
		})

		it('Requires all selected tags by default', function() {
			cy.get('.filter label:contains("To review")').click()

			cy.get('.board .card').should('have.length', 1)
			cy.get('.board .card:contains("Finished and review")').should('be.visible')
		})

		it('Shows cards with any selected tag when switched', function() {
			cy.get('.filter label:contains("To review")').click()
			chooseMatch('tags-any')

			cy.get('.board .card').should('have.length', 3)
			cy.get('.board .card:contains("No tags")').should('not.exist')
		})

		it('Remembers the match mode after clearing and reloading', function() {
			cy.get('.filter label:contains("To review")').click()
			chooseMatch('tags-any')

			cy.get('.filter button:contains("Clear filter")').click()
			cy.get('.board .card').should('have.length', 4)
			cy.get('.filter label:contains("Finished")').click()
			cy.get('.filter label:contains("To review")').click()
			cy.get('input[data-cy-match="tags-any"]').should('be.checked')

			// the filter itself is kept after reloading, too
			cy.reload()
			cy.get('.board .card').should('have.length', 3)
			cy.get('[aria-label="Apply filter"]').click()
			cy.get('input[data-cy-match="tags-any"]').should('be.checked')
		})
	})

	describe('By assigned user', function() {
		beforeEach(function() {
			cy.login(user)
			cy.visit(`/apps/deck/#/board/${userBoardId}`)
			cy.get('.board .card').should('have.length', 4)
			cy.get('[aria-label="Apply filter"]').click()
			cy.get(`label[for="${alice.userId}"]`).click()
		})

		it('Offers the match mode once two users are selected', function() {
			cy.get('input[data-cy-match="users-all"]').should('not.exist')

			cy.get(`label[for="${bob.userId}"]`).click()

			cy.get('input[data-cy-match="users-any"]').should('be.checked')
		})

		it('Lists the current user first, marked as such', function() {
			cy.get('#unassigned').parent().next().should('contain', `${user.userId} (you)`)
		})

		it('Shows cards assigned to any selected user by default', function() {
			cy.get(`label[for="${bob.userId}"]`).click()

			cy.get('.board .card').should('have.length', 3)
			cy.get('.board .card:contains("Nobody")').should('not.exist')
		})

		it('Requires all selected users when switched', function() {
			cy.get(`label[for="${bob.userId}"]`).click()
			chooseMatch('users-all')

			cy.get('.board .card').should('have.length', 1)
			cy.get('.board .card:contains("Alice and Bob")').should('be.visible')
		})

		it('Keeps the match mode when the filter is cleared', function() {
			cy.get(`label[for="${bob.userId}"]`).click()
			chooseMatch('users-all')

			cy.get('.filter button:contains("Clear filter")').click()
			cy.get('.board .card').should('have.length', 4)
			cy.get(`label[for="${alice.userId}"]`).click()
			cy.get(`label[for="${bob.userId}"]`).click()
			cy.get('input[data-cy-match="users-all"]').should('be.checked')
		})
	})

	describe('Active filter chips', function() {
		beforeEach(function() {
			cy.login(user)
			cy.visit(`/apps/deck/#/board/${tagBoardId}`)
			cy.get('.board .card').should('have.length', 4)
		})

		it('Shows no chips without a filter', function() {
			cy.get('.active-filters').should('not.exist')
		})

		it('Shows the filter as chips and removes it from there', function() {
			cy.get('[aria-label="Apply filter"]').click()
			cy.get('.filter label:contains("Finished")').click()
			cy.get('.filter label:contains("To review")').click()
			cy.get('[aria-label="Hide cards with tag Action needed"]').click()

			cy.get('.active-filters li').should('have.length', 2)
			cy.get('.active-filters li').eq(0).should('contain', 'Finished and To review')
			cy.get('.active-filters li').eq(1).should('contain', 'Not: Action needed')

			cy.get('[aria-label="Remove filter Tags: Finished and To review"]').click()

			cy.get('.active-filters li').should('have.length', 1)
			cy.focused().should('have.attr', 'aria-label', 'Remove filter Not: Action needed')
			cy.get('.filter label:contains("Finished")').parent().find('input').should('not.be.checked')
			cy.get('.board .card').should('have.length', 3)
		})

		it('Returns focus to the filter button when the last chip is removed', function() {
			cy.get('[aria-label="Apply filter"]').click()
			cy.get('.filter label:contains("Finished")').click()
			cy.get('[aria-label="Apply filter"]').click()

			cy.get('[aria-label="Remove filter Tags: Finished"]').click()

			cy.get('.active-filters').should('not.exist')
			cy.focused().should('have.attr', 'aria-label', 'Apply filter')
		})

		it('Clears everything from the chip bar', function() {
			cy.get('[aria-label="Apply filter"]').click()
			cy.get('.filter label:contains("Finished")').click()
			cy.get('label[for="filter-option-open"]').click()
			cy.get('[aria-label="Remove filter Status: Open"]').should('exist')

			cy.get('.active-filters button:contains("Clear filter")').click()

			cy.get('.active-filters').should('not.exist')
			cy.get('.board .card').should('have.length', 4)
			cy.get('#filter-option-both').should('be.checked')
		})

		it('Explains an empty result and offers to widen "all" to "any"', function() {
			cy.get('[aria-label="Apply filter"]').click()
			cy.get('.filter label:contains("Finished")').click()
			cy.get('.active-filters__empty').should('not.exist')
			cy.get('.filter label:contains("Finished")').click()
			cy.get('.filter label:contains("To review")').click()
			cy.get('.filter label:contains("Action needed")').click()

			cy.get('.board .card').should('have.length', 0)
			cy.get('.active-filters__empty').should('contain', 'No cards match')
			cy.get('.active-filters button:contains("Show cards with any of these tags")').click()

			cy.get('.board .card').should('have.length', 3)
			cy.get('.active-filters__empty').should('not.exist')
			cy.focused().should('have.attr', 'aria-label', 'Remove filter Tags: To review or Action needed')
			cy.get('input[data-cy-match="tags-any"]').should('be.checked')
		})

		it('Keeps the filter after a reload until it is cleared', function() {
			cy.get('[aria-label="Apply filter"]').click()
			cy.get('.filter label:contains("Finished")').click()
			cy.get('.board .card').should('have.length', 2)

			cy.reload()

			cy.get('.active-filters li').should('contain', 'Finished')
			cy.get('.board .card').should('have.length', 2)
			cy.get('.active-filters button:contains("Clear filter")').click()
			cy.reload()

			cy.get('.board .card').should('have.length', 4)
			cy.get('.active-filters').should('not.exist')
		})

		it('Ticks a tag in the popover after clicking it on a card', function() {
			cy.get('.board .card:contains("Review only") .labels span:contains("To review")').click()

			cy.get('.active-filters li').should('contain', 'To review')
			cy.get('[aria-label="Apply filter"]').click()
			cy.get('.filter label:contains("To review")').parent().find('input').should('be.checked')
		})
	})

	describe('Hiding tags and users', function() {
		it('Reveals the hide buttons only on hover or focus, unless pressed', function() {
			cy.login(user)
			cy.visit(`/apps/deck/#/board/${tagBoardId}`)
			cy.get('[aria-label="Apply filter"]').click()

			cy.get('[aria-label="Hide cards with tag Later"]').should('have.css', 'opacity', '0')
			cy.get('[aria-label="Hide cards with tag Later"]').focus()
			cy.get('[aria-label="Hide cards with tag Later"]').should('have.css', 'opacity', '1')
			cy.get('[aria-label="Hide cards with tag Later"]').click()
			cy.get('.filter label:contains("Finished")').click()
			cy.get('[aria-label="Hide cards with tag Later"]').should('have.css', 'opacity', '1')
		})

		it('Hides cards that carry a hidden tag', function() {
			cy.login(user)
			cy.visit(`/apps/deck/#/board/${tagBoardId}`)
			cy.get('.board .card').should('have.length', 4)
			cy.get('[aria-label="Apply filter"]').click()

			cy.get('[aria-label="Hide cards with tag Finished"]').click()

			cy.get('.board .card').should('have.length', 2)
			cy.get('.board .card:contains("Review only")').should('be.visible')
			cy.get('.board .card:contains("No tags")').should('be.visible')
			cy.get('.filter-button').should('have.class', 'button-vue--primary')
		})

		it('Hides cards assigned to a hidden user', function() {
			cy.login(user)
			cy.visit(`/apps/deck/#/board/${userBoardId}`)
			cy.get('.board .card').should('have.length', 4)
			cy.get('[aria-label="Apply filter"]').click()

			cy.get(`[aria-label="Hide cards assigned to ${bob.userId}"]`).click()

			cy.get('.board .card').should('have.length', 2)
			cy.get('.board .card:contains("Alice only")').should('be.visible')
			cy.get('.board .card:contains("Nobody")').should('be.visible')
		})

		it('Selecting a hidden tag shows its cards again', function() {
			cy.login(user)
			cy.visit(`/apps/deck/#/board/${tagBoardId}`)
			cy.get('.board .card').should('have.length', 4)
			cy.get('[aria-label="Apply filter"]').click()
			cy.get('[aria-label="Hide cards with tag Finished"]').click()
			cy.get('.board .card').should('have.length', 2)

			cy.get('.filter label:contains("Finished")').click()

			cy.get('[aria-label="Hide cards with tag Finished"]').should('have.attr', 'aria-pressed', 'false')
			cy.get('.board .card').should('have.length', 2)
			cy.get('.board .card:contains("Finished and review")').should('be.visible')
			cy.get('.board .card:contains("Finished and action")').should('be.visible')
		})
	})

	describe('Saved filters', function() {
		it('Cancels saving without storing anything', function() {
			cy.login(user)
			cy.visit(`/apps/deck/#/board/${tagBoardId}`)
			cy.get('.board .card').should('have.length', 4)
			cy.get('[aria-label="Apply filter"]').click()
			cy.get('.filter label:contains("Finished")').click()

			cy.get('.filter button:contains("Save filter")').click()
			cy.focused().should('match', '.filter--save input')
			cy.focused().type('Not kept')
			cy.get('.filter--save button:contains("Cancel")').click()

			cy.focused().should('contain', 'Save filter')
			cy.get('.filter--save').should('not.exist')
			cy.get('.filter--saved').should('not.exist')
			cy.get('.filter button:contains("Save filter")').should('be.visible')
		})

		it('Saves, applies after a reload and deletes a filter', function() {
			cy.login(user)
			cy.visit(`/apps/deck/#/board/${tagBoardId}`)
			cy.get('.board .card').should('have.length', 4)
			cy.get('[aria-label="Apply filter"]').click()
			cy.get('.filter label:contains("Finished")').click()
			cy.get('.filter label:contains("To review")').click()
			chooseMatch('tags-any')
			cy.get('.board .card').should('have.length', 3)

			cy.get('.filter button:contains("Save filter")').click()
			cy.get('.filter--save input').type('Finished or review')
			cy.intercept('POST', '**/config/board:*:savedFilters').as('saveFilters')
			cy.get('.filter--save button[type="submit"]').click()
			cy.wait('@saveFilters').its('response.statusCode').should('eq', 200)
			cy.get('.filter--saved:contains("Finished or review")').should('be.visible')

			cy.reload()
			// the applied filter is kept after reloading
			cy.get('.board .card').should('have.length', 3)
			cy.get('[aria-label="Apply filter"]').click()
			cy.get('.filter--saved-apply:contains("Finished or review")')
				.should('have.attr', 'aria-pressed', 'true')
				.should('contain', 'Finished or To review')
				.click()

			cy.get('.board .card').should('have.length', 3)
			cy.get('input[data-cy-match="tags-any"]').should('be.checked')
			cy.get('.filter--saved-apply:contains("Finished or review")').should('have.attr', 'aria-pressed', 'true')
			cy.get('.active-filters li').first().should('contain', 'Finished or review')
			cy.get('.active-filters li').first().find('[aria-label="Remove saved filter Finished or review"]').should('exist')

			// changing the filter means the saved one no longer applies
			chooseMatch('tags-all')
			cy.get('.filter--saved-apply:contains("Finished or review")').should('have.attr', 'aria-pressed', 'false')
			chooseMatch('tags-any')

			cy.get('[aria-label="Delete saved filter Finished or review"]').click()
			cy.wait('@saveFilters')
			cy.get('.filter--saved').should('not.exist')

			// the deletion can be undone from the notification
			// the toast classes are generated CSS module names, so find it by its message
			cy.contains('Saved filter "Finished or review" deleted').parent().contains('button', 'Undo').click()
			cy.wait('@saveFilters')
			cy.get('.filter--saved:contains("Finished or review")').should('be.visible')
			cy.get('[aria-label="Delete saved filter Finished or review"]').click()
			cy.wait('@saveFilters')
			cy.get('.filter--saved').should('not.exist')
			cy.reload()
			cy.get('[aria-label="Apply filter"]').click()
			cy.get('.filter--saved').should('not.exist')
		})
	})

	describe('By due date', function() {
		beforeEach(function() {
			cy.login(user)
			cy.visit(`/apps/deck/#/board/${dateBoardId}`)
			cy.get('.board .card').should('have.length', 6)
		})

		it('Leaves overdue cards out of the next 7 days', function() {
			cy.get('[aria-label="Apply filter"]').click()
			cy.get('label[for="dueWeek"]').click()

			cy.get('.board .card').should('have.length', 2)
			cy.get('.board .card:contains("Overdue")').should('not.exist')
		})

		it('Leaves overdue cards out of the next 24 hours', function() {
			cy.get('[aria-label="Apply filter"]').click()
			cy.get('label[for="dueToday"]').click()

			cy.get('.board .card').should('have.length', 1)
			cy.get('.board .card:contains("In three hours")').should('be.visible')
		})

		it('Leaves overdue cards out of the next 30 days', function() {
			cy.get('[aria-label="Apply filter"]').click()
			cy.get('label[for="dueMonth"]').click()

			cy.get('.board .card').should('have.length', 3)
			cy.get('.board .card:contains("Overdue")').should('not.exist')
		})

		it('Keeps the status filter when a due date option is picked', function() {
			cy.get('[aria-label="Apply filter"]').click()
			cy.get('label[for="filter-option-open"]').click()
			cy.get('label[for="overdue"]').click()

			cy.get('#filter-option-open').should('be.checked')
			cy.get('.board .card').should('have.length', 1)
		})

		it('Supports the date: keywords in the search', function() {
			const expected = {
				'date:overdue': ['Overdue'],
				'date:today': ['In three hours'],
				'date:week': ['In three hours', 'In five days'],
				'date:month': ['In three hours', 'In five days', 'In twenty days'],
				'date:none': ['Undated'],
			}
			for (const [query, titles] of Object.entries(expected)) {
				cy.get('#deck-search-input').clear()
				cy.get('#deck-search-input').type(query)
				cy.get('.board .card').should('have.length', titles.length)
				for (const title of titles) {
					cy.get(`.board .card:contains("${title}")`).should('be.visible')
				}
			}
		})
	})

	describe('By calendar week, month or date range', function() {
		beforeEach(function() {
			cy.clock(today, ['Date'])
			cy.login(user)
			cy.visit(`/apps/deck/#/board/${rangeBoardId}`)
			cy.get('.board .card').should('have.length', 5)
			cy.get('[aria-label="Apply filter"]').click()
		})

		it('Starts at the current calendar week and steps through weeks', function() {
			cy.get('label[for="duePeriod"]').click()

			cy.get('[data-cy-due-range-period]').should('contain', 'Week 44, 2026')
			cy.get('.board .card').should('have.length', 1)
			cy.get('.board .card:contains("Due Oct 27")').should('be.visible')

			// Vue ignores events not newer than their listener, which a frozen clock guarantees
			cy.tick(1000)
			cy.get('.filter [aria-label="Next week"]').click()

			cy.get('[data-cy-due-range-period]').should('contain', 'Week 45, 2026')
			cy.get('.board .card').should('have.length', 1)
			cy.get('.board .card:contains("Due Nov 4")').should('be.visible')
		})

		it('Steps through weeks from the period chip', function() {
			cy.get('label[for="duePeriod"]').click()
			cy.get('.active-filters li').should('contain', 'Week 44, 2026 · Oct 26')

			// Vue ignores events not newer than their listener, which a frozen clock guarantees
			cy.tick(1000)
			cy.get('.active-filters [aria-label="Next week"]').click()

			cy.get('.active-filters li').should('contain', 'Week 45, 2026 · Nov 2')
			cy.get('.board .card').should('have.length', 1)
			cy.get('.board .card:contains("Due Nov 4")').should('be.visible')
			cy.get('[data-cy-due-range-period]').should('contain', 'Week 45, 2026')
		})

		it('Shows the period controls right below their option', function() {
			cy.get('label[for="duePeriod"]').click()

			cy.get('label[for="duePeriod"]').parent().next().find('[data-cy-due-range-period]').should('exist')
		})

		it('Keeps a saved current week recognised while stepping to other weeks', function() {
			cy.get('label[for="duePeriod"]').click()
			cy.get('.filter button:contains("Save filter")').click()
			cy.get('.filter--save-hint').should('contain', 'always shows the current week')
			cy.intercept('POST', '**/config/board:*:savedFilters').as('saveFilters')
			cy.focused().type('Weekly{enter}')
			cy.wait('@saveFilters')
			cy.get('.active-filters li').first().should('contain', 'Weekly')

			// Vue ignores events not newer than their listener, which a frozen clock guarantees
			cy.tick(1000)
			cy.get('.filter [aria-label="Next week"]').click()

			cy.get('.active-filters li').first().should('contain', 'Weekly')
			cy.get('.active-filters li').should('contain', 'Week 45, 2026 · Nov 2')

			cy.get('[aria-label="Delete saved filter Weekly"]').click()
			cy.wait('@saveFilters')
		})

		it('Turns the period off when chosen again', function() {
			cy.get('label[for="duePeriod"]').click()
			cy.get('.board .card').should('have.length', 1)

			cy.get('label[for="duePeriod"]').click()

			cy.get('#duePeriod').should('not.be.checked')
			cy.get('[data-cy-due-range-period]').should('not.exist')
			cy.get('.board .card').should('have.length', 5)
		})

		it('Adds overdue open cards to a period on request', function() {
			cy.get('label[for="duePeriod"]').click()
			// Vue ignores events not newer than their listener, which a frozen clock guarantees
			cy.tick(1000)
			cy.get('.filter [aria-label="Next week"]').click()
			cy.get('.board .card').should('have.length', 1)

			cy.get('label[for="due-include-overdue"]').click()

			cy.get('.board .card').should('have.length', 2)
			cy.get('.board .card:contains("Due Oct 27")').should('be.visible')
			cy.get('.board .card:contains("Due Nov 4")').should('be.visible')
		})

		it('Starts at the current month and steps through months', function() {
			cy.get('label[for="duePeriod"]').click()
			// Vue ignores events not newer than their listener, which a frozen clock guarantees
			cy.tick(1000)
			choosePeriodKind('calendarMonth')

			cy.get('[data-cy-due-range-period]').should('contain', 'October 2026')
			cy.get('.board .card').should('have.length', 1)

			// Vue ignores events not newer than their listener, which a frozen clock guarantees
			cy.tick(1000)
			cy.get('.filter [aria-label="Next month"]').click()

			cy.get('[data-cy-due-range-period]').should('contain', 'November 2026')
			cy.get('.board .card').should('have.length', 2)
			cy.get('.board .card:contains("Due Nov 30 late")').should('be.visible')
		})

		it('Includes both whole days of a custom range', function() {
			cy.get('label[for="duePeriod"]').click()
			// Vue ignores events not newer than their listener, which a frozen clock guarantees
			cy.tick(1000)
			choosePeriodKind('range')
			cy.get('#due-range-from').type('2026-11-04')
			cy.get('#due-range-to').type('2026-11-30')

			cy.get('.board .card').should('have.length', 2)
			cy.get('.board .card:contains("Due Nov 4")').should('be.visible')
			cy.get('.board .card:contains("Due Nov 30 late")').should('be.visible')
		})

		it('Leaves the range open when only one end is set', function() {
			cy.get('label[for="duePeriod"]').click()
			// Vue ignores events not newer than their listener, which a frozen clock guarantees
			cy.tick(1000)
			choosePeriodKind('range')
			// the range starts with the dates of the week shown before
			cy.get('#due-range-to').clear()
			cy.get('#due-range-from').type('2026-11-04')

			cy.get('.board .card').should('have.length', 3)
			cy.get('.board .card:contains("Undated")').should('not.exist')
		})
	})

	describe('On the board list', function() {
		// Assert on specific boards, not a total: new users also get a default board
		beforeEach(function() {
			cy.login(user)
			cy.visit('/apps/deck/#/board')
			cy.get(`.board-list-row:contains("${filterBoard.title}")`).should('be.visible')
			cy.get(`.board-list-row:contains("${otherBoard.title}")`).should('be.visible')
		})

		it('Filters boards by title', function() {
			cy.get('#deck-search-input').type('Unrelated')

			cy.get(`.board-list-row:contains("${otherBoard.title}")`).should('be.visible')
			cy.get(`.board-list-row:contains("${filterBoard.title}")`).should('not.exist')
		})

		it('Restores all boards when the filter is cleared', function() {
			cy.get('#deck-search-input').type('Unrelated')
			cy.get(`.board-list-row:contains("${filterBoard.title}")`).should('not.exist')

			cy.get('.board-search .input-field__trailing-button').click()

			cy.get(`.board-list-row:contains("${filterBoard.title}")`).should('be.visible')
			cy.get(`.board-list-row:contains("${otherBoard.title}")`).should('be.visible')
		})
	})

	describe('On the upcoming overview', function() {
		beforeEach(function() {
			cy.login(user)
			cy.visit('/apps/deck/#/upcoming')
			cy.get('.controls').should('exist')
		})

		it('Has no filter input', function() {
			cy.get('#deck-search-input').should('not.exist')
		})

		// The view that used to throw a TypeError on every Ctrl+F
		it('Handles Ctrl+F without throwing when there is no search field', function() {
			cy.get('body').type('{ctrl}f')

			cy.get('.controls').should('be.visible')
		})
	})
})
