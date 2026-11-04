/**
 * SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import moment from 'moment'
import { defineStore } from 'pinia'
import { CardApi } from '../services/CardApi.js'
import { useBoardStore } from './board.js'
import { useSettingsStore } from './settings.js'
import { useStackStore } from './stack.js'
import { useTrashbinStore } from './trashbin.js'

const apiClient = new CardApi()

export const useCardStore = defineStore('card', {
	state: () => ({
		cards: [],
	}),
	getters: {
		/**
		 * @param state
		 * @return {(id: number, filter?: object) => Array} the cards of a stack that match the board filter
		 * (or the given one, to try out a different filter) and the search
		 */
		cardsByStack(state) {
			return (id, filter = useBoardStore().filter) => state.cards.filter((card) => {
				const { tags, tagMatch, excludedTags = [], users, userMatch, excludedUsers = [], due, dueFrom, dueTo, dueIncludeOverdue, unassigned, completed } = filter
				if (completed === 'open' && card.done !== null) {
					return false
				}
				if (completed === 'completed' && !card.done) {
					return false
				}
				if (card.labels.some((l) => excludedTags.includes(l.id))) {
					return false
				}
				if (card.assignedUsers?.some((u) => excludedUsers.includes(u.participant.uid))) {
					return false
				}

				if (tags.length > 0) {
					const hasTag = (tag) => card.labels.findIndex((l) => l.id === tag) !== -1
					const tagsMatch = tagMatch === 'any' ? tags.some(hasTag) : tags.every(hasTag)
					if (!tagsMatch) {
						return false
					}
				}

				if (users.length > 0) {
					const isAssigned = (user) => card.assignedUsers.findIndex((u) => u.participant.uid === user) !== -1
					const usersMatch = !card?.assignedUsers
						? false
						: (userMatch === 'all' ? users.every(isAssigned) : users.some(isAssigned))
					if (!usersMatch) {
						return false
					}
				}

				if (unassigned && card.assignedUsers.length > 0) {
					return false
				}

				if (due !== '') {
					const datediffHour = ((new Date(card.duedate) - new Date()) / 3600 / 1000)
					switch (due) {
						case 'noDue':
							return (card.duedate === null)
						case 'overdue':
							return (card.overdue === 3)
						case 'dueToday':
							return (datediffHour > 0 && datediffHour <= 24 && card.duedate !== null)
						case 'dueWeek':
							return (datediffHour > 0 && datediffHour <= 7 * 24 && card.duedate !== null)
						case 'dueMonth':
							return (datediffHour > 0 && datediffHour <= 30 * 24 && card.duedate !== null)
						case 'calendarWeek':
						case 'calendarMonth':
						case 'range': {
							if (card.duedate === null) {
								return false
							}
							// from and to are whole local days, both inclusive; an empty bound is open
							const inRange = (!dueFrom || !moment(card.duedate).isBefore(moment(dueFrom, 'YYYY-MM-DD').startOf('day')))
								&& (!dueTo || !moment(card.duedate).isAfter(moment(dueTo, 'YYYY-MM-DD').endOf('day')))
							// overdue open cards are what a review of the period usually has to cover as well
							const overdueOpen = dueIncludeOverdue && datediffHour < 0 && !card.done
							return inRange || overdueOpen
						}
					}
				}

				return true
			})
				.filter((card) => card.stackId === id)
				.filter((card) => {
					if (useSettingsStore().searchQuery === '') {
						return true
					}

					let hasMatch = true
					const matches = useSettingsStore().searchQuery.match(/(?:[^\s"]+|"[^"]*")+/g)

					const filterOutQuotes = (q) => {
						if (q[0] === '"' && q[q.length - 1] === '"') {
							return q.slice(1, -1)
						}
						return q
					}
					for (const match of matches) {
						const [filter, rawQuery] = match.indexOf(':') !== -1 ? match.split(/:(.*)/) : [null, match]
						let query = rawQuery
						const isEmptyQuery = typeof query === 'undefined' || filterOutQuotes(query) === ''

						if (filter === 'title') {
							if (isEmptyQuery) {
								continue
							}
							hasMatch = hasMatch && card.title.toLowerCase().includes(filterOutQuotes(query).toLowerCase())
						} else if (filter === 'description') {
							if (isEmptyQuery) {
								hasMatch = hasMatch && !!card.description
								continue
							}
							hasMatch = hasMatch && card.description.toLowerCase().includes(filterOutQuotes(query).toLowerCase())
						} else if (filter === 'list') {
							if (isEmptyQuery) {
								continue
							}
							const stack = useStackStore().stackById(card.stackId)
							if (!stack) {
								return false
							}
							hasMatch = hasMatch && stack.title.toLowerCase().includes(filterOutQuotes(query).toLowerCase())
						} else if (filter === 'tag') {
							if (isEmptyQuery) {
								hasMatch = hasMatch && card.labels.length > 0
								continue
							}
							hasMatch = hasMatch && card.labels.findIndex((label) => label.title.toLowerCase().includes(filterOutQuotes(query).toLowerCase())) !== -1
						} else if (filter === 'date') {
							const datediffHour = ((new Date(card.duedate) - new Date()) / 3600 / 1000)
							query = filterOutQuotes(query)
							switch (query) {
								case 'overdue':
									hasMatch = hasMatch && (card.overdue === 3)
									break
								case 'today':
									hasMatch = hasMatch && (datediffHour > 0 && datediffHour <= 24 && card.duedate !== null)
									break
								case 'week':
									hasMatch = hasMatch && (datediffHour > 0 && datediffHour <= 7 * 24 && card.duedate !== null)
									break
								case 'month':
									hasMatch = hasMatch && (datediffHour > 0 && datediffHour <= 30 * 24 && card.duedate !== null)
									break
								case 'none':
									hasMatch = hasMatch && (card.duedate === null)
									break
							}

							// keywords are complete conditions, not dates to compare against
							if (['overdue', 'today', 'week', 'month', 'none'].includes(query)) {
								if (!hasMatch) {
									return false
								}
								continue
							}
							if (card.duedate === null) {
								return false
							}
							const comparator = query[0] + (query[1] === '=' ? '=' : '')
							const isValidComparator = ['<', '<=', '>', '>='].indexOf(comparator) !== -1
							const parsedCardDate = moment(card.duedate)
							const parsedDate = moment(query.slice(isValidComparator ? comparator.length : 0))
							switch (comparator) {
								case '<':
									hasMatch = hasMatch && parsedCardDate.isBefore(parsedDate)
									break
								case '<=':
									hasMatch = hasMatch && parsedCardDate.isSameOrBefore(parsedDate)
									break
								case '>':
									hasMatch = hasMatch && parsedCardDate.isAfter(parsedDate)
									break
								case '>=':
									hasMatch = hasMatch && parsedCardDate.isSameOrAfter(parsedDate)
									break
								default:
									hasMatch = hasMatch && parsedCardDate.isSame(parsedDate)
									break
							}
						} else if (filter === 'assigned') {
							if (isEmptyQuery) {
								hasMatch = hasMatch && card.assignedUsers.length > 0
								continue
							}
							hasMatch = hasMatch && card.assignedUsers.findIndex((assignment) => {
								return assignment.participant.primaryKey.toLowerCase() === filterOutQuotes(query).toLowerCase()
									|| assignment.participant.displayname.toLowerCase() === filterOutQuotes(query).toLowerCase()
							}) !== -1
						} else {
							hasMatch = hasMatch && (card.title.toLowerCase().includes(filterOutQuotes(match).toLowerCase())
								|| card.description.toLowerCase().includes(filterOutQuotes(match).toLowerCase()) || card.id === parseInt(filterOutQuotes(match)))
						}
						if (!hasMatch) {
							return false
						}
					}
					return true
				})
				.sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)
		},
		/**
		 * @param state
		 * @return {(boardId: number, options?: {filtered?: boolean, filter?: object}) => number} number of cards the
		 * board shows, respecting whether archived cards are shown; with filtered: false, ignoring the filter and
		 * search; with a filter, the number that filter would show
		 */
		cardCountOnBoard(state) {
			return (boardId, { filtered = true, filter = undefined } = {}) => {
				const showArchived = useBoardStore().showArchived
				return useStackStore().stacksByBoard(boardId).reduce((count, stack) => {
					const cards = filtered ? this.cardsByStack(stack.id, filter) : state.cards.filter((card) => card.stackId === stack.id)
					return count + cards.filter((card) => !!card.archived === showArchived).length
				}, 0)
			}
		},
		cardById: (state) => (id) => {
			return state.cards.find((card) => card.id === id)
		},
	},
	actions: {
		addCardToStore(card) {
			card.labels = card.labels || []
			card.assignedUsers = card.assignedUsers || []
			const existingIndex = this.cards.findIndex((_card) => _card.id === card.id)
			if (existingIndex !== -1) {
				const existingCard = this.cards[existingIndex]
				this.cards[existingIndex] = { ...existingCard, ...card }
			} else {
				this.cards.push(card)
			}
		},
		updateCard(card) {
			const existingIndex = this.cards.findIndex((_card) => _card.id === card.id)
			if (existingIndex !== -1) {
				this.cards[existingIndex] = { ...this.cards[existingIndex], ...card }
			}
		},
		deleteCardFromStore(card) {
			const existingIndex = this.cards.findIndex((_card) => _card.id === card.id)
			if (existingIndex !== -1) {
				this.cards.splice(existingIndex, 1)
			}
		},
		assignCardToUserInStore(user) {
			const existingIndex = this.cards.findIndex((_card) => _card.id === user.cardId)
			if (existingIndex !== -1) {
				this.cards[existingIndex].assignedUsers.push(user)
			}
		},
		removeUserFromCardInStore(user) {
			const existingIndex = this.cards.findIndex((_card) => _card.id === user.cardId)
			if (existingIndex !== -1) {
				const foundIndex = this.cards[existingIndex].assignedUsers.findIndex((_user) => _user.id === user.id)
				if (foundIndex !== -1) {
					this.cards[existingIndex].assignedUsers.splice(foundIndex, 1)
				}
			}
		},
		updateCardProperty({ card, property }) {
			const existingIndex = this.cards.findIndex((_card) => _card.id === card.id)
			if (existingIndex !== -1) {
				this.cards[existingIndex][property] = card[property]
				this.cards[existingIndex].lastModified = Date.now() / 1000
			}
		},
		cardSetAttachmentCount({ cardId, count }) {
			const existingIndex = this.cards.findIndex((_card) => _card.id === cardId)
			if (existingIndex !== -1) {
				this.cards[existingIndex].attachmentCount = count
			}
		},
		cardIncreaseAttachmentCount(cardId) {
			const existingIndex = this.cards.findIndex((_card) => _card.id === cardId)
			if (existingIndex !== -1) {
				this.cards[existingIndex].attachmentCount = this.cards[existingIndex].attachmentCount + 1
			}
		},
		cardDecreaseAttachmentCount(cardId) {
			const existingIndex = this.cards.findIndex((_card) => _card.id === cardId)
			if (existingIndex !== -1) {
				this.cards[existingIndex].attachmentCount = this.cards[existingIndex].attachmentCount - 1
			}
		},
		addNewCard(card) {
			this.cards.push(card)
		},
		setCards(cards) {
			const deletedCards = this.cards.filter((_card) => cards.findIndex((c) => _card.id === c.id) === -1)
			for (const card of deletedCards) {
				this.deleteCardFromStore(card)
			}
			for (const card of cards) {
				this.addCardToStore(card)
			}
		},
		updateCardsReorder(cards) {
			for (const newCard of cards) {
				const existingIndex = this.cards.findIndex((_card) => _card.id === newCard.id)
				if (existingIndex !== -1) {
					this.cards[existingIndex].order = newCard.order
					this.cards[existingIndex].stackId = newCard.stackId
					this.cards[existingIndex].done = newCard.done
				}
			}
		},
		async cloneCard({ cardId, targetStackId }) {
			const createdCard = await apiClient.cloneCard(cardId, targetStackId)
			this.addCardToStore(createdCard)
			return createdCard
		},
		async addCard(card) {
			const createdCard = await apiClient.addCard(card)
			if (card.order !== undefined) {
				for (const existingCard of this.cards) {
					if (existingCard.stackId === createdCard.stackId && existingCard.order >= card.order) {
						existingCard.order = existingCard.order + 1
					}
				}
			}
			this.addCardToStore(createdCard)
			return createdCard
		},
		async updateCardTitle(card) {
			const stack = useStackStore().stackById(card.stackId)
			const updatedCard = await apiClient.updateCard(card, stack.boardId)
			this.updateCardProperty({ card: updatedCard, property: 'title' })
			this.updateCardProperty({ property: 'referenceData', card: updatedCard })
		},
		async moveCard({ card, oldBoardId }) {
			const updatedCard = await apiClient.updateCard(card, oldBoardId)
			this.deleteCardFromStore(updatedCard)
		},
		async deleteCard(card) {
			await apiClient.deleteCard(card.id)
			this.deleteCardFromStore(card)
			useTrashbinStore().moveCardToTrash(card)
		},
		async reorderCard(card) {
			let i = 0
			const newCards = []
			for (const c of this.cardsByStack(card.stackId)) {
				if (i === card.order) {
					i++
				}
				if (c.id !== card.id) {
					newCards.push({ ...c, order: i++ })
				}
			}
			newCards.push(card)
			this.updateCardsReorder(newCards)

			const stack = useStackStore().stackById(card.stackId)
			const cards = await apiClient.reorderCard(card, stack.boardId)
			this.updateCardsReorder(Object.values(cards))
		},
		async archiveUnarchiveCard(card) {
			let call = 'archiveCard'
			if (card.archived === false) {
				call = 'unArchiveCard'
			}

			const updatedCard = await apiClient[call](card)
			this.updateCard(updatedCard)
		},
		async changeCardDoneStatus(card) {
			let call = 'markCardAsDone'
			if (card.done === false) {
				call = 'markCardAsUndone'
			}

			const updatedCard = await apiClient[call](card)
			this.updateCardProperty({ property: 'done', card: updatedCard })

			if (card.done !== false) {
				const stackStore = useStackStore()
				const cardStack = stackStore.stackById(card.stackId)
				const doneStack = stackStore.stacks.find((s) => s.boardId === cardStack?.boardId && s.isDoneColumn)
				if (doneStack && card.stackId !== doneStack.id) {
					await this.reorderCard({ ...updatedCard, stackId: doneStack.id, order: 0 })
				}
			}
		},
		async assignCardToUser({ card, assignee }) {
			const boardId = useBoardStore().currentBoard.id
			const user = await apiClient.assignUser(card.id, assignee.userId, assignee.type, boardId)
			this.assignCardToUserInStore(user)
		},
		async removeUserFromCard({ card, assignee }) {
			const boardId = useBoardStore().currentBoard.id
			const user = await apiClient.removeUser(card.id, assignee.userId, assignee.type, boardId)
			this.removeUserFromCardInStore(user)
		},
		async addLabel(data) {
			data.boardId = useBoardStore().currentBoard.id
			await apiClient.assignLabelToCard(data)
			this.updateCardProperty({ property: 'labels', card: data.card })
		},
		async removeLabel(data) {
			data.boardId = useBoardStore().currentBoard.id
			await apiClient.removeLabelFromCard(data)
			this.updateCardProperty({ property: 'labels', card: data.card })
		},
		async assignDependentCard({ card, dependentCard }) {
			const boardId = useBoardStore().currentBoard.id
			const updatedCard = await apiClient.assignDependentCard(card.id, dependentCard.id, boardId)
			this.updateCardProperty({ property: 'dependentCards', card: updatedCard })
		},
		async removeDependentCard({ card, dependentCardId }) {
			const boardId = useBoardStore().currentBoard.id
			const updatedCard = await apiClient.removeDependentCard(card.id, dependentCardId, boardId)
			this.updateCardProperty({ property: 'dependentCards', card: updatedCard })
		},
		async updateCardDesc(card) {
			const stack = useStackStore().stackById(card.stackId)
			const updatedCard = await apiClient.updateCard(card, stack.boardId)
			this.updateCardProperty({ property: 'description', card: updatedCard })
		},
		async updateCardDue(card) {
			const stack = useStackStore().stackById(card.stackId)
			const updatedCard = await apiClient.updateCard(card, stack.boardId)
			this.updateCardProperty({ property: 'duedate', card: updatedCard })
		},
		async updateCardStartDate(card) {
			const stack = useStackStore().stackById(card.stackId)
			const updatedCard = await apiClient.updateCard(card, stack.boardId)
			this.updateCardProperty({ property: 'startdate', card: updatedCard })
		},
		async updateCardDates(card) {
			const stack = useStackStore().stackById(card.stackId)
			const updatedCard = await apiClient.updateCard(card, stack.boardId)
			this.updateCardProperty({ property: 'duedate', card: updatedCard })
			this.updateCardProperty({ property: 'startdate', card: updatedCard })
		},
		async updateCardColor(card) {
			const stack = useStackStore().stackById(card.stackId)
			const updatedCard = await apiClient.updateCard(card, stack.boardId)
			this.updateCardProperty({ property: 'color', card: updatedCard })
		},
		addCardData(cardData) {
			const card = { ...cardData }
			useStackStore().addStack(card.relatedStack)
			useBoardStore().addBoard(card.relatedBoard)
			delete card.relatedStack
			delete card.relatedBoard
			this.addCardToStore(card)
		},
	},

})
