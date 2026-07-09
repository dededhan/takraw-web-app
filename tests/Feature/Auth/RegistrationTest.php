<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_screen_can_be_rendered(): void
    {
        $response = $this->get('/register');

        $response->assertStatus(200);
    }

    public function test_new_users_can_register(): void
    {
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'role' => 'coach',
            'phone' => '0812345678',
        ]);

        $this->assertGuest();
        $response->assertRedirect(route('login'));
        $response->assertSessionHas('status', 'Registrasi berhasil! Akun Anda sedang menunggu persetujuan admin.');

        $this->assertDatabaseHas('users', [
            'email' => 'test@example.com',
            'role' => 'coach',
            'phone' => '0812345678',
            'is_active' => false,
        ]);
    }
}
