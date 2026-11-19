<?php
declare(strict_types=1);

require_once __DIR__ . '/TransactionService.php';

final class ReceivableService
{
    public static function create(PDO $pdo, int $userId, array $data): array
    {
        $friendName = trim((string)($data['friend_name'] ?? ''));
        if ($friendName === '') {
            throw new InvalidArgumentException('Nama teman tidak boleh kosong.');
        }

        $amount = (float)($data['amount'] ?? 0.0);
        if ($amount <= 0) {
            throw new InvalidArgumentException('Nominal piutang harus lebih besar dari 0.');
        }

        $receiptId = isset($data['receipt_id']) && $data['receipt_id'] !== '' ? (int)$data['receipt_id'] : null;
        $notes = trim((string)($data['notes'] ?? ''));

        $stmt = $pdo->prepare(
            'INSERT INTO receivables (user_id, friend_name, amount, remaining_amount, receipt_id, status, notes) 
             VALUES (?, ?, ?, ?, ?, "unpaid", ?)'
        );
        $stmt->execute([$userId, $friendName, $amount, $amount, $receiptId, $notes]);
        $id = (int)$pdo->lastInsertId();

        return self::getById($pdo, $userId, $id) ?? [];
    }

    public static function getById(PDO $pdo, int $userId, int $recId): ?array
    {
        $stmt = $pdo->prepare(
            'SELECT r.*, rc.merchant_name 
             FROM receivables r 
             LEFT JOIN receipts rc ON rc.id = r.receipt_id 
             WHERE r.id = ? AND r.user_id = ? 
             LIMIT 1'
        );
        $stmt->execute([$recId, $userId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function list(PDO $pdo, int $userId, ?string $status = null): array
    {
        $sql = 'SELECT r.*, rc.merchant_name 
                FROM receivables r 
                LEFT JOIN receipts rc ON rc.id = r.receipt_id 
                WHERE r.user_id = ?';
        $params = [$userId];

        if ($status && in_array($status, ['unpaid', 'partially_paid', 'paid'], true)) {
            $sql .= ' AND r.status = ?';
            $params[] = $status;
        }

        $sql .= ' ORDER BY CASE WHEN r.status = "paid" THEN 1 ELSE 0 END ASC, r.id DESC';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public static function settle(
        PDO $pdo,
        int $userId,
        int $recId,
        float $amount,
        int $walletId,
        string $date,
        string $notes
    ): array {
        if ($amount <= 0) {
            throw new InvalidArgumentException('Nominal pelunasan harus lebih besar dari 0.');
        }

        $rec = self::getById($pdo, $userId, $recId);
        if (!$rec) {
            throw new InvalidArgumentException('Data piutang tidak ditemukan.');
        }

        if ($rec['status'] === 'paid') {
            throw new InvalidArgumentException('Piutang ini sudah lunas.');
        }

        $remaining = (float)$rec['remaining_amount'];
        if ($amount > $remaining + 0.0001) {
            throw new InvalidArgumentException('Nominal bayar (Rp ' . number_format($amount, 0, ',', '.') . ') melebihi sisa piutang (Rp ' . number_format($remaining, 0, ',', '.') . ').');
        }

        $pdo->beginTransaction();
        try {
            // 1. Record receivable_settlement transaction into destination wallet
            $tx = TransactionService::create($pdo, $userId, [
                'wallet_id' => $walletId,
                'type' => 'receivable_settlement',
                'amount' => $amount,
                'date' => $date ?: date('Y-m-d'),
                'notes' => 'Pelunasan piutang dari ' . $rec['friend_name'] . ($notes ? ": {$notes}" : '')
            ]);

            // 2. Update remaining amount & status
            $newRemaining = max(0.0, $remaining - $amount);
            $newStatus = $newRemaining < 0.0001 ? 'paid' : 'partially_paid';

            $stmt = $pdo->prepare('UPDATE receivables SET remaining_amount = ?, status = ? WHERE id = ? AND user_id = ?');
            $stmt->execute([$newRemaining, $newStatus, $recId, $userId]);

            // 3. Record into receivable_payments
            $stmt = $pdo->prepare(
                'INSERT INTO receivable_payments (receivable_id, transaction_id, amount, payment_date, notes) 
                 VALUES (?, ?, ?, ?, ?)'
            );
            $stmt->execute([$recId, $tx['id'], $amount, $date ?: date('Y-m-d'), $notes]);

            $pdo->commit();

            return self::getById($pdo, $userId, $recId) ?? [];
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    public static function delete(PDO $pdo, int $userId, int $recId): void
    {
        $stmt = $pdo->prepare('DELETE FROM receivables WHERE id = ? AND user_id = ?');
        $stmt->execute([$recId, $userId]);
    }
}
