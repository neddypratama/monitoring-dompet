<?php
declare(strict_types=1);

final class WalletService
{
    public static function list(PDO $pdo, int $userId): array
    {
        $stmt = $pdo->prepare('SELECT * FROM wallets WHERE user_id = ? ORDER BY id ASC');
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }

    public static function getById(PDO $pdo, int $userId, int $walletId): ?array
    {
        $stmt = $pdo->prepare('SELECT * FROM wallets WHERE id = ? AND user_id = ? LIMIT 1');
        $stmt->execute([$walletId, $userId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function create(PDO $pdo, int $userId, array $data): array
    {
        $name = trim((string)($data['name'] ?? ''));
        if ($name === '') {
            throw new InvalidArgumentException('Nama dompet tidak boleh kosong.');
        }

        $type = (string)($data['type'] ?? 'cash');
        if (!in_array($type, ['cash', 'bank', 'ewallet'], true)) {
            throw new InvalidArgumentException("Tipe dompet harus 'cash', 'bank', atau 'ewallet'.");
        }

        $balance = (float)($data['balance'] ?? 0.0);
        $accountNumber = trim((string)($data['account_number'] ?? ''));
        $color = (string)($data['color'] ?? ($type === 'bank' ? '#2563eb' : ($type === 'ewallet' ? '#8b5cf6' : '#16a34a')));
        $icon = (string)($data['icon'] ?? ($type === 'bank' ? 'building-library' : ($type === 'ewallet' ? 'smartphone' : 'banknotes')));

        $stmt = $pdo->prepare(
            'INSERT INTO wallets (user_id, name, type, account_number, balance, color, icon) 
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([$userId, $name, $type, $accountNumber, $balance, $color, $icon]);
        $id = (int)$pdo->lastInsertId();

        return self::getById($pdo, $userId, $id) ?? [];
    }

    public static function update(PDO $pdo, int $userId, int $walletId, array $data): array
    {
        $wallet = self::getById($pdo, $userId, $walletId);
        if (!$wallet) {
            throw new InvalidArgumentException('Dompet tidak ditemukan.');
        }

        $name = isset($data['name']) ? trim((string)$data['name']) : $wallet['name'];
        $type = isset($data['type']) ? (string)$data['type'] : $wallet['type'];
        $accountNumber = isset($data['account_number']) ? trim((string)$data['account_number']) : $wallet['account_number'];
        $color = isset($data['color']) ? (string)$data['color'] : $wallet['color'];
        $icon = isset($data['icon']) ? (string)$data['icon'] : $wallet['icon'];
        $isActive = isset($data['is_active']) ? (int)$data['is_active'] : (int)$wallet['is_active'];

        $stmt = $pdo->prepare(
            'UPDATE wallets 
             SET name = ?, type = ?, account_number = ?, color = ?, icon = ?, is_active = ?, updated_at = datetime("now", "localtime") 
             WHERE id = ? AND user_id = ?'
        );
        $stmt->execute([$name, $type, $accountNumber, $color, $icon, $isActive, $walletId, $userId]);

        return self::getById($pdo, $userId, $walletId) ?? [];
    }

    public static function delete(PDO $pdo, int $userId, int $walletId): void
    {
        $stmt = $pdo->prepare('DELETE FROM wallets WHERE id = ? AND user_id = ?');
        $stmt->execute([$walletId, $userId]);
    }

    public static function adjustBalance(PDO $pdo, int $userId, int $walletId, float $delta): void
    {
        $wallet = self::getById($pdo, $userId, $walletId);
        if (!$wallet) {
            throw new InvalidArgumentException("Dompet ID {$walletId} tidak ditemukan.");
        }

        $newBalance = (float)$wallet['balance'] + $delta;
        if ($newBalance < -0.0001) {
            throw new InvalidArgumentException("Saldo dompet '{$wallet['name']}' tidak mencukupi untuk transaksi ini (Saldo: Rp " . number_format((float)$wallet['balance'], 0, ',', '.') . ").");
        }

        $stmt = $pdo->prepare('UPDATE wallets SET balance = ?, updated_at = datetime("now", "localtime") WHERE id = ? AND user_id = ?');
        $stmt->execute([$newBalance, $walletId, $userId]);
    }

    public static function transfer(
        PDO $pdo,
        int $userId,
        int $fromId,
        int $toId,
        float $amount,
        float $adminFee,
        string $date,
        string $notes
    ): array {
        if ($fromId === $toId) {
            throw new InvalidArgumentException('Dompet asal dan tujuan tidak boleh sama.');
        }
        if ($amount <= 0) {
            throw new InvalidArgumentException('Nominal transfer harus lebih besar dari 0.');
        }

        $source = self::getById($pdo, $userId, $fromId);
        $dest = self::getById($pdo, $userId, $toId);
        if (!$source || !$dest) {
            throw new InvalidArgumentException('Dompet asal atau tujuan tidak valid.');
        }

        $totalRequired = $amount + $adminFee;
        if ((float)$source['balance'] < $totalRequired) {
            throw new InvalidArgumentException("Saldo dompet '{$source['name']}' tidak mencukupi untuk transfer sebesar Rp " . number_format($totalRequired, 0, ',', '.'));
        }

        $isRootTx = !$pdo->inTransaction();
        if ($isRootTx) {
            $pdo->beginTransaction();
        }
        try {
            self::adjustBalance($pdo, $userId, $fromId, -$totalRequired);
            self::adjustBalance($pdo, $userId, $toId, $amount);

            $stmt = $pdo->prepare(
                'INSERT INTO transactions (user_id, wallet_id, transfer_to_wallet_id, type, amount, admin_fee, date, notes) 
                 VALUES (?, ?, ?, "transfer", ?, ?, ?, ?)'
            );
            $stmt->execute([$userId, $fromId, $toId, $amount, $adminFee, $date ?: date('Y-m-d'), $notes]);
            $txId = (int)$pdo->lastInsertId();

            if ($isRootTx) {
                $pdo->commit();
            }

            return [
                'id' => $txId,
                'from_wallet_id' => $fromId,
                'to_wallet_id' => $toId,
                'amount' => $amount,
                'admin_fee' => $adminFee,
                'date' => $date,
                'notes' => $notes
            ];
        } catch (\Throwable $e) {
            if ($isRootTx && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }
}
