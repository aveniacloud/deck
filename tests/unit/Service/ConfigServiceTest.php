<?php

declare(strict_types=1);
/**
 * SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\Deck\Service;

use OCA\Deck\BadRequestException;
use OCP\EventDispatcher\IEventDispatcher;
use OCP\IConfig;
use OCP\IGroupManager;
use OCP\Log\Audit\CriticalActionPerformedEvent;
use PHPUnit\Framework\MockObject\MockObject;
use Test\TestCase;

class ConfigServiceTest extends TestCase {
	private IConfig&MockObject $config;
	private IGroupManager&MockObject $groupManager;
	private IEventDispatcher&MockObject $eventDispatcher;
	private ConfigService $service;

	public function setUp(): void {
		parent::setUp();

		$this->config = $this->createMock(IConfig::class);
		$this->groupManager = $this->createMock(IGroupManager::class);
		$this->eventDispatcher = $this->createMock(IEventDispatcher::class);
		$this->service = new ConfigService(
			$this->config,
			$this->groupManager,
			$this->eventDispatcher,
		);
		self::invokePrivate($this->service, 'userId', ['admin']);
		$this->groupManager->method('isAdmin')->willReturn(true);
	}

	public function testSetGroupLimitLogsCriticalAction(): void {
		$this->eventDispatcher->expects($this->once())
			->method('dispatchTyped')
			->with($this->callback(fn (CriticalActionPerformedEvent $event): bool => $event->getOperation() === 'deck.config.group_limit_updated'
				&& $event->getParameters() === ['groups' => 'admin, staff']));

		$this->service->set('groupLimit', [['id' => 'admin'], ['id' => 'staff']]);
	}

	public function testSetFederationEnabledLogsCriticalAction(): void {
		$this->eventDispatcher->expects($this->once())
			->method('dispatchTyped')
			->with($this->callback(fn (CriticalActionPerformedEvent $event): bool => $event->getOperation() === 'deck.config.federation_updated'
				&& $event->getParameters() === ['federation' => 'enabled']));

		$this->service->set('federationEnabled', true);
	}

	public function testPersonalSettingIsNotLogged(): void {
		$this->eventDispatcher->expects($this->never())->method('dispatchTyped');

		$this->service->set('calendar', true);
	}

	public function testSavedFiltersAreStoredAsJson(): void {
		$filters = [['name' => 'My open cards', 'filter' => ['users' => ['admin'], 'completed' => 'open']]];
		$this->config->expects($this->once())
			->method('setUserValue')
			->with('admin', 'deck', 'board:1:savedFilters', json_encode($filters));

		$this->assertSame(json_encode($filters), $this->service->set('board:1:savedFilters', $filters));
	}

	public static function dataInvalidSavedFilters(): array {
		$filter = ['tags' => [1]];
		return [
			'not a list' => [['name' => 'Mine', 'filter' => $filter]],
			'not json' => ['{'],
			'missing name' => [[['filter' => $filter]]],
			'blank name' => [[['name' => '  ', 'filter' => $filter]]],
			'name too long' => [[['name' => str_repeat('a', ConfigService::SAVED_FILTERS_MAX_NAME_LENGTH + 1), 'filter' => $filter]]],
			'missing filter' => [[['name' => 'Mine']]],
			'too many' => [array_fill(0, ConfigService::SAVED_FILTERS_MAX_COUNT + 1, ['name' => 'Mine', 'filter' => $filter])],
			'too large' => [[['name' => 'Mine', 'filter' => ['tags' => range(1, 5000)]]]],
		];
	}

	/** @dataProvider dataInvalidSavedFilters */
	public function testInvalidSavedFiltersAreRejected(mixed $value): void {
		$this->config->expects($this->never())->method('setUserValue');
		$this->expectException(BadRequestException::class);

		$this->service->set('board:1:savedFilters', $value);
	}
}
