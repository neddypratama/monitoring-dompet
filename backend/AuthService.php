<?php
declare(strict_types=1);

require_once __DIR__ . '/ActivityLogService.php';

final class AuthService
{
    public const SESSION_DAYS = 30;

    public static function validateUsername(string $username): string
    {
        $clean = strtolower(trim($username));
        if (!preg_match('/^[a-z0-9._-]{3,32}$/', $clean)) {
            throw new InvalidArgumentException('Username harus 3-32 karakter (huruf, angka, titik, strip).');
        }
        return $clean;
    }

    public static function validatePassword(string $password): void
    {
        if (strlen($password) < 6) {
            throw new InvalidArgumentException('Password minimal 6 karakter.');
        }
    }

    /**
     * @return array{user: array<string, mixed>, token: string}
     */
    public static function register(PDO $pdo, string $username, string $fullName, string $password): array
    {
        $cleanUser = self::validateUsername($username);
        self::validatePassword($password);
        $cleanName = trim($fullName) !== '' ? trim($fullName) : $cleanUser;

        $check = $pdo->prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1');
        $check->execute([$cleanUser]);
        if ($check->fetch()) {
            throw new InvalidArgumentException("Username '{$cleanUser}' sudah digunakan. Pilih username lain.");
        }

        $userCount = (int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
        $role = $userCount === 0 ? 'admin' : 'user';
        $isActive = $userCount === 0 ? 1 : 0; // User pertama otomatis admin & aktif, user berikutnya menunggu aktivasi admin

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare('INSERT INTO users (username, full_name, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$cleanUser, $cleanName, $hash, $role, $isActive]);
        $userId = (int) $pdo->lastInsertId();

        self::seedDefaultCategories($pdo, $userId);

        $user = self::getUserById($pdo, $userId);

        if ($isActive === 1) {
            ActivityLogService::log($pdo, $userId, 'auth.register', "Pengguna {$cleanUser} terdaftar sebagai {$role} (Aktif)");
            $token = self::createSession($pdo, $userId);
            return [
                'user' => $user,
                'token' => $token,
                'requires_approval' => false,
                'message' => 'Pendaftaran berhasil! Anda telah masuk.',
            ];
        }

        ActivityLogService::log($pdo, $userId, 'auth.register', "Pengguna baru {$cleanUser} terdaftar (Menunggu aktivasi Administrator)");
        return [
            'user' => $user,
            'token' => null,
            'requires_approval' => true,
            'message' => 'Pendaftaran berhasil! Akun Anda saat ini menunggu persetujuan dan aktivasi oleh Administrator.',
        ];
    }

    /**
     * @return array{user: array<string, mixed>, token: string}
     */
    public static function login(PDO $pdo, string $username, string $password): array
    {
        $cleanUser = self::validateUsername($username);
        $stmt = $pdo->prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1');
        $stmt->execute([$cleanUser]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, (string) $user['password_hash'])) {
            throw new InvalidArgumentException('Username atau password salah.');
        }

        $userId = (int) $user['id'];

        if ((int)($user['is_active'] ?? 1) === 0) {
            ActivityLogService::log($pdo, $userId, 'auth.login_failed', "Upaya login ditolak: akun {$cleanUser} masih belum aktif / dinonaktifkan");
            throw new InvalidArgumentException('Akun Anda masih belum aktif / dinonaktifkan oleh Administrator.');
        }

        $token = self::createSession($pdo, $userId);
        $role = (string)($user['role'] ?? 'user');

        ActivityLogService::log($pdo, $userId, 'auth.login', "Pengguna {$cleanUser} ({$role}) berhasil login");

        return [
            'user' => [
                'id' => $userId,
                'username' => $user['username'],
                'full_name' => $user['full_name'],
                'role' => $role,
                'is_active' => (int)($user['is_active'] ?? 1),
                'created_at' => $user['created_at'],
            ],
            'token' => $token,
        ];
    }

    public static function validateToken(PDO $pdo, string $token): ?array
    {
        $cleanToken = trim($token);
        if ($cleanToken === '') {
            return null;
        }

        $stmt = $pdo->prepare(
            'SELECT u.id, u.username, u.full_name, u.role, u.is_active, u.created_at 
             FROM user_sessions s 
             JOIN users u ON u.id = s.user_id 
             WHERE s.token = ? AND datetime(s.expires_at) > datetime("now", "localtime") 
             LIMIT 1'
        );
        $stmt->execute([$cleanToken]);
        $row = $stmt->fetch();

        if (!$row || (int)($row['is_active'] ?? 1) === 0) {
            return null;
        }

        return $row;
    }

    public static function logout(PDO $pdo, string $token): void
    {
        $stmt = $pdo->prepare('DELETE FROM user_sessions WHERE token = ?');
        $stmt->execute([trim($token)]);
    }

    private static function createSession(PDO $pdo, int $userId): string
    {
        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', strtotime('+' . self::SESSION_DAYS . ' days'));
        $stmt = $pdo->prepare('INSERT INTO user_sessions (token, user_id, expires_at) VALUES (?, ?, ?)');
        $stmt->execute([$token, $userId, $expiresAt]);
        return $token;
    }

    public static function getUserById(PDO $pdo, int $userId): array
    {
        $stmt = $pdo->prepare('SELECT id, username, full_name, role, is_active, created_at FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $row = $stmt->fetch();
        if (!$row) {
            throw new RuntimeException('User tidak ditemukan.');
        }
        return $row;
    }

    public static function seedDefaultCategories(PDO $pdo, int $userId): void
    {
        $defaults = [
            ['Makanan & Minuman', 'expense', 'utensils', '#ef4444'],
            ['Belanja & Minimarket', 'expense', 'shopping-cart', '#f97316'],
            ['Transportasi', 'expense', 'car', '#06b6d4'],
            ['Tagihan & Utilitas', 'expense', 'receipt', '#8b5cf6'],
            ['Hiburan & Hobi', 'expense', 'film', '#ec4899'],
            ['Kesehatan', 'expense', 'heart-pulse', '#10b981'],
            ['Gaji & Upah', 'income', 'briefcase', '#10b981'],
            ['Bonus & Hadiah', 'income', 'gift', '#f59e0b'],
            ['Investasi & Bunga', 'income', 'trending-up', '#3b82f6'],
            ['Lain-lain', 'expense', 'folder', '#64748b'],
        ];

        $stmt = $pdo->prepare('INSERT INTO categories (user_id, name, type, icon, color, is_default) VALUES (?, ?, ?, ?, ?, 1)');
        foreach ($defaults as $cat) {
            $stmt->execute([$userId, $cat[0], $cat[1], $cat[2], $cat[3]]);
        }
    }
}
