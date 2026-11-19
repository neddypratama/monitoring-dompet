<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once dirname(__DIR__, 2) . '/backend/Database.php';
require_once dirname(__DIR__, 2) . '/backend/AuthService.php';
require_once dirname(__DIR__, 2) . '/backend/ActivityLogService.php';

final class RoleAuthTest extends TestCase
{
    private PDO $pdo;

    protected function setUp(): void
    {
        $this->pdo = Database::connect(':memory:');
    }

    public function testFirstUserBecomesAdminAndSecondUserBecomesRegularUser(): void
    {
        $admin = AuthService::register($this->pdo, 'bosadmin', 'Bos Admin', 'adminpass123');
        $this->assertSame('admin', $admin['user']['role']);

        $user = AuthService::register($this->pdo, 'userbiasa', 'User Biasa', 'userpass123');
        $this->assertSame('user', $user['user']['role']);
    }

    public function testLoginReturnsRoleInPayload(): void
    {
        AuthService::register($this->pdo, 'superadmin', 'Super Admin', 'rahasia123');
        $res = AuthService::login($this->pdo, 'superadmin', 'rahasia123');

        $this->assertArrayHasKey('role', $res['user']);
        $this->assertSame('admin', $res['user']['role']);
    }

    public function testDeactivatedUserCannotLogin(): void
    {
        AuthService::register($this->pdo, 'admin1', 'Admin 1', 'pass123');
        $user = AuthService::register($this->pdo, 'baduser', 'Bad User', 'pass123');
        $userId = (int) $user['user']['id'];

        // Deactivate user
        $this->pdo->prepare('UPDATE users SET is_active = 0 WHERE id = ?')->execute([$userId]);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('dinonaktifkan');

        AuthService::login($this->pdo, 'baduser', 'pass123');
    }

    public function testValidateTokenFailsWhenUserIsDeactivated(): void
    {
        AuthService::register($this->pdo, 'admin2', 'Admin 2', 'pass123');
        $reg = AuthService::register($this->pdo, 'useractive', 'Active User', 'pass123');
        $token = $reg['token'];
        $userId = (int) $reg['user']['id'];

        // Valid while active
        $valid = AuthService::validateToken($this->pdo, $token);
        $this->assertNotNull($valid);
        $this->assertSame('user', $valid['role']);

        // Deactivate user
        $this->pdo->prepare('UPDATE users SET is_active = 0 WHERE id = ?')->execute([$userId]);

        // Token must become invalid
        $invalid = AuthService::validateToken($this->pdo, $token);
        $this->assertNull($invalid);
    }

    public function testRegisterAndLoginCreateActivityLogs(): void
    {
        $reg = AuthService::register($this->pdo, 'loggeruser', 'Logger User', 'loggerpass123');
        $userId = (int) $reg['user']['id'];

        $logs = $this->pdo->query('SELECT * FROM activity_logs ORDER BY id ASC')->fetchAll(PDO::FETCH_ASSOC);
        $this->assertNotEmpty($logs);
        $this->assertSame('auth.register', $logs[0]['action']);
        $this->assertSame($userId, (int)$logs[0]['user_id']);

        AuthService::login($this->pdo, 'loggeruser', 'loggerpass123');

        $logs2 = $this->pdo->query('SELECT * FROM activity_logs ORDER BY id ASC')->fetchAll(PDO::FETCH_ASSOC);
        $this->assertCount(2, $logs2);
        $this->assertSame('auth.login', $logs2[1]['action']);
    }
}
