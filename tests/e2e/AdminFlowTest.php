<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once dirname(__DIR__, 2) . '/backend/Database.php';
require_once dirname(__DIR__, 2) . '/backend/Router.php';
require_once dirname(__DIR__, 2) . '/backend/AuthService.php';
require_once dirname(__DIR__, 2) . '/backend/AdminService.php';
require_once dirname(__DIR__, 2) . '/backend/ActivityLogService.php';

final class AdminFlowTest extends TestCase
{
    private PDO $pdo;

    protected function setUp(): void
    {
        $this->pdo = Database::connect(':memory:');
    }

    public function testCompleteAdminLifecycleAndAuditLogs(): void
    {
        // 1. First user registers -> must be admin
        $adminReg = AuthService::register($this->pdo, 'chiefadmin', 'Chief Admin', 'adminpassword123');
        $adminToken = $adminReg['token'];
        $adminId = (int)$adminReg['user']['id'];
        $this->assertSame('admin', $adminReg['user']['role']);

        // 2. Second user registers -> must be regular user
        $userReg = AuthService::register($this->pdo, 'staffuser', 'Staff User', 'staffpassword123');
        $userToken = $userReg['token'];
        $userId = (int)$userReg['user']['id'];
        $this->assertSame('user', $userReg['user']['role']);

        // 3. Admin retrieves platform stats
        $stats = AdminService::getStats($this->pdo);
        $this->assertSame(2, $stats['total_users']);
        $this->assertSame(2, $stats['active_users']);
        $this->assertSame(1, $stats['admin_users']);

        // 4. Admin lists users
        $users = AdminService::listUsers($this->pdo);
        $this->assertCount(2, $users);

        // 5. Admin promotes staffuser to admin
        $promoted = AdminService::updateRole($this->pdo, $adminId, $userId, 'admin');
        $this->assertSame('admin', $promoted['role']);

        // Verify stats now reflect 2 admins
        $stats2 = AdminService::getStats($this->pdo);
        $this->assertSame(2, $stats2['admin_users']);

        // 6. Admin deactivates staffuser
        $deactivated = AdminService::toggleStatus($this->pdo, $adminId, $userId, 0);
        $this->assertSame(0, $deactivated['is_active']);

        // 7. Verify staffuser token is immediately revoked
        $tokenCheck = AuthService::validateToken($this->pdo, $userToken);
        $this->assertNull($tokenCheck, 'Token harus tidak valid setelah akun dinonaktifkan');

        // 8. Verify staffuser cannot log in
        $loginFailed = false;
        try {
            AuthService::login($this->pdo, 'staffuser', 'staffpassword123');
        } catch (InvalidArgumentException $e) {
            $loginFailed = true;
            $this->assertStringContainsString('dinonaktifkan', $e->getMessage());
        }
        $this->assertTrue($loginFailed, 'User nonaktif tidak boleh bisa login');

        // 9. Verify activity logs contain complete audit trail
        $logs = ActivityLogService::listLogs($this->pdo, 100);
        $this->assertGreaterThanOrEqual(4, count($logs));

        $actions = array_column($logs, 'action');
        $this->assertContains('auth.register', $actions);
        $this->assertContains('admin.user_role_updated', $actions);
        $this->assertContains('admin.user_status_toggled', $actions);
        $this->assertContains('auth.login_failed', $actions);

        // 10. Admin reactivates staffuser
        $reactivated = AdminService::toggleStatus($this->pdo, $adminId, $userId, 1);
        $this->assertSame(1, $reactivated['is_active']);

        // Now staffuser can log in again
        $newLogin = AuthService::login($this->pdo, 'staffuser', 'staffpassword123');
        $this->assertNotEmpty($newLogin['token']);
        $this->assertSame('admin', $newLogin['user']['role']);
    }
}
