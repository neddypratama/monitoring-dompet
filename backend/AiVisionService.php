<?php
declare(strict_types=1);

final class AiVisionService
{
    public const PROVIDERS = ['gemini', 'groq', 'openrouter', 'openai'];

    public const PROVIDER_MODELS = [
        'gemini' => ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'],
        'groq' => ['meta-llama/llama-4-scout-17b-16e-instruct', 'llama-3.2-11b-vision-preview'],
        'openrouter' => ['google/gemini-2.5-flash', 'openrouter/free'],
        'openai' => ['gpt-4o-mini', 'gpt-4.1-mini'],
    ];

    public static function getSetting(PDO $pdo, int $userId, string $key): string
    {
        $stmt = $pdo->prepare('SELECT setting_value FROM app_settings WHERE user_id = ? AND setting_key = ? LIMIT 1');
        $stmt->execute([$userId, $key]);
        return trim((string)($stmt->fetchColumn() ?: ''));
    }

    public static function setSetting(PDO $pdo, int $userId, string $key, string $value): void
    {
        $stmt = $pdo->prepare(
            'INSERT INTO app_settings (user_id, setting_key, setting_value) 
             VALUES (?, ?, ?) 
             ON CONFLICT(user_id, setting_key) DO UPDATE SET setting_value = excluded.setting_value'
        );
        $stmt->execute([$userId, $key, $value]);
    }

    public static function getApiKey(PDO $pdo, int $userId, string $provider): string
    {
        $key = self::getSetting($pdo, $userId, "{$provider}_api_key");
        if ($key !== '') {
            return $key;
        }
        $env = getenv(strtoupper($provider) . '_API_KEY');
        return is_string($env) ? trim($env) : '';
    }

    public static function getActiveProvider(PDO $pdo, int $userId): string
    {
        $prov = self::getSetting($pdo, $userId, 'active_ai_provider');
        return in_array($prov, self::PROVIDERS, true) ? $prov : 'gemini';
    }

    public static function getSelectedModel(PDO $pdo, int $userId, string $provider): string
    {
        $model = self::getSetting($pdo, $userId, "{$provider}_model");
        $allowed = self::PROVIDER_MODELS[$provider] ?? ['gemini-3.8-flash'];
        return in_array($model, $allowed, true) ? $model : $allowed[0];
    }

    public static function parseReceipt(
        PDO $pdo,
        int $userId,
        string $imagePath,
        ?string $provider = null,
        ?string $model = null
    ): array {
        if (!file_exists($imagePath)) {
            throw new InvalidArgumentException("File gambar tidak ditemukan di '{$imagePath}'.");
        }

        $provider = $provider ?: self::getActiveProvider($pdo, $userId);
        $apiKey = self::getApiKey($pdo, $userId, $provider);

        if ($apiKey === '') {
            throw new InvalidArgumentException(
                "API Key untuk provider '{$provider}' belum diisi. Silakan atur API Key Anda di menu Pengaturan."
            );
        }

        $model = $model ?: self::getSelectedModel($pdo, $userId, $provider);
        $mime = mime_content_type($imagePath) ?: 'image/jpeg';
        $base64Data = base64_encode((string)file_get_contents($imagePath));

        $prompt = <<<PROMPT
Anda adalah asisten AI ekstraksi struk belanja dan tagihan pesanan makanan (seperti Alfamart, Indomaret, ShopeeFood, GrabFood, GoFood, atau resto lainnya) di Indonesia.
Analisis gambar struk/screenshot ini dan ekstrak data numerik dan nama item dengan sangat teliti.

Keluarkan respon HANYA dalam format JSON valid tanpa penjelasan teks tambahan apapun di luar JSON:
{
  "merchant_name": "Nama merchant / toko / resto",
  "transaction_date": "YYYY-MM-DD",
  "raw_subtotal": 0.0,
  "discount_amount": 0.0,
  "delivery_fee": 0.0,
  "service_tax_fee": 0.0,
  "total_paid": 0.0,
  "items": [
    {
      "name": "Nama menu / barang",
      "qty": 1,
      "raw_price": 0.0
    }
  ]
}

Aturan penting:
1. "raw_price" adalah total harga kotor sebelum diskon untuk baris item tersebut (bila ada qty 2 dengan harga satuan 10.000, maka raw_price = 20000).
2. "discount_amount" adalah akumulasi total potongan harga, diskon merchant, atau voucher promo (angka positif).
3. "delivery_fee" adalah ongkos kirim jika ada (0 jika tidak ada).
4. "service_tax_fee" adalah total pajak restoran (PB1 10%), biaya penanganan, biaya aplikasi/layanan, atau biaya kemasan/kantong kresek.
5. "total_paid" adalah total akhir yang dibayar oleh pembeli setelah diskon dan biaya-biaya.
6. Format tanggal adalah YYYY-MM-DD. Jika tahun tidak tertera di struk, gunakan tahun saat ini.
PROMPT;

        $rawResponse = '';
        if ($provider === 'gemini') {
            $rawResponse = self::callGemini($apiKey, $model, $prompt, $base64Data, $mime);
        } elseif ($provider === 'openai') {
            $rawResponse = self::callOpenAI($apiKey, $model, $prompt, $base64Data, $mime);
        } elseif ($provider === 'groq') {
            $rawResponse = self::callGroq($apiKey, $model, $prompt, $base64Data, $mime);
        } elseif ($provider === 'openrouter') {
            $rawResponse = self::callOpenRouter($apiKey, $model, $prompt, $base64Data, $mime);
        } else {
            throw new InvalidArgumentException("Provider AI '{$provider}' tidak didukung.");
        }

        return self::cleanAndParseJson($rawResponse);
    }

    private static function cleanAndParseJson(string $raw): array
    {
        $text = trim($raw);
        if (preg_match('/```(?:json)?\s*([\s\S]*?)\s*```/', $text, $matches)) {
            $text = trim($matches[1]);
        }

        $data = json_decode($text, true);
        if (!is_array($data) || !isset($data['items'])) {
            throw new RuntimeException("Gagal mengurai respon AI menjadi format struk JSON: {$raw}");
        }

        // Sanitasi tipe data
        $data['merchant_name'] = trim((string)($data['merchant_name'] ?? 'Merchant'));
        $data['transaction_date'] = trim((string)($data['transaction_date'] ?? date('Y-m-d')));
        $data['raw_subtotal'] = (float)($data['raw_subtotal'] ?? 0.0);
        $data['discount_amount'] = (float)($data['discount_amount'] ?? 0.0);
        $data['delivery_fee'] = (float)($data['delivery_fee'] ?? 0.0);
        $data['service_tax_fee'] = (float)($data['service_tax_fee'] ?? 0.0);
        $data['total_paid'] = (float)($data['total_paid'] ?? 0.0);

        $cleanItems = [];
        foreach ($data['items'] as $it) {
            $cleanItems[] = [
                'name' => trim((string)($it['name'] ?? 'Item')),
                'qty' => max(1, (int)($it['qty'] ?? 1)),
                'raw_price' => (float)($it['raw_price'] ?? 0.0),
            ];
        }
        $data['items'] = $cleanItems;

        return $data;
    }

    private static function callGemini(string $apiKey, string $model, string $prompt, string $base64, string $mime): string
    {
        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";
        $payload = [
            'contents' => [
                [
                    'parts' => [
                        ['text' => $prompt],
                        [
                            'inline_data' => [
                                'mime_type' => $mime,
                                'data' => $base64,
                            ]
                        ]
                    ]
                ]
            ],
            'generationConfig' => [
                'temperature' => 0.1,
                'response_mime_type' => 'application/json'
            ]
        ];

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_TIMEOUT => 45,
            CURLOPT_SSL_VERIFYPEER => false,
        ]);

        $response = curl_exec($ch);
        $err = curl_error($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($err) {
            throw new RuntimeException("Koneksi ke Gemini API gagal: {$err}");
        }
        if ($httpCode >= 400) {
            throw new RuntimeException("Gemini API Error (HTTP {$httpCode}): {$response}");
        }

        $resData = json_decode((string)$response, true);
        return $resData['candidates'][0]['content']['parts'][0]['text'] ?? '';
    }

    private static function callOpenAI(string $apiKey, string $model, string $prompt, string $base64, string $mime): string
    {
        $url = 'https://api.openai.com/v1/chat/completions';
        $payload = [
            'model' => $model,
            'messages' => [
                [
                    'role' => 'user',
                    'content' => [
                        ['type' => 'text', 'text' => $prompt],
                        [
                            'type' => 'image_url',
                            'image_url' => ['url' => "data:{$mime};base64,{$base64}"]
                        ]
                    ]
                ]
            ],
            'temperature' => 0.1,
            'response_format' => ['type' => 'json_object']
        ];

        return self::executeHttpJson($url, $payload, ["Authorization: Bearer {$apiKey}"]);
    }

    private static function callGroq(string $apiKey, string $model, string $prompt, string $base64, string $mime): string
    {
        $url = 'https://api.groq.com/openai/v1/chat/completions';
        $payload = [
            'model' => $model,
            'messages' => [
                [
                    'role' => 'user',
                    'content' => [
                        ['type' => 'text', 'text' => $prompt],
                        [
                            'type' => 'image_url',
                            'image_url' => ['url' => "data:{$mime};base64,{$base64}"]
                        ]
                    ]
                ]
            ],
            'temperature' => 0.1,
            'response_format' => ['type' => 'json_object']
        ];

        return self::executeHttpJson($url, $payload, ["Authorization: Bearer {$apiKey}"]);
    }

    private static function callOpenRouter(string $apiKey, string $model, string $prompt, string $base64, string $mime): string
    {
        $url = 'https://openrouter.ai/api/v1/chat/completions';
        $payload = [
            'model' => $model,
            'messages' => [
                [
                    'role' => 'user',
                    'content' => [
                        ['type' => 'text', 'text' => $prompt],
                        [
                            'type' => 'image_url',
                            'image_url' => ['url' => "data:{$mime};base64,{$base64}"]
                        ]
                    ]
                ]
            ],
            'temperature' => 0.1,
        ];

        return self::executeHttpJson($url, $payload, [
            "Authorization: Bearer {$apiKey}",
            'HTTP-Referer: http://localhost/monitoring-dompet',
            'X-Title: DompetKu Split Bill'
        ]);
    }

    private static function executeHttpJson(string $url, array $payload, array $headers): string
    {
        $headers[] = 'Content-Type: application/json';
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 45,
            CURLOPT_SSL_VERIFYPEER => false,
        ]);

        $response = curl_exec($ch);
        $err = curl_error($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($err) {
            throw new RuntimeException("Koneksi HTTP API gagal: {$err}");
        }
        if ($httpCode >= 400) {
            throw new RuntimeException("API Error (HTTP {$httpCode}): {$response}");
        }

        $resData = json_decode((string)$response, true);
        return $resData['choices'][0]['message']['content'] ?? '';
    }
}
