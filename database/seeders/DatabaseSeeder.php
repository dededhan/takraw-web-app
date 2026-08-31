<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $accounts = [
            [
                'name' => 'Admin Takraw',
                'email' => 'admin@takraw.test',
                'password' => 'password',
                'role' => 'admin',
                'phone' => '081234567890',
            ],
            [
                'name' => 'Pelatih Jakarta',
                'email' => 'coach1@takraw.test',
                'password' => 'password',
                'role' => 'coach',
                'phone' => '081234567891',
            ],
            [
                'name' => 'Pelatih Bandung',
                'email' => 'coach2@takraw.test',
                'password' => 'password',
                'role' => 'coach',
                'phone' => '081234567892',
            ],
            [
                'name' => 'Pelatih Surabaya',
                'email' => 'coach3@takraw.test',
                'password' => 'password',
                'role' => 'coach',
                'phone' => null,
            ],
            [
                'name' => 'Pelatih Yogyakarta',
                'email' => 'coach4@takraw.test',
                'password' => 'password',
                'role' => 'coach',
                'phone' => null,
            ],
            [
                'name' => 'Wasit Utama',
                'email' => 'referee1@takraw.test',
                'password' => 'password',
                'role' => 'referee',
                'phone' => '081234567893',
            ],
            [
                'name' => 'Wasit Cadangan',
                'email' => 'referee2@takraw.test',
                'password' => 'password',
                'role' => 'referee',
                'phone' => null,
            ],
        ];

        foreach ($accounts as $account) {
            User::updateOrCreate(
                ['email' => $account['email']],
                [
                    'name' => $account['name'],
                    'password' => Hash::make($account['password']),
                    'role' => $account['role'],
                    'phone' => $account['phone'],
                    'is_active' => true,
                ]
            );
        }

        $this->command->info('✅ User accounts seeded successfully!');
    }
}
