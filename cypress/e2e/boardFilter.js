/**
 * SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { randUser } from '../utils/index.js'

const user = randUser()

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

		it('Only offers a match mode once two tags are selected', function() {
			cy.get('#filter-option-tags-any').should('not.exist')

			cy.get('.filter label:contains("To review")').click()

			cy.get('#filter-option-tags-all').should('be.checked')
		})

		it('Requires all selected tags by default', function() {
			cy.get('.filter label:contains("To review")').click()

			cy.get('.board .card').should('have.length', 1)
			cy.get('.board .card:contains("Finished and review")').should('be.visible')
		})

		it('Shows cards with any selected tag when switched', function() {
			cy.get('.filter label:contains("To review")').click()
			cy.get('label[for="filter-option-tags-any"]').click()

			cy.get('.board .card').should('have.length', 3)
			cy.get('.board .card:contains("No tags")').should('not.exist')
		})

		it('Resets the match mode when the filter is cleared', function() {
			cy.get('.filter label:contains("To review")').click()
			cy.get('label[for="filter-option-tags-any"]').click()

			cy.get('.filter button:contains("Clear filter")').click()
			cy.get('.board .card').should('have.length', 4)
			cy.get('.filter label:contains("Finished")').click()
			cy.get('.filter label:contains("To review")').click()

			cy.get('#filter-option-tags-all').should('be.checked')
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

		it('Only offers a match mode once two users are selected', function() {
			cy.get('#filter-option-users-all').should('not.exist')

			cy.get(`label[for="${bob.userId}"]`).click()

			cy.get('#filter-option-users-any').should('be.checked')
		})

		it('Shows cards assigned to any selected user by default', function() {
			cy.get(`label[for="${bob.userId}"]`).click()

			cy.get('.board .card').should('have.length', 3)
			cy.get('.board .card:contains("Nobody")').should('not.exist')
		})

		it('Requires all selected users when switched', function() {
			cy.get(`label[for="${bob.userId}"]`).click()
			cy.get('label[for="filter-option-users-all"]').click()

			cy.get('.board .card').should('have.length', 1)
			cy.get('.board .card:contains("Alice and Bob")').should('be.visible')
		})

		it('Resets the match mode when the filter is cleared', function() {
			cy.get(`label[for="${bob.userId}"]`).click()
			cy.get('label[for="filter-option-users-all"]').click()

			cy.get('.filter button:contains("Clear filter")').click()
			cy.get('.board .card').should('have.length', 4)
			cy.get(`label[for="${alice.userId}"]`).click()
			cy.get(`label[for="${bob.userId}"]`).click()

			cy.get('#filter-option-users-any').should('be.checked')
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
			cy.get('label[for="calendarWeek"]').click()

			cy.get('[data-cy-due-range-period]').should('contain', 'Week 44, 2026')
			cy.get('.board .card').should('have.length', 1)
			cy.get('.board .card:contains("Due Oct 27")').should('be.visible')

			// Vue ignores events not newer than their listener, which a frozen clock guarantees
			cy.tick(1000)
			cy.get('[aria-label="Next week"]').click()

			cy.get('[data-cy-due-range-period]').should('contain', 'Week 45, 2026')
			cy.get('.board .card').should('have.length', 1)
			cy.get('.board .card:contains("Due Nov 4")').should('be.visible')
		})

		it('Starts at the current month and steps through months', function() {
			cy.get('label[for="calendarMonth"]').click()

			cy.get('[data-cy-due-range-period]').should('contain', 'October 2026')
			cy.get('.board .card').should('have.length', 1)

			// Vue ignores events not newer than their listener, which a frozen clock guarantees
			cy.tick(1000)
			cy.get('[aria-label="Next month"]').click()

			cy.get('[data-cy-due-range-period]').should('contain', 'November 2026')
			cy.get('.board .card').should('have.length', 2)
			cy.get('.board .card:contains("Due Nov 30 late")').should('be.visible')
		})

		it('Includes both whole days of a custom range', function() {
			cy.get('label[for="range"]').click()
			cy.get('#due-range-from').type('2026-11-04')
			cy.get('#due-range-to').type('2026-11-30')

			cy.get('.board .card').should('have.length', 2)
			cy.get('.board .card:contains("Due Nov 4")').should('be.visible')
			cy.get('.board .card:contains("Due Nov 30 late")').should('be.visible')
		})

		it('Leaves the range open when only one end is set', function() {
			cy.get('label[for="range"]').click()
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
