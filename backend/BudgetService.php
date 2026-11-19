<?php
declare(strict_types=1);

final class BudgetService
{
    public static function setLimit(
        PDO $pdo,
        int $userId,
        int $categoryId,
        float $monthlyLimit,
        string $monthYear
    ): array {
        if ($monthlyLimit <= 0) {
            throw new InvalidArgumentException('Batas anggaran harus lebih besar dari 0.');
        }

        $monthYear = trim($monthYear) ?: date('Y-m');

        $stmt = $pdo->prepare(
            'INSERT INTO budgets (user_id, category_id, monthly_limit, month_year) 
             VALUES (?, ?, ?, ?) 
             ON CONFLICT(user_id, category_id, month_year) DO UPDATE SET monthly_limit = excluded.monthly_limit'
        );
        $stmt->execute([$userId, $categoryId, $monthlyLimit, $monthYear]);

        $list = self::list($pdo, $userId, $monthYear);
        foreach ($list as $b) {
            if ($b['category_id'] === $categoryId) {
                return $b;
            }
        }
        return [];
    }

    public static function list(PDO $pdo, int $userId, string $monthYear): array
    {
        $monthYear = trim($monthYear) ?: date('Y-m');

        $stmt = $pdo->prepare(
            'SELECT b.id, b.category_id, b.monthly_limit, b.month_year,
                    c.name AS category_name, c.color AS category_color, c.icon AS category_icon,
                    COALESCE(SUM(t.amount), 0.0) AS spent_amount
             FROM budgets b
             JOIN categories c ON c.id = b.category_id
             LEFT JOIN transactions t ON t.user_id = b.user_id 
                                     AND t.category_id = b.category_id 
                                     AND t.type = "expense" 
                                     AND strftime("%Y-%m", t.date) = b.month_year
             WHERE b.user_id = ? AND b.month_year = ?
             GROUP BY b.id, b.category_id, b.monthly_limit, b.month_year, c.name, c.color, c.icon
             ORDER BY b.monthly_limit DESC'
        );
        $stmt->execute([$userId, $monthYear]);
        $rows = $stmt->fetchAll();

        return array_map(function ($row) {
            $limit = (float)$row['monthly_limit'];
            $spent = (float)$row['spent_amount'];
            $pct = $limit > 0 ? round(($spent / $limit) * 100, 1) : 0.0;
            $rem = max(0.0, $limit - $spent);

            if ($pct >= 90.0) {
                $status = 'danger';
            } elseif ($pct >= 70.0) {
                $status = 'warning';
            } else {
                $status = 'safe';
            }

            $row['monthly_limit'] = $limit;
            $row['spent_amount'] = $spent;
            $row['remaining_amount'] = $rem;
            $row['percentage'] = $pct;
            $row['status'] = $status;
            return $row;
        }, $rows);
    }

    public static function delete(PDO $pdo, int $userId, int $budgetId): void
    {
        $stmt = $pdo->prepare('DELETE FROM budgets WHERE id = ? AND user_id = ?');
        $stmt->execute([$budgetId, $userId]);
    }
}
