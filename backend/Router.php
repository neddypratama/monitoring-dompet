<?php
declare(strict_types=1);

require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/AuthService.php';
require_once __DIR__ . '/WalletService.php';
require_once __DIR__ . '/TransactionService.php';
require_once __DIR__ . '/DebtService.php';
require_once __DIR__ . '/ReceivableService.php';
require_once __DIR__ . '/Calculators.php';
require_once __DIR__ . '/AiVisionService.php';
require_once __DIR__ . '/ReceiptService.php';
require_once __DIR__ . '/BudgetService.php';
require_once __DIR__ . '/GoalService.php';
require_once __DIR__ . '/DashboardService.php';
require_once __DIR__ . '/ActivityLogService.php';
require_once __DIR__ . '/AdminService.php';

final class Router
{
    public static function dispatch(?PDO $pdo = null): void
    {
        // CORS Headers
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit;
        }

        $pdo = $pdo ?? Database::connect();

        $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

        // Normalisasi path agar mencakup /api/... terlepas dari subdirektori (misal /monitoring-dompet/api/...)
        $pos = strpos($uri, '/api');
        $apiPath = $pos !== false ? substr($uri, $pos) : $uri;

        // Strip trailing slash
        $apiPath = rtrim($apiPath, '/');
        if ($apiPath === '') {
            $apiPath = '/api';
        }

        try {
            self::route($pdo, $method, $apiPath);
        } catch (\InvalidArgumentException $e) {
            self::json(['success' => false, 'message' => $e->getMessage()], 400);
        } catch (\RuntimeException $e) {
            self::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            self::json(['success' => false, 'message' => 'Terjadi kesalahan sistem: ' . $e->getMessage()], 500);
        }
    }

    private static function route(PDO $pdo, string $method, string $path): void
    {
        $input = self::getJsonBody();

        // 1. Health check & Root
        if ($path === '/api' || $path === '/api/health') {
            self::json(['success' => true, 'app' => 'DompetKu API', 'version' => '1.0.0']);
            return;
        }

        // 2. Auth routes
        if ($method === 'POST' && $path === '/api/auth/register') {
            $res = AuthService::register(
                $pdo,
                (string)($input['username'] ?? ''),
                (string)($input['full_name'] ?? ''),
                (string)($input['password'] ?? '')
            );
            self::json(['success' => true, 'data' => $res], 201);
            return;
        }

        if ($method === 'POST' && $path === '/api/auth/login') {
            $res = AuthService::login(
                $pdo,
                (string)($input['username'] ?? ''),
                (string)($input['password'] ?? '')
            );
            self::json(['success' => true, 'data' => $res]);
            return;
        }

        // Protected Routes: Validate Token
        $user = self::getAuthenticatedUser($pdo);
        if (!$user) {
            self::json(['success' => false, 'message' => 'Unauthorized / Silakan login terlebih dahulu.'], 401);
            return;
        }
        $userId = (int)$user['id'];

        if ($method === 'GET' && $path === '/api/auth/me') {
            self::json(['success' => true, 'data' => $user]);
            return;
        }

        if ($method === 'POST' && $path === '/api/auth/logout') {
            $token = self::getBearerToken();
            if ($token) {
                AuthService::logout($pdo, $token);
            }
            self::json(['success' => true, 'message' => 'Berhasil logout.']);
            return;
        }

        // Admin Protected Routes
        if (str_starts_with($path, '/api/admin')) {
            self::requireAdmin($user);

            if ($method === 'GET' && $path === '/api/admin/stats') {
                self::json(['success' => true, 'data' => AdminService::getStats($pdo)]);
                return;
            }

            if ($method === 'GET' && $path === '/api/admin/users') {
                self::json(['success' => true, 'data' => AdminService::listUsers($pdo)]);
                return;
            }

            if ($method === 'PUT' && preg_match('#^/api/admin/users/(\d+)/role$#', $path, $m)) {
                $targetUserId = (int)$m[1];
                $newRole = (string)($input['role'] ?? '');
                $res = AdminService::updateRole($pdo, $userId, $targetUserId, $newRole);
                self::json(['success' => true, 'data' => $res, 'message' => 'Role pengguna berhasil diperbarui.']);
                return;
            }

            if ($method === 'PUT' && preg_match('#^/api/admin/users/(\d+)/status$#', $path, $m)) {
                $targetUserId = (int)$m[1];
                $newStatus = (int)($input['is_active'] ?? 1);
                $res = AdminService::toggleStatus($pdo, $userId, $targetUserId, $newStatus);
                self::json(['success' => true, 'data' => $res, 'message' => 'Status pengguna berhasil diperbarui.']);
                return;
            }

            if ($method === 'GET' && $path === '/api/admin/logs') {
                $search = isset($_GET['search']) ? (string)$_GET['search'] : null;
                $limit = isset($_GET['limit']) ? max(1, (int)$_GET['limit']) : 100;
                $offset = isset($_GET['offset']) ? max(0, (int)$_GET['offset']) : 0;
                $logs = ActivityLogService::listLogs($pdo, $limit, $offset, $search);
                self::json(['success' => true, 'data' => $logs]);
                return;
            }

            self::json(['success' => false, 'message' => 'Admin route not found.'], 404);
            return;
        }

        // 3. Wallets
        if ($method === 'GET' && $path === '/api/wallets') {
            self::json(['success' => true, 'data' => WalletService::list($pdo, $userId)]);
            return;
        }

        if ($method === 'POST' && $path === '/api/wallets') {
            $wallet = WalletService::create($pdo, $userId, $input);
            self::json(['success' => true, 'data' => $wallet], 201);
            return;
        }

        if ($method === 'PUT' && preg_match('#^/api/wallets/(\d+)$#', $path, $m)) {
            $wallet = WalletService::update($pdo, $userId, (int)$m[1], $input);
            self::json(['success' => true, 'data' => $wallet]);
            return;
        }

        if ($method === 'DELETE' && preg_match('#^/api/wallets/(\d+)$#', $path, $m)) {
            WalletService::delete($pdo, $userId, (int)$m[1]);
            self::json(['success' => true, 'message' => 'Dompet berhasil dihapus.']);
            return;
        }

        if ($method === 'POST' && $path === '/api/wallets/transfer') {
            $res = WalletService::transfer(
                $pdo,
                $userId,
                (int)($input['from_wallet_id'] ?? 0),
                (int)($input['to_wallet_id'] ?? 0),
                (float)($input['amount'] ?? 0.0),
                (float)($input['admin_fee'] ?? 0.0),
                (string)($input['date'] ?? ''),
                (string)($input['notes'] ?? '')
            );
            self::json(['success' => true, 'data' => $res]);
            return;
        }

        // 4. Categories
        if ($method === 'GET' && $path === '/api/categories') {
            $stmt = $pdo->prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY type ASC, name ASC');
            $stmt->execute([$userId]);
            self::json(['success' => true, 'data' => $stmt->fetchAll()]);
            return;
        }

        if ($method === 'POST' && $path === '/api/categories') {
            $name = trim((string)($input['name'] ?? ''));
            $type = (string)($input['type'] ?? 'expense');
            $icon = (string)($input['icon'] ?? 'tag');
            $color = (string)($input['color'] ?? '#64748b');
            $stmt = $pdo->prepare('INSERT INTO categories (user_id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)');
            $stmt->execute([$userId, $name, $type, $icon, $color]);
            $catId = (int)$pdo->lastInsertId();
            self::json(['success' => true, 'data' => ['id' => $catId, 'name' => $name, 'type' => $type, 'icon' => $icon, 'color' => $color]], 201);
            return;
        }

        // 5. Transactions
        if ($method === 'GET' && $path === '/api/transactions') {
            $txs = TransactionService::list($pdo, $userId, $_GET);
            self::json(['success' => true, 'data' => $txs]);
            return;
        }

        if ($method === 'POST' && $path === '/api/transactions') {
            $tx = TransactionService::create($pdo, $userId, $input);
            self::json(['success' => true, 'data' => $tx], 201);
            return;
        }

        if ($method === 'DELETE' && preg_match('#^/api/transactions/(\d+)$#', $path, $m)) {
            TransactionService::delete($pdo, $userId, (int)$m[1]);
            self::json(['success' => true, 'message' => 'Transaksi berhasil dihapus dan saldo dikembalikan.']);
            return;
        }

        // 6. Debts
        if ($method === 'GET' && $path === '/api/debts') {
            $status = isset($_GET['status']) ? (string)$_GET['status'] : null;
            self::json(['success' => true, 'data' => DebtService::list($pdo, $userId, $status)]);
            return;
        }

        if ($method === 'POST' && $path === '/api/debts') {
            $debt = DebtService::create($pdo, $userId, $input);
            self::json(['success' => true, 'data' => $debt], 201);
            return;
        }

        if ($method === 'POST' && preg_match('#^/api/debts/(\d+)/pay$#', $path, $m)) {
            $res = DebtService::pay(
                $pdo,
                $userId,
                (int)$m[1],
                (float)($input['amount'] ?? 0.0),
                (int)($input['wallet_id'] ?? 0),
                (string)($input['date'] ?? ''),
                (string)($input['notes'] ?? '')
            );
            self::json(['success' => true, 'data' => $res]);
            return;
        }

        if ($method === 'DELETE' && preg_match('#^/api/debts/(\d+)$#', $path, $m)) {
            DebtService::delete($pdo, $userId, (int)$m[1]);
            self::json(['success' => true, 'message' => 'Catatan hutang berhasil dihapus.']);
            return;
        }

        // 7. Receivables
        if ($method === 'GET' && $path === '/api/receivables') {
            $status = isset($_GET['status']) ? (string)$_GET['status'] : null;
            self::json(['success' => true, 'data' => ReceivableService::list($pdo, $userId, $status)]);
            return;
        }

        if ($method === 'POST' && $path === '/api/receivables') {
            $rec = ReceivableService::create($pdo, $userId, $input);
            self::json(['success' => true, 'data' => $rec], 201);
            return;
        }

        if ($method === 'POST' && preg_match('#^/api/receivables/(\d+)/settle$#', $path, $m)) {
            $res = ReceivableService::settle(
                $pdo,
                $userId,
                (int)$m[1],
                (float)($input['amount'] ?? 0.0),
                (int)($input['wallet_id'] ?? 0),
                (string)($input['date'] ?? ''),
                (string)($input['notes'] ?? '')
            );
            self::json(['success' => true, 'data' => $res]);
            return;
        }

        if ($method === 'DELETE' && preg_match('#^/api/receivables/(\d+)$#', $path, $m)) {
            ReceivableService::delete($pdo, $userId, (int)$m[1]);
            self::json(['success' => true, 'message' => 'Catatan piutang berhasil dihapus.']);
            return;
        }

        // 8. Receipts & AI Scan
        if ($method === 'POST' && $path === '/api/receipts/scan') {
            $uploadDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'receipts';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0775, true);
            }

            $targetFile = '';
            if (!empty($_FILES['image']['tmp_name']) && is_uploaded_file($_FILES['image']['tmp_name'])) {
                $ext = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION) ?: 'jpg';
                $filename = 'receipt_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
                $targetFile = $uploadDir . DIRECTORY_SEPARATOR . $filename;
                move_uploaded_file($_FILES['image']['tmp_name'], $targetFile);
            } elseif (!empty($input['image_base64'])) {
                $ext = 'jpg';
                $filename = 'receipt_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
                $targetFile = $uploadDir . DIRECTORY_SEPARATOR . $filename;
                $data = preg_replace('#^data:image/\w+;base64,#i', '', (string)$input['image_base64']);
                file_put_contents($targetFile, base64_decode($data));
            } else {
                throw new InvalidArgumentException('File foto struk wajib diunggah.');
            }

            $provider = !empty($input['provider']) ? (string)$input['provider'] : null;
            $model = !empty($input['model']) ? (string)$input['model'] : null;

            $parsed = AiVisionService::parseReceipt($pdo, $userId, $targetFile, $provider, $model);
            $parsed['image_path'] = 'storage/receipts/' . basename($targetFile);

            self::json(['success' => true, 'data' => $parsed]);
            return;
        }

        if ($method === 'POST' && $path === '/api/receipts/split-execute') {
            $res = ReceiptService::saveAndExecuteSplit($pdo, $userId, $input);
            self::json(['success' => true, 'data' => $res], 201);
            return;
        }

        if ($method === 'GET' && $path === '/api/receipts') {
            self::json(['success' => true, 'data' => ReceiptService::list($pdo, $userId)]);
            return;
        }

        if ($method === 'GET' && preg_match('#^/api/receipts/(\d+)$#', $path, $m)) {
            $rec = ReceiptService::getById($pdo, $userId, (int)$m[1]);
            if (!$rec) {
                self::json(['success' => false, 'message' => 'Struk tidak ditemukan.'], 404);
                return;
            }
            self::json(['success' => true, 'data' => $rec]);
            return;
        }

        // 9. Budgets
        if ($method === 'GET' && $path === '/api/budgets') {
            $month = isset($_GET['month']) ? (string)$_GET['month'] : date('Y-m');
            self::json(['success' => true, 'data' => BudgetService::list($pdo, $userId, $month)]);
            return;
        }

        if ($method === 'POST' && $path === '/api/budgets') {
            $b = BudgetService::setLimit(
                $pdo,
                $userId,
                (int)($input['category_id'] ?? 0),
                (float)($input['monthly_limit'] ?? 0.0),
                (string)($input['month_year'] ?? '')
            );
            self::json(['success' => true, 'data' => $b]);
            return;
        }

        if ($method === 'DELETE' && preg_match('#^/api/budgets/(\d+)$#', $path, $m)) {
            BudgetService::delete($pdo, $userId, (int)$m[1]);
            self::json(['success' => true, 'message' => 'Anggaran berhasil dihapus.']);
            return;
        }

        // 10. Goals
        if ($method === 'GET' && $path === '/api/goals') {
            self::json(['success' => true, 'data' => GoalService::list($pdo, $userId)]);
            return;
        }

        if ($method === 'POST' && $path === '/api/goals') {
            $goal = GoalService::create($pdo, $userId, $input);
            self::json(['success' => true, 'data' => $goal], 201);
            return;
        }

        if ($method === 'POST' && preg_match('#^/api/goals/(\d+)/deposit$#', $path, $m)) {
            $res = GoalService::deposit(
                $pdo,
                $userId,
                (int)$m[1],
                (float)($input['amount'] ?? 0.0),
                isset($input['wallet_id']) ? (int)$input['wallet_id'] : null,
                (string)($input['date'] ?? ''),
                (string)($input['notes'] ?? '')
            );
            self::json(['success' => true, 'data' => $res]);
            return;
        }

        if ($method === 'DELETE' && preg_match('#^/api/goals/(\d+)$#', $path, $m)) {
            GoalService::delete($pdo, $userId, (int)$m[1]);
            self::json(['success' => true, 'message' => 'Target tabungan berhasil dihapus.']);
            return;
        }

        // 11. Dashboard
        if ($method === 'GET' && $path === '/api/dashboard') {
            $start = isset($_GET['start_date']) ? (string)$_GET['start_date'] : date('Y-m-01');
            $end = isset($_GET['end_date']) ? (string)$_GET['end_date'] : date('Y-m-t');
            self::json(['success' => true, 'data' => DashboardService::getSummary($pdo, $userId, $start, $end)]);
            return;
        }

        // 12. Settings
        if ($method === 'GET' && $path === '/api/settings') {
            $settings = [
                'active_ai_provider' => AiVisionService::getActiveProvider($pdo, $userId),
                'gemini_api_key' => AiVisionService::getApiKey($pdo, $userId, 'gemini'),
                'gemini_model' => AiVisionService::getSelectedModel($pdo, $userId, 'gemini'),
                'groq_api_key' => AiVisionService::getApiKey($pdo, $userId, 'groq'),
                'groq_model' => AiVisionService::getSelectedModel($pdo, $userId, 'groq'),
                'openrouter_api_key' => AiVisionService::getApiKey($pdo, $userId, 'openrouter'),
                'openrouter_model' => AiVisionService::getSelectedModel($pdo, $userId, 'openrouter'),
                'openai_api_key' => AiVisionService::getApiKey($pdo, $userId, 'openai'),
                'openai_model' => AiVisionService::getSelectedModel($pdo, $userId, 'openai'),
                'available_providers' => AiVisionService::PROVIDERS,
                'available_models' => AiVisionService::PROVIDER_MODELS,
            ];
            self::json(['success' => true, 'data' => $settings]);
            return;
        }

        if ($method === 'POST' && $path === '/api/settings') {
            foreach ($input as $key => $val) {
                if (is_string($key)) {
                    AiVisionService::setSetting($pdo, $userId, $key, (string)$val);
                }
            }
            self::json(['success' => true, 'message' => 'Pengaturan berhasil disimpan.']);
            return;
        }

        // 13. Export data (JSON backup)
        if ($method === 'GET' && $path === '/api/export') {
            $exportData = [
                'exported_at' => date('Y-m-d H:i:s'),
                'user' => $user,
                'wallets' => WalletService::list($pdo, $userId),
                'transactions' => TransactionService::list($pdo, $userId),
                'debts' => DebtService::list($pdo, $userId),
                'receivables' => ReceivableService::list($pdo, $userId),
                'receipts' => ReceiptService::list($pdo, $userId),
                'budgets' => BudgetService::list($pdo, $userId, date('Y-m')),
                'goals' => GoalService::list($pdo, $userId)
            ];
            self::json(['success' => true, 'data' => $exportData]);
            return;
        }

        self::json(['success' => false, 'message' => "Endpoint tidak ditemukan: {$method} {$path}"], 404);
    }

    private static function getAuthenticatedUser(PDO $pdo): ?array
    {
        $token = self::getBearerToken();
        if (!$token) {
            return null;
        }
        return AuthService::validateToken($pdo, $token);
    }

    private static function requireAdmin(array $user): void
    {
        if (($user['role'] ?? 'user') !== 'admin') {
            self::json(['success' => false, 'message' => 'Forbidden. Hanya Administrator yang dapat mengakses menu ini.'], 403);
            exit;
        }
    }

    private static function getBearerToken(): ?string
    {
        $headers = [];
        if (function_exists('getallheaders')) {
            $headers = getallheaders();
        }
        $auth = $headers['Authorization'] ?? $headers['authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (preg_match('/Bearer\s+(\S+)/i', $auth, $m)) {
            return trim($m[1]);
        }
        if (!empty($_COOKIE['auth_token'])) {
            return trim((string)$_COOKIE['auth_token']);
        }
        return null;
    }

    private static function getJsonBody(): array
    {
        $raw = file_get_contents('php://input');
        if (!$raw) {
            return $_POST ?: [];
        }
        $data = json_decode($raw, true);
        return is_array($data) ? array_merge($_POST, $data) : $_POST;
    }

    public static function json(array $data, int $statusCode = 200): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
}
