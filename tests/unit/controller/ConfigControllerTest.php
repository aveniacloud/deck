<?php

/**
 * SPDX-FileCopyrightText: 2026 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

namespace OCA\Deck\Controller;

use OCA\Deck\Db\Acl;
use OCA\Deck\Db\BoardMapper;
use OCA\Deck\Service\ConfigService;
use OCA\Deck\Service\PermissionService;
use OCP\IRequest;
use PHPUnit\Framework\MockObject\MockObject;
use Test\TestCase;

class ConfigControllerTest extends TestCase {
	private ConfigService&MockObject $configService;
	private PermissionService&MockObject $permissionService;
	private BoardMapper&MockObject $boardMapper;
	private ConfigController $controller;

	public function setUp(): void {
		parent::setUp();
		$this->configService = $this->createMock(ConfigService::class);
		$this->permissionService = $this->createMock(PermissionService::class);
		$this->boardMapper = $this->createMock(BoardMapper::class);
		$this->controller = new ConfigController(
			'deck',
			$this->createMock(IRequest::class),
			$this->configService,
			$this->permissionService,
			$this->boardMapper,
		);
	}

	public function testSavedFiltersNeedReadPermission(): void {
		$this->permissionService->expects($this->once())
			->method('checkPermission')
			->with($this->boardMapper, 12, Acl::PERMISSION_READ);
		$this->configService->method('set')->willReturn('[]');

		$this->controller->setValue('board:12:savedFilters', '[]');
	}

	public function testOtherBoardSettingsNeedEditPermission(): void {
		$this->permissionService->expects($this->once())
			->method('checkPermission')
			->with($this->boardMapper, 12, Acl::PERMISSION_EDIT);
		$this->configService->method('set')->willReturn('all');

		$this->controller->setValue('board:12:notify-due', 'all');
	}

	public function testUserSettingsNeedNoBoardPermission(): void {
		$this->permissionService->expects($this->never())->method('checkPermission');
		$this->configService->method('set')->willReturn(true);

		$this->controller->setValue('cardDetailsInModal', true);
	}
}
