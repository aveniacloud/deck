<?php

/**
 * SPDX-FileCopyrightText: 2020 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

declare(strict_types=1);

namespace OCA\Deck\Service;

use OCA\Deck\AppInfo\Application;
use OCA\Deck\AuditLog\Operation;
use OCA\Deck\BadRequestException;
use OCA\Deck\Exceptions\FederationDisabledException;
use OCA\Deck\NoPermissionException;
use OCP\EventDispatcher\IEventDispatcher;
use OCP\IConfig;
use OCP\IGroup;
use OCP\IGroupManager;
use OCP\IUserSession;
use OCP\Log\Audit\CriticalActionPerformedEvent;

class ConfigService {
	public const SETTING_BOARD_NOTIFICATION_DUE_OFF = 'off';
	public const SETTING_BOARD_NOTIFICATION_DUE_ASSIGNED = 'assigned';
	public const SETTING_BOARD_NOTIFICATION_DUE_ALL = 'all';
	public const SETTING_BOARD_NOTIFICATION_DUE_DEFAULT = self::SETTING_BOARD_NOTIFICATION_DUE_ASSIGNED;

	public const SAVED_FILTERS_MAX_COUNT = 25;
	public const SAVED_FILTERS_MAX_NAME_LENGTH = 100;
	public const SAVED_FILTERS_MAX_BYTES = 20000;

	private ?string $userId = null;

	public function __construct(
		private readonly IConfig $config,
		private readonly IGroupManager $groupManager,
		private readonly IEventDispatcher $eventDispatcher,
	) {
	}

	public function getUserId(): ?string {
		if (!$this->userId) {
			// We cannot use DI for the userId or UserSession as the ConfigService
			// is initiated too early before the session is actually loaded
			$user = \OCP\Server::get(IUserSession::class)->getUser();
			$this->userId = $user ? $user->getUID() : null;
		}

		return $this->userId;
	}

	public function getAll(): array {
		$userId = $this->getUserId();
		if ($userId === null) {
			return [];
		}

		$data = [
			'calendar' => $this->isCalendarEnabled(),
			'cardDetailsInModal' => $this->isCardDetailsInModal(),
			'cardIdBadge' => $this->isCardIdBadgeEnabled(),
			'stackAddCardAtTop' => $this->isStackAddCardAtTopEnabled()
		];
		if ($this->groupManager->isAdmin($userId)) {
			$data['groupLimit'] = $this->get('groupLimit');
			$data['federationEnabled'] = $this->get('federationEnabled');
		}
		return $data;
	}

	/**
	 * @return bool|array{id: string, displayname: string}[]
	 * @throws NoPermissionException
	 */
	public function get(string $key) {
		[$scope] = explode(':', $key, 2);
		switch ($scope) {
			case 'groupLimit':
				if ($this->getUserId() === null || !$this->groupManager->isAdmin($this->getUserId())) {
					throw new NoPermissionException('You must be admin to get the group limit');
				}
				return $this->getGroupLimit();
			case 'federationEnabled':
				return $this->config->getAppValue(Application::APP_ID, 'federationEnabled', 'no') === 'yes';
			case 'calendar':
				if ($this->getUserId() === null) {
					return false;
				}
				return (bool)$this->config->getUserValue($this->getUserId(), Application::APP_ID, 'calendar', true);
			case 'cardDetailsInModal':
				if ($this->getUserId() === null) {
					return false;
				}
				return (bool)$this->config->getUserValue($this->getUserId(), Application::APP_ID, 'cardDetailsInModal', true);
			case 'cardIdBadge':
				if ($this->getUserId() === null) {
					return false;
				}
				return (bool)$this->config->getUserValue($this->getUserId(), Application::APP_ID, 'cardIdBadge', false);
		}
		return false;
	}

	public function isCalendarEnabled(?int $boardId = null): bool {
		$userId = $this->getUserId();
		if ($userId === null) {
			return false;
		}

		$appConfigState = $this->config->getAppValue(Application::APP_ID, 'calendar', 'yes') === 'yes';
		$defaultState = (bool)$this->config->getUserValue($userId, Application::APP_ID, 'calendar', $appConfigState);
		if ($boardId === null) {
			return $defaultState;
		}

		return (bool)$this->config->getUserValue($userId, Application::APP_ID, 'board:' . $boardId . ':calendar', $defaultState);
	}

	public function isCardDetailsInModal(?int $boardId = null): bool {
		$userId = $this->getUserId();
		if ($userId === null) {
			return false;
		}

		$defaultState = (bool)$this->config->getUserValue($userId, Application::APP_ID, 'cardDetailsInModal', true);
		if ($boardId === null) {
			return $defaultState;
		}

		return (bool)$this->config->getUserValue($userId, Application::APP_ID, 'board:' . $boardId . ':cardDetailsInModal', $defaultState);
	}

	public function isCardIdBadgeEnabled(): bool {
		$userId = $this->getUserId();
		if ($userId === null) {
			return false;
		}
		$appConfigState = $this->config->getAppValue(Application::APP_ID, 'cardIdBadge', 'yes') === 'no';
		$defaultState = (bool)$this->config->getUserValue($userId, Application::APP_ID, 'cardIdBadge', $appConfigState);

		return (bool)$this->config->getUserValue($userId, Application::APP_ID, 'cardIdBadge', $defaultState);
	}

	public function isStackAddCardAtTopEnabled(): bool {
		$userId = $this->getUserId();
		if ($userId === null) {
			return false;
		}

		return (bool)$this->config->getUserValue($userId, Application::APP_ID, 'stackAddCardAtTop', false);
	}

	public function ensureFederationEnabled() {
		if (!$this->get('federationEnabled')) {
			throw new FederationDisabledException();
		}
		// @TODO fine tune these config values to respect incoming and outgoing federation separately
		if ($this->config->getAppValue('files_sharing', 'outgoing_server2server_share_enabled', 'no') !== 'yes') {
			throw new FederationDisabledException();
		}
		if ($this->config->getAppValue('files_sharing', 'incoming_server2server_share_enabled', 'no') !== 'yes') {
			throw new FederationDisabledException();
		}
	}

	public function set($key, $value) {
		$userId = $this->getUserId();
		if ($userId === null) {
			throw new NoPermissionException('Must be logged in to set user config');
		}

		$result = null;
		[$scope] = explode(':', $key, 2);
		switch ($scope) {
			case 'groupLimit':
				if (!$this->groupManager->isAdmin($userId)) {
					throw new NoPermissionException('You must be admin to set the group limit');
				}
				$result = $this->setGroupLimit($value);
				$this->eventDispatcher->dispatchTyped(new CriticalActionPerformedEvent(
					'Deck usage was limited to the groups "%s"',
					['groups' => implode(', ', $result)],
					false,
					Operation::ConfigGroupLimitUpdated->value,
				));
				break;
			case 'federationEnabled':
				if (!$this->groupManager->isAdmin($userId)) {
					throw new NoPermissionException('You must be admin to set the federation enabled setting');
				}
				$this->config->setAppValue(Application::APP_ID, 'federationEnabled', (string)$value);
				$result = $value;
				$this->eventDispatcher->dispatchTyped(new CriticalActionPerformedEvent(
					'Federation of boards was %s',
					['federation' => $value ? 'enabled' : 'disabled'],
					false,
					Operation::ConfigFederationUpdated->value,
				));
				break;
			case 'calendar':
				$this->config->setUserValue($userId, Application::APP_ID, 'calendar', (string)$value);
				$result = $value;
				break;
			case 'cardDetailsInModal':
				$this->config->setUserValue($userId, Application::APP_ID, 'cardDetailsInModal', (string)$value);
				$result = $value;
				break;
			case 'cardIdBadge':
				$this->config->setUserValue($userId, Application::APP_ID, 'cardIdBadge', (string)$value);
				$result = $value;
				break;
			case 'stackAddCardAtTop':
				$this->config->setUserValue($userId, Application::APP_ID, 'stackAddCardAtTop', (string)$value);
				$result = $value;
				break;
			case 'board':
				// extra check that user only send one of the allowed board settings and not something random
				$parts = explode(':', $key, 3);
				if (count($parts) < 3) {
					break;
				}
				$boardConfigKey = $parts[2];
				if ($boardConfigKey === 'notify-due' && !in_array($value, [self::SETTING_BOARD_NOTIFICATION_DUE_ALL, self::SETTING_BOARD_NOTIFICATION_DUE_ASSIGNED, self::SETTING_BOARD_NOTIFICATION_DUE_OFF], true)) {
					throw new BadRequestException('Board notification option must be one of: off, assigned, all');
				}
				if ($boardConfigKey === 'savedFilters') {
					$value = $this->validateSavedFilters($value);
				}
				$this->config->setUserValue($userId, Application::APP_ID, $key, (string)$value);
				$result = $value;
		}
		return $result;
	}

	/**
	 * Saved board filters are stored as a JSON list of {name, filter} objects.
	 * The filter itself is opaque to the backend; only the shape and size are checked.
	 *
	 * @return string the normalized JSON to store
	 * @throws BadRequestException
	 */
	private function validateSavedFilters(mixed $value): string {
		$filters = is_string($value) ? json_decode($value, true) : $value;
		if (!is_array($filters) || !array_is_list($filters)) {
			throw new BadRequestException('Saved filters must be a list');
		}
		if (count($filters) > self::SAVED_FILTERS_MAX_COUNT) {
			throw new BadRequestException('At most ' . self::SAVED_FILTERS_MAX_COUNT . ' filters can be saved per board');
		}
		foreach ($filters as $filter) {
			if (!is_array($filter)
				|| !is_string($filter['name'] ?? null)
				|| trim($filter['name']) === ''
				|| mb_strlen($filter['name']) > self::SAVED_FILTERS_MAX_NAME_LENGTH
				|| !is_array($filter['filter'] ?? null)) {
				throw new BadRequestException('Each saved filter needs a name of up to ' . self::SAVED_FILTERS_MAX_NAME_LENGTH . ' characters and a filter');
			}
		}
		$json = json_encode($filters);
		if ($json === false || strlen($json) > self::SAVED_FILTERS_MAX_BYTES) {
			throw new BadRequestException('Saved filters are too large');
		}
		return $json;
	}

	/**
	 * @return string[]
	 */
	private function setGroupLimit(array $value): array {
		$groups = [];
		foreach ($value as $group) {
			$groups[] = $group['id'];
		}
		$data = implode(',', $groups);
		$this->config->setAppValue(Application::APP_ID, 'groupLimit', $data);
		return $groups;
	}

	private function getGroupLimitList(): array {
		$value = $this->config->getAppValue(Application::APP_ID, 'groupLimit', '');
		$groups = explode(',', $value);
		if ($value === '') {
			return [];
		}
		return $groups;
	}

	/** @return array{id: string, displayname: string}[] */
	private function getGroupLimit() {
		$groups = $this->getGroupLimitList();
		$groups = array_map(function (string $groupId): ?array {
			/** @var IGroup $groups */
			$group = $this->groupManager->get($groupId);
			if ($group === null) {
				return null;
			}
			return [
				'id' => $group->getGID(),
				'displayname' => $group->getDisplayName(),
			];
		}, $groups);
		return array_filter($groups);
	}

	public function getAttachmentFolder(?string $userId = null): string {
		if ($userId === null && $this->getUserId() === null) {
			throw new NoPermissionException('Must be logged in get the attachment folder');
		}

		return $this->config->getUserValue($userId ?? $this->getUserId(), 'deck', 'attachment_folder', '/Deck');
	}

	public function setAttachmentFolder(?string $userId, string $path): void {
		if ($userId === null && $this->getUserId() === null) {
			throw new NoPermissionException('Must be logged in get the attachment folder');
		}

		$this->config->setUserValue($userId ?? $this->getUserId(), 'deck', 'attachment_folder', $path);
	}

	public function getTrashRetention(): int {
		$value = $this->config->getAppValue(Application::APP_ID, 'trashRetentionHours', '5');
		$hours = (int)$value > 0 ? (int)$value : 5;
		return 60 * 60 * $hours;
	}
}
