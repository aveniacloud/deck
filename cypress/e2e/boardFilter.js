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

const otherBoard = {
	title: 'UnrelatedBoard',
	color: 'ff0000',
	stacks: [],
}

describe('Board filter', function() {
	let boardId
	let tagBoardId
	let userBoardId

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
