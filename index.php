<?php
declare(strict_types=1);

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

// 1. Route API requests directly to Router
if (strpos($uri, '/api.php') !== false || strpos($uri, '/api') !== false) {
    require_once __DIR__ . '/api.php';
    exit;
}

// 2. Serve static receipt images from storage/receipts
if (strpos($uri, 'storage/receipts/') !== false) {
    $filename = basename($uri);
    $filepath = __DIR__ . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'receipts' . DIRECTORY_SEPARATOR . $filename;
    if (is_file($filepath)) {
        $mime = mime_content_type($filepath) ?: 'image/jpeg';
        header("Content-Type: {$mime}");
        readfile($filepath);
        exit;
    }
}

// 3. Serve static assets (JS, CSS, fonts, images) from dist/
if (strpos($uri, '/assets/') !== false || strpos($uri, '/dist/') !== false) {
    $filename = basename($uri);
    $assetPath = __DIR__ . DIRECTORY_SEPARATOR . 'dist' . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . $filename;
    if (is_file($assetPath)) {
        $ext = strtolower(pathinfo($assetPath, PATHINFO_EXTENSION));
        $mimes = [
            'js' => 'application/javascript; charset=utf-8',
            'css' => 'text/css; charset=utf-8',
            'svg' => 'image/svg+xml',
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'woff' => 'font/woff',
            'woff2' => 'font/woff2',
            'ico' => 'image/x-icon',
        ];
        $contentType = $mimes[$ext] ?? mime_content_type($assetPath) ?: 'application/octet-stream';
        header("Content-Type: {$contentType}");
        readfile($assetPath);
        exit;
    }
}

// 4. Serve Frontend SPA from dist/
$distHtml = __DIR__ . DIRECTORY_SEPARATOR . 'dist' . DIRECTORY_SEPARATOR . 'index.html';

if (is_file($distHtml)) {
    header('Content-Type: text/html; charset=utf-8');
    $html = file_get_contents($distHtml);

    // Rewrite relative ./assets/ into ./dist/assets/ for clean Laragon subdirectory support
    $html = str_replace(
        ['src="./assets/', 'href="./assets/'],
        ['src="./dist/assets/', 'href="./dist/assets/'],
        (string)$html
    );
    echo $html;
    exit;
}

http_response_code(503);
header('Content-Type: text/html; charset=utf-8');
echo '<!doctype html><html lang="id"><head><meta charset="utf-8"><title>DompetKu — Build Diperlukan</title></head><body style="font-family:sans-serif;max-width:540px;margin:64px auto;padding:0 16px;color:#1e293b"><h1>DompetKu belum dibuild</h1><p>Jalankan <code>cd frontend && npm run build</code> untuk menghasilkan antarmuka di <code>dist/</code>.</p></body></html>';
