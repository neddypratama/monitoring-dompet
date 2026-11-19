<?php
declare(strict_types=1);

namespace Tests\Backend;

use PHPUnit\Framework\TestCase;
use PDO;
use Database;
use AuthService;

final class AuthTest extends TestCase
{
    private PDO $pdo;

    protected function setUp(): void
    {
        $this->pdo = Database::connect(':memory:');
    }

    public function testRegisterAndLoginSuccess(): void
    {
        $res = AuthService::register($this->pdo, 'budi', 'Budi Santoso', 'secret123');
        $this->assertArrayHasKey('token', $res);
        $this->assertEquals('budi', $res['user']['username']);
        $this->assertEquals('Budi Santoso', $res['user']['full_name']);

        $login = AuthService::login($this->pdo, 'budi', 'secret123');
        $this->assertArrayHasKey('token', $login);
        $this->assertEquals('budi', $login['user']['username']);

        $user = AuthService::validateToken($this->pdo, $login['token']);
        $this->assertNotNull($user);
        $this->assertEquals('budi', $user['username']);
    }

    public function testRegisterDuplicateUsernameFails(): void
    {
        AuthService::register($this->pdo, 'alice', 'Alice', 'pass123');
        $this->expectException(\InvalidArgumentException::class);
        AuthService::register($this->pdo, 'alice', 'Alice Two', 'pass456');
    }

    public function testLoginWrongPasswordFails(): void
    {
        AuthService::register($this->pdo, 'bob', 'Bob', 'password123');
        $this->expectException(\InvalidArgumentException::class);
        AuthService::login($this->pdo, 'bob', 'wrongpass');
    }
}
