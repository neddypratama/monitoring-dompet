<?php
declare(strict_types=1);

final class ActivityLogService
{
    public static function log(
        PDO $pdo,
        ?int $userId,
        string $action,
        string $details = '',
        string $ip = '',
        string $ua = ''
    ): void {
        $ip = $ip !== '' ? $ip : ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');
        $ua = $ua !== '' ? $ua : ($_SERVER['HTTP_USER_AGENT'] ?? 'CLI/System');

        $stmt = $pdo->prepare('
            INSERT INTO activity_logs (user_id, action, details, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?)
        ');
        $stmt->execute([$userId, $action, $details, $ip, $ua]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function listLogs(PDO $pdo, int $limit = 100, int $offset = 0, ?string $search = null): array
    {
        $sql = '
            SELECT l.*, u.username, u.full_name, u.role
            FROM activity_logs l
            LEFT JOIN users u ON u.id = l.user_id
        ';
        $params = [];

        if ($search !== null && trim($search) !== '') {
            $sql .= ' WHERE l.action LIKE ? OR l.details LIKE ? OR u.username LIKE ?';
            $term = '%' . trim($search) . '%';
            $params = [$term, $term, $term];
        }

        $sql .= ' ORDER BY l.id DESC LIMIT ? OFFSET ?';
        $params[] = $limit;
        $params[] = $offset;

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
