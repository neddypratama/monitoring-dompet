<?php
declare(strict_types=1);

require_once __DIR__ . '/WalletService.php';
require_once __DIR__ . '/TransactionService.php';

final class GoalService
{
    public static function create(PDO $pdo, int $userId, array $data): array
    {
        $name = trim((string)($data['name'] ?? ''));
        if ($name === '') {
            throw new InvalidArgumentException('Nama target impian tidak boleh kosong.');
        }

        $targetAmount = (float)($data['target_amount'] ?? 0.0);
        if ($targetAmount <= 0) {
            throw new InvalidArgumentException('Nominal target harus lebih besar dari 0.');
        }

        $targetDate = trim((string)($data['target_date'] ?? ''));
        if ($targetDate === '') {
            throw new InvalidArgumentException('Target tanggal pencapaian wajib diisi.');
        }

        $walletId = isset($data['wallet_id']) && $data['wallet_id'] !== '' ? (int)$data['wallet_id'] : null;
        $icon = (string)($data['icon'] ?? 'target');
        $color = (string)($data['color'] ?? '#10b981');

        $stmt = $pdo->prepare(
            'INSERT INTO savings_goals (user_id, name, target_amount, current_amount, target_date, wallet_id, icon, color) 
             VALUES (?, ?, ?, 0.0, ?, ?, ?, ?)'
        );
        $stmt->execute([$userId, $name, $targetAmount, $targetDate, $walletId, $icon, $color]);
        $id = (int)$pdo->lastInsertId();

        return self::getById($pdo, $userId, $id) ?? [];
    }

    public static function getById(PDO $pdo, int $userId, int $goalId): ?array
    {
        $stmt = $pdo->prepare(
            'SELECT g.*, w.name AS wallet_name 
             FROM savings_goals g 
             LEFT JOIN wallets w ON w.id = g.wallet_id 
             WHERE g.id = ? AND g.user_id = ? 
             LIMIT 1'
        );
        $stmt->execute([$goalId, $userId]);
        $row = $stmt->fetch();
        return $row ? self::enrichGoal($row) : null;
    }

    public static function list(PDO $pdo, int $userId): array
    {
        $stmt = $pdo->prepare(
            'SELECT g.*, w.name AS wallet_name 
             FROM savings_goals g 
             LEFT JOIN wallets w ON w.id = g.wallet_id 
             WHERE g.user_id = ? 
             ORDER BY g.is_achieved ASC, g.target_date ASC'
        );
        $stmt->execute([$userId]);
        $rows = $stmt->fetchAll();

        return array_map(fn($r) => self::enrichGoal($r), $rows);
    }

    public static function deposit(
        PDO $pdo,
        int $userId,
        int $goalId,
        float $amount,
        ?int $sourceWalletId,
        string $date,
        string $notes
    ): array {
        if ($amount <= 0) {
            throw new InvalidArgumentException('Nominal setoran harus lebih besar dari 0.');
        }

        $goal = self::getById($pdo, $userId, $goalId);
        if (!$goal) {
            throw new InvalidArgumentException('Target tabungan tidak ditemukan.');
        }

        $isRootTx = !$pdo->inTransaction();
        if ($isRootTx) {
            $pdo->beginTransaction();
        }

        try {
            // Potong saldo dompet jika sumber dompet ditentukan
            if ($sourceWalletId && $sourceWalletId > 0) {
                if (!empty($goal['wallet_id']) && (int)$goal['wallet_id'] !== $sourceWalletId) {
                    // Transfer dari source ke dompet penampung
                    WalletService::transfer($pdo, $userId, $sourceWalletId, (int)$goal['wallet_id'], $amount, 0.0, $date, "Setor tabungan: {$goal['name']}");
                } else {
                    // Dompet penampung tidak ditentukan, catat transfer/alokasi
                    WalletService::adjustBalance($pdo, $userId, $sourceWalletId, -$amount);
                    $stmt = $pdo->prepare(
                        'INSERT INTO transactions (user_id, wallet_id, type, amount, date, notes) 
                         VALUES (?, ?, "transfer", ?, ?, ?)'
                    );
                    $stmt->execute([$userId, $sourceWalletId, $amount, $date ?: date('Y-m-d'), "Alokasi tabungan: {$goal['name']}"]);
                }
            }

            $newCurrent = (float)$goal['current_amount'] + $amount;
            $isAchieved = $newCurrent >= (float)$goal['target_amount'] ? 1 : 0;

            $stmt = $pdo->prepare('UPDATE savings_goals SET current_amount = ?, is_achieved = ? WHERE id = ? AND user_id = ?');
            $stmt->execute([$newCurrent, $isAchieved, $goalId, $userId]);

            if ($isRootTx) {
                $pdo->commit();
            }

            return self::getById($pdo, $userId, $goalId) ?? [];
        } catch (\Throwable $e) {
            if ($isRootTx && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    public static function delete(PDO $pdo, int $userId, int $goalId): void
    {
        $stmt = $pdo->prepare('DELETE FROM savings_goals WHERE id = ? AND user_id = ?');
        $stmt->execute([$goalId, $userId]);
    }

    private static function enrichGoal(array $row): array
    {
        $target = (float)$row['target_amount'];
        $current = (float)$row['current_amount'];
        $pct = $target > 0 ? round(($current / $target) * 100, 1) : 0.0;
        $row['percentage'] = min(100.0, $pct);
        $row['target_amount'] = $target;
        $row['current_amount'] = $current;
        return $row;
    }
}
