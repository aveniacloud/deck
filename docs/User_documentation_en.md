<!--
  - SPDX-FileCopyrightText: 2019 Nextcloud GmbH and Nextcloud contributors
  - SPDX-License-Identifier: AGPL-3.0-or-later
-->
## Introduction

### What about Deck ?
You may know Kanban website like Trello? Deck is about the same thing but secured and respectful of your privacy!
Integrated in Nextcloud, you can easily manage your projects while having your data secured.

### Use cases
Project management, time management or ideation, Deck makes it easier for you to manage your work.

## Using Deck
Overall, Deck is easy to use. You can create boards, add users, share the Deck, work collaboratively and in real time.

1. [Create my first board](#1-create-my-first-board)
2. [Create stacks and cards](#2-create-stacks-and-cards)
3. [Handle cards options](#3-handle-cards-options)
4. [Mark task as done](#4-mark-as-done)
5. [Archive old tasks](#5-archive-old-tasks)
6. [Manage your board](#6-manage-your-board)
7. [Sharing boards](#7-sharing-boards)
8. [Import boards](#8-import-boards)
9. [Trello interoperability](#9-trello-interoperability)
10. [Search](#10-search)
11. [New owner for the deck entities](#11-new-owner-for-the-deck-entities)

### 1. Create my first board
In this example, we're going to create a board and share it with an other nextcloud user.

![Gif for creating boards](resources/gifs/EN_create_board.gif)


### 2. Create stacks and cards
Stacks are simply columns with list of cards. It can represent a category of tasks or any step in your projects for example.
**Check this out :**

![Gif for creating columns](resources/gifs/EN_create_columns.gif)

What about the cards? Cards are tasks, objects or ideas that fit into a stack. You can put a lot of cards in a stack! An infinity? Who knows! Who knows!

And all the magic of this software consists on moving your cards from a stack to an other.
**Check this out :**

![Gif for creating tasks](resources/gifs/EN_create_task.gif)

### 3. Handle cards options
Once you have created your cards, you can modify them or add options by clicking on them. So, what are the options? Well, there are several of them:

- Tag Management
- Assign a card to a user (s·he will receive a notification)
- Render date, or deadline

![Gif for puting infos on tasks](resources/gifs/EN_put_infos.gif)

And even :

- Description in markdown language
- Attachment - *you can leave a document, a picture or some other bonus like that.*

![Gif for puting infos on tasks 2](resources/gifs/EN_put_infos_2.gif)

### 4. Mark as done
Once a task has been completed, you can mark it as done. This will prevent it from becoming overdue and hide it from the upcoming cards.
You can mark it as not done at any time.

![Gif for marking a card as done](resources/gifs/EN_done.gif)

### 5. Archive old tasks
Once obsolete, a task could be archived. The task is not deleted, it's just archived, and you can retrieve it later

![Gif for archiving a task](resources/gifs/EN_archive.gif)

### 6. Manage your board
You can manage the settings of your Deck once you are inside it, by clicking on the small sidebar menu icon at the top right.
Once in this menu, you have access to several things:

- Sharing
- Tags
- Deleted objects
- Activity

The **sharing tab** allows you to add users or even groups to your boards.
**Tags** allows you to modify the tags available for the cards.
**Deleted objects** allows you to return previously deleted stacks or cards.
The **Activity** allows you to see everything that happened in your boards. Everything!

![Gif for board sidebar](resources/gifs/EN_board_sidebar.gif)

#### Filter cards
The filter button next to the search field narrows the board down to the cards you are interested in. You can filter by tag, by assigned user, by status and by due date, and combine these filters.

The filter button opens the filter menu. It lists the four parts of the filter (**Tags**, **Assigned to**, **Status** and **Due date**), each with what it currently filters, and **Clear filter** next to their heading once a filter is active. Choose one to see its options, and **Back to filters** to return; choosing a status or a fixed due date period returns by itself. Below them, set apart, are your saved filters and **Save filter…**.

While a filter is active, it is shown as chips below the board title, for example "HRS or GMA", "Not: bob", "Open" or "Week 45, 2026 · Nov 2 – 8". Click the text of a chip to open the filter menu at that part of the filter, or its cross to remove that part. When the filter matches one of your saved filters, its name is shown as the first chip.

The filter of a board is kept in your browser, so it is still applied when you reload or come back to the board (a calendar week or month then shows the current one). **Clear filter** next to the chips removes all of it.

A calendar week or month has arrows around its chip, to move to the previous or next week or month without opening a menu.

If no card matches, the chips say so and offer the smallest change that shows cards again, with how many, for example "Show 3 cards with any of these tags" (when several tags or users are combined with **All**) or "Show 1 card without "Completed"". When no single change helps, **Clear filter** is left.

Once you select two or more tags, **Any | All** appears next to the "Tags" heading in the tag options and decides whether a card needs any or all of them to be shown. By default a card needs all of them. Under "Assigned to" you are listed first, marked "(you)", to quickly show your own cards; the keyboard shortcut for your own cards adds or removes you without changing the rest of the filter. Next to "Assigned to", **Any | All** does the same for users, where any of them is enough by default. Your choice is remembered for each board in your browser, also when you clear the filter.

To leave cards out instead, use the minus button at the end of a tag or user; it appears when you point at the row or reach it with the keyboard, and stays while it is pressed. Cards carrying that tag, or assigned to that user, are hidden, whatever else is selected. Click the button again, or select the tag or user, to stop hiding them.

Besides the fixed periods (overdue, the next 24 hours, 7 days or 30 days, or no due date; the "next" periods are counted from now and only include cards due in the future), you can filter by calendar periods:

- **Calendar week**: cards due in one calendar week, Monday to Sunday. It starts at the current week; use the arrows to move to earlier or later weeks.
- **Calendar month**: the same for whole months.
- **Date range**: cards due between a start and an end date, both days included. It starts with the current week, or with the week or month shown before. Leave one of the dates empty to show everything due after the start or before the end.

**Also show overdue open cards** adds the cards whose due date has passed but that are not done yet, for example to review this week's cards together with everything that is late.

If you use the same filter regularly, set it up and choose **Save filter…** in the filter menu. Saving under the name of an existing saved filter replaces it; the form says so before you save. Saved filters are listed there, each with a short summary of what it shows; click one to apply it, or use the bin icon to delete it (the notification that follows lets you undo that). The saved filter that matches the current filter is marked with a check mark, and its name is shown as the first chip. Saved filters are personal: other people on the board do not see them, and you can save filters on boards you can only read. A saved calendar week or month always means the current one when you apply it later, and it stays recognised while you step to other weeks or months; a custom date range keeps its dates.

### 7. Sharing boards
You can share boards with a user, a group, or, if you are using the [Circles](https://apps.nextcloud.com/apps/circles) app, with a circle.

If a user is member of one or several group(s) or circle(s) a board is shared with, the following rules apply:
1. If a user is namely specified in a board's acl, (s)he gets the permission assigned to her/him;
2. Else, if a user is member of one or several circle(s) or group(s), (s)he gets the permission when at least one circle/group (s)he is member of has the permission.

### 8. Import boards

Importing can be done using the API or the `occ` `deck:import` command.

Comments with more than 1000 characters are placed as attached files to the card.

It is possible to import from the following sources:

### 9. Trello interoperability

#### Trello JSON

**Limitations:**
* Comments with more than 1000 characters are placed as attached files to the card.

**Steps:**
1. Create the data file:
   * Access Trello.
   * Go to the board you want to export.
   * Follow the steps in [Trello documentation](https://help.trello.com/article/747-exporting-data-from-trello-1) and export as JSON.
2. Create the configuration file.
3. Execute the import, specifying the import file path, data file, and source as `Trello JSON`.

Create the configuration file respecting the [JSON Schema](https://github.com/nextcloud/deck/blob/main/lib/Service/Importer/fixtures/config-trelloJson-schema.json) for importing `Trello JSON`.

Example configuration file:

```json
{
    "owner": "admin",
    "color": "0800fd",
    "uidRelation": {
        "johndoe": "johndoe"
    }
}
```

**Additional Limitations**:
* Importing from a JSON file imports up to 1000 actions. To find out how many actions the board to be imported has, check the number of actions in the JSON.

#### Trello API

Importing via API is recommended for boards with more than 1000 actions. Trello allows attaching links to a card, but Deck does not support this feature. Attachment links are instead added in a markdown table at the end of the description for each imported card.

1. Get the API Key and Token [here](https://developer.atlassian.com/cloud/trello/guides/rest-api/api-introduction/#authentication-and-authorization).
2. Obtain the ID of the board you want to import by making a request to:
   ```
   https://api.trello.com/1/members/me/boards?key={yourKey}&token={yourToken}&fields=id,name
   ```
3. Create the configuration file, ensuring it follows the [JSON Schema](https://github.com/nextcloud/deck/blob/main/lib/Service/Importer/fixtures/config-trelloApi-schema.json) for `Trello JSON`.

Example configuration file:

```json
{
    "owner": "admin",
    "color": "0800fd",
    "api": {
        "key": "0cc175b9c0f1b6a831c399e269772661",
        "token": "92eb5ffee6ae2fec3ad71c777531578f4a8a08f09d37b73795649038408b5f33"
    },
    "board": "8277e0910d750195b4487976",
    "uidRelation": {
        "johndoe": "johndoe"
    }
}
```

### 10. Search

Deck provides a global search either through the unified search in the Nextcloud header or with the inline search next to the board controls.
This search allows advanced filtering of cards across all board of the logged in user.

For example the search `project tag:ToDo assigned:alice assigned:bob` will return all cards where the card title or description contains project **and** the tag ToDo is set **and** the user alice is assigned **and** the user bob is assigned.

#### Supported search filters

| Filter      | Operators         | Query                                                        |
| ----------- | ----------------- | ------------------------------------------------------------ |
| title       | `:`               | text token used for a case-insentitive search on the cards title |
| description | `:`               | text token used for a case-insentitive search on the cards description |
| list        | `:`               | text token used for a case-insentitive search on the cards list name |
| tag         | `:`               | text token used for a case-insentitive search on the assigned tags |
| date        | `:`               | 'overdue', 'today' (next 24 hours), 'week' (next 7 days), 'month' (next 30 days), 'none'. 'week' and 'month' are not calendar weeks or months; use the filter menu for those |
|             | `>` `<` `>=` `<=` | Compare the card due date to the passed date (see [supported date formats](https://www.php.net/manual/de/datetime.formats.php)) Card due dates are always considered UTC for comparison |
| assigned    | `:`               | id or displayname of a user or group for a search on the assigned users or groups |

Other text tokens will be used to perform a case-insensitive search on the card title and description

In addition, quotes can be used to pass a query with spaces, e.g. `"Exact match with spaces"` or `title:"My card"`.

### 11. New owner for the deck entities
You can transfer ownership of boards, cards, etc to a new user, using `occ` command `deck:transfer-ownership`

```bash
php occ deck:transfer-ownership previousOwner newOwner
```

The transfer will preserve card details linked to the old owner, which can also be remapped by using the `--remap` option on the occ command.
```bash
php occ deck:transfer-ownership --remap previousOwner newOwner
```

Individual boards can be transferred by adding the id of the board to the command:

```bash
php occ deck:transfer-ownership previousOwner newOwner 123
```
