<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once dirname(__DIR__, 2) . '/backend/Database.php';
require_once dirname(__DIR__, 2) . '/backend/AuthService.php';
require_once dirname(__DIR__, 2) . '/backend/AdminService.php';

final class AdminServiceTest extends TestCase
{
    private PDO $pdo;

    protected function setUp(): void
    {
        $this->pdo = Database::connect(':memory:');
    }

    public function testGetStatsReturnsAggregatedMetrics(): void
    {
        $admin = AuthService::register($this->pdo, 'admin1', 'Admin Satu', 'pass123');
        $adminId = (int)$admin['user']['id'];
        $user1 = AuthService::register($this->pdo, 'user1', 'User Satu', 'pass123');
        $u1Id = (int)$user1['user']['id'];

        // Admin activates user1
        AdminService::toggleStatus($this->pdo, $adminId, $u1Id, 1);

        // Create a wallet and transaction
        $this->pdo->prepare('INSERT INTO wallets (user_id, name, type, balance) VALUES (?, "Dompet Test", "cash", 500000)')->execute([$u1Id]);
        $wId = (int)$this->pdo->lastInsertId();

        $this->pdo->prepare('INSERT INTO transactions (user_id, wallet_id, type, amount, date) VALUES (?, ?, "expense", 75000, "2026-11-19")')->execute([$u1Id, $wId]);

        $stats = AdminService::getStats($this->pdo);

        $this->assertSame(2, $stats['total_users']);
        $this->assertSame(2, $stats['active_users']);
        $this->assertSame(1, $stats['admin_users']);
        $this->assertSame(1, $stats['total_wallets']);
        $this->assertSame(1, $stats['total_transactions']);
        $this->assertEquals(75000.0, (float)$stats['total_volume']);
    }

    public function testListUsersReturnsUserDataWithCounts(): void
    {
        $admin = AuthService::register($this->pdo, 'superadmin', 'Super Admin', 'pass123');
        $user = AuthService::register($this->pdo, 'regular', 'Regular User', 'pass123');
        $uId = (int)$user['user']['id'];

        $this->pdo->prepare('INSERT INTO wallets (user_id, name, type, balance) VALUES (?, "BCA", "bank", 1000000)')->execute([$uId]);

        $list = AdminService::listUsers($this->pdo);

        $this->assertCount(2, $list);
        $userRow = null;
        foreach ($list as $row) {
            if ($row['username'] === 'regular') {
                $userRow = $row;
                break;
            }
        }

        $this->assertNotNull($userRow);
        $this->assertSame(1, (int)$userRow['total_wallets']);
        $this->assertSame(0, (int)$userRow['total_transactions']);
    }

    public function testUpdateRoleSuccessAndPreventDemotingLastAdmin(): void
    {
        $admin = AuthService::register($this->pdo, 'adminonly', 'Admin Only', 'pass123');
        $adminId = (int)$admin['user']['id'];
        $user = AuthService::register($this->pdo, 'userx', 'User X', 'pass123');
        $userId = (int)$user['user']['id'];

        // Cannot demote the only admin
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('admin terakhir');
        AdminService::updateRole($this->pdo, $adminId, $adminId, 'user');
    }

    public function testPromoteUserAndDemoteAdminWhenMultipleAdminsExist(): void
    {
        $admin = AuthService::register($this->pdo, 'admina', 'Admin A', 'pass123');
        $adminId = (int)$admin['user']['id'];
        $user = AuthService::register($this->pdo, 'userb', 'User B', 'pass123');
        $userId = (int)$user['user']['id'];

        // Promote userb to admin
        $updatedUser = AdminService::updateRole($this->pdo, $adminId, $userId, 'admin');
        $this->assertSame('admin', $updatedUser['role']);

        // Now admina can be demoted since userb is also admin
        $demotedAdmin = AdminService::updateRole($this->pdo, $userId, $adminId, 'user');
        $this->assertSame('user', $demotedAdmin['role']);
    }

    public function testToggleStatusPreventSelfDeactivation(): void
    {
        $admin = AuthService::register($this->pdo, 'adminself', 'Admin Self', 'pass123');
        $adminId = (int)$admin['user']['id'];

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Anda sendiri');
        AdminService::toggleStatus($this->pdo, $adminId, $adminId, 0);
    }

    public function testToggleStatusSuccessForOtherUsers(): void
    {
        $admin = AuthService::register($this->pdo, 'adminboss', 'Admin Boss', 'pass123');
        $adminId = (int)$admin['user']['id'];
        $user = AuthService::register($this->pdo, 'usertarget', 'User Target', 'pass123');
        $userId = (int)$user['user']['id'];

        $deactivated = AdminService::toggleStatus($this->pdo, $adminId, $userId, 0);
        $this->assertSame(0, (int)$deactivated['is_active']);

        $reactivated = AdminService::toggleStatus($this->pdo, $adminId, $userId, 1);
        $this->assertSame(1, (int)$reactivated['is_active']);
    }
}
