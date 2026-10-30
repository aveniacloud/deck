/**
 * SPDX-FileCopyrightText: 2019 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { addCommands } from '@nextcloud/e2e-test-server/cypress'

addCommands()

const url = Cypress.config('baseUrl').replace(/\/index.php\/?$/g, '')
Cypress.expose('baseUrl', url)

// prepare main cypress window so we can use axios there
// and it will successfully fetch csrf tokens when needed.
window.OC = {
	config: { modRewriteWorking: false },
}
// Prevent @nextcloud/router from reading window.location
window._oc_webroot = url

Cypress.Commands.add('openLeftSidebar', () => {
	cy.get('.app-navigation button.app-navigation-toggle').click()
})

Cypress.Commands.add('deckCreateBoard', ({ user, password }, title) => {
	cy.login(user, password)

	cy.get('.app-navigation button.app-navigation-toggle').click()
	cy.get('#app-navigation-vue .app-navigation__list .app-navigation-entry')
		.eq(3)
		.find('a')
		.first()
		.click({ force: true })

	cy.get('.board-create form input[type=text]').type(title, { force: true })

	cy.get('.board-create form input[type=submit]')
		.first()
		.click({ force: true })
})

Cypress.Commands.add('deckCreateList', ({ user, password }, title) => {
	cy.login(user, password)

	cy.get('.app-navigation button.app-navigation-toggle').click()
	cy.get('#app-navigation-vue .app-navigation__list .app-navigation-entry')
		.eq(3)
		.find('a.app-navigation-entry-link')
		.first()
		.click({ force: true })

	cy.get('#stack-add button').first().click()
	cy.get('#stack-add form input#new-stack-input-main').type(title)
	cy.get('#stack-add form input[type=submit]').first().click()
})

Cypress.Commands.add('createExampleBoard', ({ user, board }) => {
	const auth = {
		username: user.userId,
		password: user.password,
	}
	cy.request({
		method: 'POST',
		url: `${Cypress.expose('baseUrl')}/index.php/apps/deck/api/v1.0/boards`,
		auth,
		body: { title: board.title, color: board.color ?? 'ff0000' },
	}).then((boardResponse) => {
		expect(boardResponse.status).to.eq(200)
		const boardData = boardResponse.body
		// share before creating cards, as only board participants can be assigned
		for (const participant of board.shareWith ?? []) {
			cy.request({
				method: 'POST',
				url: `${Cypress.expose('baseUrl')}/index.php/apps/deck/api/v1.0/boards/${boardData.id}/acl`,
				auth,
				body: { type: 0, participant, permissionEdit: true, permissionShare: false, permissionManage: false },
			})
		}
		for (const stackIndex in board.stacks) {
			const stack = board.stacks[stackIndex]
			cy.request({
				method: 'POST',
				url: `${Cypress.expose('baseUrl')}/index.php/apps/deck/api/v1.0/boards/${boardData.id}/stacks`,
				auth,
				body: { title: stack.title, order: 0 },
			}).then((stackResponse) => {
				const stackData = stackResponse.body
				for (const cardIndex in stack.cards) {
					const card = stack.cards[cardIndex]
					cy.request({
						method: 'POST',
						url: `${Cypress.expose('baseUrl')}/index.php/apps/deck/api/v1.0/boards/${boardData.id}/stacks/${stackData.id}/cards`,
						auth,
						body: { title: card.title, description: card.description ?? '' },
					}).then((cardResponse) => {
						// labels are given by title and must be among the board's default labels
						for (const labelTitle of card.labels ?? []) {
							const label = boardData.labels.find((l) => l.title === labelTitle)
							cy.request({
								method: 'PUT',
								url: `${Cypress.expose('baseUrl')}/index.php/apps/deck/api/v1.0/boards/${boardData.id}/stacks/${stackData.id}/cards/${cardResponse.body.id}/assignLabel`,
								auth,
								body: { labelId: label.id },
							})
						}
						for (const userId of card.assignedUsers ?? []) {
							cy.request({
								method: 'PUT',
								url: `${Cypress.expose('baseUrl')}/index.php/apps/deck/api/v1.0/boards/${boardData.id}/stacks/${stackData.id}/cards/${cardResponse.body.id}/assignUser`,
								auth,
								body: { userId },
							})
						}
					})
				}
			})
		}
		cy.wrap(boardData)
	})
})

Cypress.Commands.add('getNavigationEntry', (boardTitle) => {
	return cy.get('[data-cy-navigation-category="deck-navigation-all"]').parent()
		.find('ul.app-navigation-entry__children .app-navigation-entry:contains(' + boardTitle + ')')
		.find('a.app-navigation-entry-link')
})

Cypress.Commands.add('shareBoardWithUi', (query, userId = query) => {
	cy.intercept({ method: 'GET', url: `**/ocs/v2.php/core/autocomplete/get?search=${query}*` }).as('fetchRecipients')
	cy.get('[aria-label="Open details"]').click()
	cy.get('.app-sidebar').should('be.visible')

	// eslint-disable-next-line cypress/no-unnecessary-waiting -- ensure the events are bound
	cy.wait(1000)

	cy.get('.select input').click()
	cy.get('.select input').type(`${query}`)
	cy.wait('@fetchRecipients', { timeout: 7000 })

	cy.get('.vs__dropdown-menu .option').first().contains(query)
	cy.get('.select input').type('{enter}')

	cy.get('.shareWithList').contains(userId)
})

Cypress.Commands.add('setUserEmail', (user, value) => {
	return cy.request({
		method: 'PUT',
		url: `${url}/ocs/v2.php/cloud/users/${user.userId}`,
		auth: {
			username: user.userId,
			password: user.password,
		},
		headers: {
			'OCS-APIRequest': 'true',
		},
		body: { key: 'email', value },
	})
})
