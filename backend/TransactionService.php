<?php
declare(strict_types=1);

require_once __DIR__ . '/WalletService.php';

final class TransactionService
{
    public static function create(PDO $pdo, int $userId, array $data): array
    {
        $walletId = (int)($data['wallet_id'] ?? 0);
        $amount = (float)($data['amount'] ?? 0.0);
        $type = (string)($data['type'] ?? 'expense');
        $categoryId = isset($data['category_id']) && $data['category_id'] !== '' ? (int)$data['category_id'] : null;
        $date = trim((string)($data['date'] ?? '')) ?: date('Y-m-d');
        $notes = trim((string)($data['notes'] ?? ''));
        $receiptId = isset($data['receipt_id']) && $data['receipt_id'] !== '' ? (int)$data['receipt_id'] : null;

        if ($amount <= 0) {
            throw new InvalidArgumentException('Nominal transaksi harus lebih besar dari 0.');
        }

        $validTypes = ['income', 'expense', 'transfer', 'split_receivable', 'receivable_settlement', 'debt_receipt', 'debt_payment'];
        if (!in_array($type, $validTypes, true)) {
            throw new InvalidArgumentException("Tipe transaksi '{$type}' tidak valid.");
        }

        $isRootTx = !$pdo->inTransaction();
        if ($isRootTx) {
            $pdo->beginTransaction();
        }
        try {
            // Apply wallet balance change
            if ($type === 'income' || $type === 'receivable_settlement' || $type === 'debt_receipt') {
                WalletService::adjustBalance($pdo, $userId, $walletId, $amount);
            } elseif ($type === 'expense' || $type === 'split_receivable' || $type === 'debt_payment') {
                WalletService::adjustBalance($pdo, $userId, $walletId, -$amount);
            }

            $stmt = $pdo->prepare(
                'INSERT INTO transactions (user_id, wallet_id, category_id, type, amount, date, notes, receipt_id) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([$userId, $walletId, $categoryId, $type, $amount, $date, $notes, $receiptId]);
            $txId = (int)$pdo->lastInsertId();

            if ($isRootTx) {
                $pdo->commit();
            }

            return self::getById($pdo, $userId, $txId) ?? [];
        } catch (\Throwable $e) {
            if ($isRootTx && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    public static function getById(PDO $pdo, int $userId, int $id): ?array
    {
        $stmt = $pdo->prepare(
            'SELECT t.*, 
                    w.name AS wallet_name, w.color AS wallet_color, w.icon AS wallet_icon,
                    c.name AS category_name, c.color AS category_color, c.icon AS category_icon,
                    tw.name AS transfer_to_wallet_name
             FROM transactions t
             LEFT JOIN wallets w ON w.id = t.wallet_id
             LEFT JOIN categories c ON c.id = t.category_id
             LEFT JOIN wallets tw ON tw.id = t.transfer_to_wallet_id
             WHERE t.id = ? AND t.user_id = ?
             LIMIT 1'
        );
        $stmt->execute([$id, $userId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function list(PDO $pdo, int $userId, array $filters = []): array
    {
        $sql = 'SELECT t.*, 
                       w.name AS wallet_name, w.color AS wallet_color, w.icon AS wallet_icon,
                       c.name AS category_name, c.color AS category_color, c.icon AS category_icon,
                       tw.name AS transfer_to_wallet_name
                FROM transactions t
                LEFT JOIN wallets w ON w.id = t.wallet_id
                LEFT JOIN categories c ON c.id = t.category_id
                LEFT JOIN wallets tw ON tw.id = t.transfer_to_wallet_id
                WHERE t.user_id = ?';
        
        $params = [$userId];

        if (!empty($filters['wallet_id'])) {
            $sql .= ' AND (t.wallet_id = ? OR t.transfer_to_wallet_id = ?)';
            $params[] = (int)$filters['wallet_id'];
            $params[] = (int)$filters['wallet_id'];
        }

        if (!empty($filters['category_id'])) {
            $sql .= ' AND t.category_id = ?';
            $params[] = (int)$filters['category_id'];
        }

        if (!empty($filters['type'])) {
            $sql .= ' AND t.type = ?';
            $params[] = $filters['type'];
        }

        if (!empty($filters['start_date'])) {
            $sql .= ' AND date(t.date) >= date(?)';
            $params[] = $filters['start_date'];
        }

        if (!empty($filters['end_date'])) {
            $sql .= ' AND date(t.date) <= date(?)';
            $params[] = $filters['end_date'];
        }

        $sql .= ' ORDER BY t.date DESC, t.id DESC';

        if (!empty($filters['limit'])) {
            $sql .= ' LIMIT ' . (int)$filters['limit'];
            if (!empty($filters['offset'])) {
                $sql .= ' OFFSET ' . (int)$filters['offset'];
            }
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function delete(PDO $pdo, int $userId, int $id): void
    {
        $tx = self::getById($pdo, $userId, $id);
        if (!$tx) {
            return;
        }

        $pdo->beginTransaction();
        try {
            $type = $tx['type'];
            $walletId = (int)$tx['wallet_id'];
            $amount = (float)$tx['amount'];

            // Revert wallet balance change
            if ($type === 'income' || $type === 'receivable_settlement' || $type === 'debt_receipt') {
                WalletService::adjustBalance($pdo, $userId, $walletId, -$amount);
            } elseif ($type === 'expense' || $type === 'split_receivable' || $type === 'debt_payment') {
                WalletService::adjustBalance($pdo, $userId, $walletId, $amount);
            } elseif ($type === 'transfer') {
                $toId = (int)$tx['transfer_to_wallet_id'];
                $adminFee = (float)$tx['admin_fee'];
                WalletService::adjustBalance($pdo, $userId, $walletId, $amount + $adminFee);
                WalletService::adjustBalance($pdo, $userId, $toId, -$amount);
            }

            $stmt = $pdo->prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?');
            $stmt->execute([$id, $userId]);

            $pdo->commit();
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }
}
