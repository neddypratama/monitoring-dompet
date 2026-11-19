<?php
declare(strict_types=1);

require_once __DIR__ . '/ActivityLogService.php';

final class AdminService
{
    /**
     * @return array{total_users: int, active_users: int, admin_users: int, total_wallets: int, total_transactions: int, total_volume: float}
     */
    public static function getStats(PDO $pdo): array
    {
        $totalUsers = (int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
        $activeUsers = (int)$pdo->query('SELECT COUNT(*) FROM users WHERE is_active = 1')->fetchColumn();
        $adminUsers = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn();
        $totalWallets = (int)$pdo->query('SELECT COUNT(*) FROM wallets')->fetchColumn();
        $totalTransactions = (int)$pdo->query('SELECT COUNT(*) FROM transactions')->fetchColumn();
        $totalVolume = (float)$pdo->query('SELECT COALESCE(SUM(amount), 0) FROM transactions')->fetchColumn();

        return [
            'total_users' => $totalUsers,
            'active_users' => $activeUsers,
            'admin_users' => $adminUsers,
            'total_wallets' => $totalWallets,
            'total_transactions' => $totalTransactions,
            'total_volume' => $totalVolume,
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function listUsers(PDO $pdo): array
    {
        $stmt = $pdo->query('
            SELECT 
                u.id, 
                u.username, 
                u.full_name, 
                u.role, 
                u.is_active, 
                u.created_at,
                (SELECT COUNT(*) FROM wallets w WHERE w.user_id = u.id) AS total_wallets,
                (SELECT COUNT(*) FROM transactions t WHERE t.user_id = u.id) AS total_transactions
            FROM users u
            ORDER BY u.id ASC
        ');

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * @return array<string, mixed>
     */
    public static function updateRole(PDO $pdo, int $adminUserId, int $targetUserId, string $newRole): array
    {
        if (!in_array($newRole, ['admin', 'user'], true)) {
            throw new InvalidArgumentException("Role harus 'admin' atau 'user'.");
        }

        $stmt = $pdo->prepare('SELECT id, username, role, is_active FROM users WHERE id = ?');
        $stmt->execute([$targetUserId]);
        $target = $stmt->fetch();

        if (!$target) {
            throw new RuntimeException('User target tidak ditemukan.');
        }

        $currentRole = (string)$target['role'];

        if ($currentRole === 'admin' && $newRole === 'user') {
            // Check if there are other active admins
            $adminCount = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = 1")->fetchColumn();
            if ($adminCount <= 1) {
                throw new InvalidArgumentException('Tidak dapat mendegradasi admin terakhir dalam sistem.');
            }
        }

        if ($newRole === 'admin') {
            $update = $pdo->prepare('UPDATE users SET role = ?, is_active = 1 WHERE id = ?');
            $update->execute([$newRole, $targetUserId]);
        } else {
            $update = $pdo->prepare('UPDATE users SET role = ? WHERE id = ?');
            $update->execute([$newRole, $targetUserId]);
        }

        ActivityLogService::log(
            $pdo,
            $adminUserId,
            'admin.user_role_updated',
            "Admin mengubah role user '{$target['username']}' dari '{$currentRole}' menjadi '{$newRole}'"
        );

        return [
            'id' => $targetUserId,
            'username' => $target['username'],
            'role' => $newRole,
            'is_active' => (int)$target['is_active'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function toggleStatus(PDO $pdo, int $adminUserId, int $targetUserId, int $newStatus): array
    {
        if (!in_array($newStatus, [0, 1], true)) {
            throw new InvalidArgumentException('Status harus bernilai 0 atau 1.');
        }

        if ($adminUserId === $targetUserId && $newStatus === 0) {
            throw new InvalidArgumentException('Tidak dapat menonaktifkan akun admin Anda sendiri.');
        }

        $stmt = $pdo->prepare('SELECT id, username, role, is_active FROM users WHERE id = ?');
        $stmt->execute([$targetUserId]);
        $target = $stmt->fetch();

        if (!$target) {
            throw new RuntimeException('User target tidak ditemukan.');
        }

        $update = $pdo->prepare('UPDATE users SET is_active = ? WHERE id = ?');
        $update->execute([$newStatus, $targetUserId]);

        // If deactivated, kill user sessions immediately
        if ($newStatus === 0) {
            $del = $pdo->prepare('DELETE FROM user_sessions WHERE user_id = ?');
            $del->execute([$targetUserId]);
        }

        $statusLabel = $newStatus === 1 ? 'diaktifkan' : 'dinonaktifkan';
        ActivityLogService::log(
            $pdo,
            $adminUserId,
            'admin.user_status_toggled',
            "Admin mengubah status user '{$target['username']}' menjadi {$statusLabel}"
        );

        return [
            'id' => $targetUserId,
            'username' => $target['username'],
            'role' => $target['role'],
            'is_active' => $newStatus,
        ];
    }
}
