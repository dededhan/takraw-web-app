<?php

namespace App\Services;

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\IOFactory;

class AthleteExcelService
{
    /**
     * Generate an ultra-clean, professionally styled XLSX athlete template.
     */
    public function generateTemplate(): string
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Template Atlet');

        // Set default font
        $spreadsheet->getDefaultStyle()->getFont()->setName('Calibri')->setSize(11);

        // ─── 1. Title Banner (Row 1-2) ──────────────────────────
        $sheet->mergeCells('A1:E1');
        $sheet->setCellValue('A1', '🏆 TEMPLATE IMPORT DATA ATLET SEPAK TAKRAW');
        $sheet->getStyle('A1')->getFont()->setSize(14)->setBold(true)->getColor()->setRGB('FFFFFF');
        $sheet->getStyle('A1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getStyle('A1')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('1E293B'); // Slate 800
        $sheet->getRowDimension(1)->setRowHeight(30);

        $sheet->mergeCells('A2:E2');
        $sheet->setCellValue('A2', 'Isi data atlet binaan Anda di bawah ini sesuai format yang telah disediakan.');
        $sheet->getStyle('A2')->getFont()->setSize(10)->setItalic(true)->getColor()->setRGB('94A3B8');
        $sheet->getStyle('A2')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getStyle('A2')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('0F172A'); // Slate 900
        $sheet->getRowDimension(2)->setRowHeight(20);

        // ─── 2. Table Headers (Row 4) ───────────────────────────
        $headers = [
            'A4' => 'Nama Lengkap Atlet *',
            'B4' => 'Nomor Punggung *',
            'C4' => 'Posisi Utama',
            'D4' => 'Jenis Kelamin (L/P)',
            'E4' => 'Catatan / Keterangan',
        ];

        foreach ($headers as $cell => $text) {
            $sheet->setCellValue($cell, $text);
        }

        $headerStyle = [
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
                'size' => 11,
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical'   => Alignment::VERTICAL_CENTER,
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '2563EB'], // Royal Blue
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_MEDIUM,
                    'color' => ['rgb' => '1D4ED8'],
                ],
            ],
        ];
        $sheet->getStyle('A4:E4')->applyFromArray($headerStyle);
        $sheet->getRowDimension(4)->setRowHeight(26);

        // ─── 3. Sample Data Rows (Row 5 - 8) ────────────────────
        $sampleData = [
            ['Budi Santoso', 10, 'Tekong', 'L', 'Kapten Tim / Servis Utama'],
            ['Andi Wijaya', 7, 'Feeder', 'L', 'Pengumpan / Toss'],
            ['Candra Saputra', 3, 'Smash', 'L', 'Spiker / Smasher Utama'],
            ['Dedi Hermawan', 12, 'Cadangan', 'L', 'Pemain Cadangan'],
        ];

        $rowNum = 5;
        foreach ($sampleData as $row) {
            $sheet->setCellValue('A' . $rowNum, $row[0]);
            $sheet->setCellValue('B' . $rowNum, $row[1]);
            $sheet->setCellValue('C' . $rowNum, $row[2]);
            $sheet->setCellValue('D' . $rowNum, $row[3]);
            $sheet->setCellValue('E' . $rowNum, $row[4]);

            $isEven = $rowNum % 2 === 0;
            $rowStyle = [
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => $isEven ? 'F8FAFC' : 'FFFFFF'],
                ],
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color' => ['rgb' => 'E2E8F0'],
                    ],
                ],
            ];
            $sheet->getStyle("A{$rowNum}:E{$rowNum}")->applyFromArray($rowStyle);
            $sheet->getStyle("B{$rowNum}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("C{$rowNum}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("D{$rowNum}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getRowDimension($rowNum)->setRowHeight(22);
            $rowNum++;
        }

        // ─── 4. Instructions & Guidelines (Row 10 - 16) ─────────
        $sheet->mergeCells('A10:E10');
        $sheet->setCellValue('A10', '📌 PETUNJUK PENGISIAN DATA:');
        $sheet->getStyle('A10')->getFont()->setBold(true)->getColor()->setRGB('1E293B');

        $instructions = [
            '1. Kolom dengan tanda bintang (*) WAJIB diisi.',
            '2. Nomor Punggung harus berupa ANGKA positif (1-99) dan tidak boleh sama/duplikat dalam satu tim.',
            '3. Posisi yang didukung: Tekong, Feeder, Smash, atau Cadangan (jika kosong akan otomatis diset sebagai Tekong).',
            '4. Jangan mengubah baris Header (Baris 4). Anda dapat langsung mengganti atau menambahkan data atlet mulai Baris 5 ke bawah.',
            '5. Simpan file ini dalam format .xlsx atau .csv lalu upload pada menu Tim Saya → Import Atlet.',
        ];

        $instRow = 11;
        foreach ($instructions as $inst) {
            $sheet->mergeCells("A{$instRow}:E{$instRow}");
            $sheet->setCellValue("A{$instRow}", $inst);
            $sheet->getStyle("A{$instRow}")->getFont()->setSize(9.5)->getColor()->setRGB('475569');
            $instRow++;
        }

        // Auto-size columns with padding
        foreach (range('A', 'E') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $writer = new Xlsx($spreadsheet);
        ob_start();
        $writer->save('php://output');
        return ob_get_clean();
    }

    /**
     * Generate a clean CSV athlete template (header + sample rows only).
     * Kept separate from the XLSX template because the XLSX version has
     * banner/instruction rows that don't translate cleanly to plain CSV.
     */
    public function generateCsvTemplate(): string
    {
        $rows = [
            ['Nama Lengkap', 'Nomor Punggung', 'Posisi'],
            ['Budi Santoso', 10, 'Tekong'],
            ['Andi Wijaya', 7, 'Feeder'],
            ['Candra Saputra', 3, 'Smash'],
            ['Dedi Hermawan', 12, 'Cadangan'],
        ];

        $handle = fopen('php://temp', 'r+');
        foreach ($rows as $row) {
            fputcsv($handle, $row);
        }
        rewind($handle);
        $content = stream_get_contents($handle);
        fclose($handle);

        return $content;
    }

    /**
     * Parse uploaded file (XLSX, XLS, or CSV) into athlete rows array.
     */
    public function parseAthletesFile(string $filePath, string $extension): array
    {
        $athletes = [];

        if (in_array(strtolower($extension), ['xlsx', 'xls'])) {
            $spreadsheet = IOFactory::load($filePath);
            $sheet = $spreadsheet->getActiveSheet();
            $rows = $sheet->toArray();

            $headerFound = false;
            $nameCol = 0;
            $jerseyCol = 1;
            $posCol = 2;

            foreach ($rows as $row) {
                if (!$headerFound) {
                    // Look for header row
                    $rowLower = array_map(fn($v) => strtolower(trim((string)$v)), $row);
                    foreach ($rowLower as $idx => $cellVal) {
                        if (str_contains($cellVal, 'nama')) {
                            $nameCol = $idx;
                            $headerFound = true;
                        }
                        if (str_contains($cellVal, 'nomor') || str_contains($cellVal, 'jersey') || str_contains($cellVal, 'punggung')) {
                            $jerseyCol = $idx;
                        }
                        if (str_contains($cellVal, 'posisi') || str_contains($cellVal, 'position')) {
                            $posCol = $idx;
                        }
                    }
                    continue;
                }

                // If this is instruction row or empty, break/skip
                if (empty($row[$nameCol]) && empty($row[$jerseyCol])) {
                    continue;
                }

                $name = trim((string)($row[$nameCol] ?? ''));
                if (empty($name)) {
                    continue;
                }

                // Filter out instruction banners, numbered guides, and notes
                if (
                    str_starts_with($name, '📌') ||
                    preg_match('/^\d+\./', $name) ||
                    str_contains(strtolower($name), 'petunjuk') ||
                    str_contains(strtolower($name), 'kolom') ||
                    str_contains(strtolower($name), 'catatan')
                ) {
                    continue;
                }

                $jersey = (int)trim((string)($row[$jerseyCol] ?? 0));
                // Only valid jersey numbers between 1 and 999 are accepted
                if ($jersey <= 0 || $jersey > 999) {
                    continue;
                }

                $rawPos = trim((string)($row[$posCol] ?? ''));
                $position = !empty($rawPos) ? ucfirst(strtolower($rawPos)) : 'Tekong';
                if (strcasecmp($position, 'killer') === 0) {
                    $position = 'Smash';
                }
                if (!in_array($position, ['Tekong', 'Feeder', 'Smash', 'Cadangan'])) {
                    $position = 'Tekong';
                }

                $athletes[] = [
                    'name' => $name,
                    'jersey_number' => $jersey,
                    'position' => $position,
                ];
            }
        } else {
            // CSV fallback
            $handle = fopen($filePath, 'r');
            if ($handle !== false) {
                $header = fgetcsv($handle);
                while (($row = fgetcsv($handle)) !== false) {
                    if (!is_array($row) || count($row) < 2) continue;
                    $name = trim($row[0] ?? '');
                    if (empty($name)) continue;

                    if (
                        str_starts_with($name, '📌') ||
                        preg_match('/^\d+\./', $name) ||
                        str_contains(strtolower($name), 'petunjuk') ||
                        str_contains(strtolower($name), 'kolom') ||
                        str_contains(strtolower($name), 'nama lengkap')
                    ) {
                        continue;
                    }

                    $jersey = (int)trim($row[1] ?? 0);
                    if ($jersey <= 0 || $jersey > 999) {
                        continue;
                    }

                    $rawPos = trim($row[2] ?? '');
                    $position = !empty($rawPos) ? ucfirst(strtolower($rawPos)) : 'Tekong';
                    if (strcasecmp($position, 'killer') === 0) {
                        $position = 'Smash';
                    }
                    if (!in_array($position, ['Tekong', 'Feeder', 'Smash', 'Cadangan'])) {
                        $position = 'Tekong';
                    }

                    $athletes[] = [
                        'name' => $name,
                        'jersey_number' => $jersey,
                        'position' => $position,
                    ];
                }
                fclose($handle);
            }
        }

        return $athletes;
    }

    /**
     * Parse an Excel or CSV file that may contain multiple teams (e.g. UNJ Open format with Kontingen column)
     * or single-team format, returning structured teams and athletes.
     */
    public function parseMultiTeamFile(string $filePath, string $extension): array
    {
        $ext = strtolower($extension);
        if (!in_array($ext, ['xlsx', 'xls', 'csv', 'txt'])) {
            throw new \InvalidArgumentException('Format file tidak didukung.');
        }

        if ($ext === 'csv' || $ext === 'txt') {
            return $this->parseCsvMultiTeam($filePath);
        }

        $spreadsheet = IOFactory::load($filePath);
        $sheetNames = $spreadsheet->getSheetNames();

        $teamsMap = [];
        $hasTeamColumnGlobal = false;
        $allAthletesFallback = [];

        foreach ($sheetNames as $sheetName) {
            $sheet = $spreadsheet->getSheetByName($sheetName);
            $rows = $sheet->toArray();
            if (empty($rows)) {
                continue;
            }

            $headerFound = false;
            $nameCol = null;
            $teamCol = null;
            // Search header row in first 30 rows
            foreach ($rows as $rowIndex => $row) {
                if ($headerFound) {
                    break;
                }

                // Check for banner rows to ignore
                $rowText = implode(' ', array_map(fn($v) => strtolower(trim((string)$v)), $row));
                if (
                    str_contains($rowText, 'daftar nama') ||
                    str_contains($rowText, 'petunjuk') ||
                    str_contains($rowText, 'peraturan')
                ) {
                    continue;
                }

                $rowClean = array_map(fn($v) => strtolower(trim((string)$v)), $row);
                $currNameCol = null;
                $currTeamCol = null;
                $currPosCol = null;
                $currJerseyCol = null;

                foreach ($rowClean as $cIdx => $val) {
                    if (empty($val)) continue;
                    if (str_contains($val, 'nama') || str_contains($val, 'atlet') || str_contains($val, 'pemain')) {
                        if ($currNameCol === null) $currNameCol = $cIdx;
                    }
                    if (
                        str_contains($val, 'kontingen') ||
                        str_contains($val, 'nama tim') ||
                        str_contains($val, 'nama club') ||
                        str_contains($val, 'nama regu') ||
                        $val === 'tim' ||
                        $val === 'team' ||
                        $val === 'club' ||
                        $val === 'regu'
                    ) {
                        $currTeamCol = $cIdx;
                    }
                    if (str_contains($val, 'posisi') || str_contains($val, 'position')) {
                        $currPosCol = $cIdx;
                    }
                    if (str_contains($val, 'nomor') || str_contains($val, 'jersey') || str_contains($val, 'punggung') || $val === 'no') {
                        $currJerseyCol = $cIdx;
                    }
                }

                // A valid table header must identify name AND at least one other column (team, position, or jersey)
                if ($currNameCol !== null && ($currTeamCol !== null || $currPosCol !== null || $currJerseyCol !== null)) {
                    $headerFound = true;
                    $nameCol = $currNameCol;
                    $teamCol = $currTeamCol;
                    $posCol = $currPosCol;
                    $jerseyCol = $currJerseyCol;
                    if ($currTeamCol !== null) {
                        $hasTeamColumnGlobal = true;
                    }
                    $rows = array_slice($rows, $rowIndex + 1);
                    break;
                }
            }

            if (!$headerFound || $nameCol === null) {
                continue;
            }

            // Iterate data rows in this sheet
            foreach ($rows as $row) {
                $rawName = trim((string)($row[$nameCol] ?? ''));
                $rawTeam = $teamCol !== null ? trim((string)($row[$teamCol] ?? '')) : '';
                $rawPos = $posCol !== null ? trim((string)($row[$posCol] ?? '')) : '';
                $rawJersey = $jerseyCol !== null ? trim((string)($row[$jerseyCol] ?? '')) : '';

                // Skip headers/banners/empty rows
                if (empty($rawName) && empty($rawTeam)) {
                    continue;
                }
                if (
                    str_starts_with($rawName, '📌') ||
                    str_starts_with($rawName, '🏆') ||
                    preg_match('/^\d+\./', $rawName) ||
                    str_contains(strtolower($rawName), 'daftar nama') ||
                    str_contains(strtolower($rawName), 'petunjuk') ||
                    str_contains(strtolower($rawName), 'kolom')
                ) {
                    continue;
                }

                // If team column is present
                if ($teamCol !== null && !empty($rawTeam)) {
                    $teamKey = strtoupper($rawTeam);
                    if (!isset($teamsMap[$teamKey])) {
                        $teamsMap[$teamKey] = [
                            'team_name' => $rawTeam,
                            'sheet_name' => $sheetName,
                            'coach_name' => null,
                            'officials' => [],
                            'athletes' => [],
                        ];
                    }

                    // Check if row is an official (Coach, Asisten Coach, Manager, Official)
                    $upperPos = strtoupper($rawPos);
                    if (
                        str_contains($upperPos, 'COACH') ||
                        str_contains($upperPos, 'PELATIH') ||
                        str_contains($upperPos, 'MANAGER') ||
                        str_contains($upperPos, 'MANAJER') ||
                        str_contains($upperPos, 'OFFICIAL')
                    ) {
                        if (!empty($rawName)) {
                            $teamsMap[$teamKey]['officials'][] = [
                                'name' => $rawName,
                                'role' => $rawPos,
                            ];
                            if (empty($teamsMap[$teamKey]['coach_name']) && (str_contains($upperPos, 'COACH') || str_contains($upperPos, 'PELATIH'))) {
                                $teamsMap[$teamKey]['coach_name'] = $rawName;
                            }
                        }
                        continue;
                    }

                    if (empty($rawName)) {
                        continue;
                    }

                    // Format athlete position
                    $position = $this->normalizePosition($rawPos);

                    // Determine jersey number
                    $jersey = (int)$rawJersey;
                    if ($jersey <= 0 || $jersey > 999) {
                        $jersey = count($teamsMap[$teamKey]['athletes']) + 1;
                    }

                    // Ensure jersey is unique for this team
                    $usedJerseys = array_column($teamsMap[$teamKey]['athletes'], 'jersey_number');
                    while (in_array($jersey, $usedJerseys)) {
                        $jersey++;
                    }

                    $teamsMap[$teamKey]['athletes'][] = [
                        'name' => $rawName,
                        'jersey_number' => $jersey,
                        'position' => $position,
                    ];
                } elseif (!empty($rawName)) {
                    // No team column or row without team
                    $position = $this->normalizePosition($rawPos);
                    $jersey = (int)$rawJersey;
                    if ($jersey <= 0 || $jersey > 999) {
                        $jersey = count($allAthletesFallback) + 1;
                    }
                    $allAthletesFallback[] = [
                        'name' => $rawName,
                        'jersey_number' => $jersey,
                        'position' => $position,
                    ];
                }
            }
        }

        if ($hasTeamColumnGlobal && !empty($teamsMap)) {
            $totalAthletes = 0;
            $teamsList = [];
            foreach ($teamsMap as $t) {
                $totalAthletes += count($t['athletes']);
                $teamsList[] = $t;
            }

            return [
                'has_teams' => true,
                'total_athletes' => $totalAthletes,
                'teams' => $teamsList,
            ];
        }

        // Single list fallback
        $fallback = !empty($allAthletesFallback) ? $allAthletesFallback : $this->parseAthletesFile($filePath, $extension);
        return [
            'has_teams' => false,
            'total_athletes' => count($fallback),
            'athletes' => $fallback,
        ];
    }

    /**
     * CSV fallback parser for multi-team or single list.
     */
    private function parseCsvMultiTeam(string $filePath): array
    {
        $handle = fopen($filePath, 'r');
        if ($handle === false) {
            return ['has_teams' => false, 'total_athletes' => 0, 'athletes' => []];
        }

        $rows = [];
        while (($row = fgetcsv($handle)) !== false) {
            $rows[] = $row;
        }
        fclose($handle);

        if (empty($rows)) {
            return ['has_teams' => false, 'total_athletes' => 0, 'athletes' => []];
        }

        $headerFound = false;
        $nameCol = null;
        $teamCol = null;
        $posCol = null;
        $jerseyCol = null;

        foreach ($rows as $rowIndex => $row) {
            if ($headerFound) break;

            $rowText = implode(' ', array_map(fn($v) => strtolower(trim((string)$v)), $row));
            if (
                str_contains($rowText, 'daftar nama') ||
                str_contains($rowText, 'petunjuk') ||
                str_contains($rowText, 'peraturan')
            ) {
                continue;
            }

            $rowClean = array_map(fn($v) => strtolower(trim((string)$v)), $row);
            $currNameCol = null;
            $currTeamCol = null;
            $currPosCol = null;
            $currJerseyCol = null;

            foreach ($rowClean as $cIdx => $val) {
                if (str_contains($val, 'nama') || str_contains($val, 'atlet') || str_contains($val, 'pemain')) {
                    if ($currNameCol === null) $currNameCol = $cIdx;
                }
                if (str_contains($val, 'kontingen') || str_contains($val, 'tim') || str_contains($val, 'team')) {
                    $currTeamCol = $cIdx;
                }
                if (str_contains($val, 'posisi') || str_contains($val, 'position')) {
                    $currPosCol = $cIdx;
                }
                if (str_contains($val, 'nomor') || str_contains($val, 'jersey') || str_contains($val, 'no')) {
                    $currJerseyCol = $cIdx;
                }
            }

            if ($currNameCol !== null && ($currTeamCol !== null || $currPosCol !== null || $currJerseyCol !== null)) {
                $headerFound = true;
                $nameCol = $currNameCol;
                $teamCol = $currTeamCol;
                $posCol = $currPosCol;
                $jerseyCol = $currJerseyCol;
                $rows = array_slice($rows, $rowIndex + 1);
                break;
            }
        }

        if ($teamCol !== null) {
            $teamsMap = [];
            foreach ($rows as $row) {
                $rawName = trim((string)($row[$nameCol] ?? ''));
                $rawTeam = trim((string)($row[$teamCol] ?? ''));
                $rawPos = $posCol !== null ? trim((string)($row[$posCol] ?? '')) : '';
                $rawJersey = $jerseyCol !== null ? trim((string)($row[$jerseyCol] ?? '')) : '';

                if (empty($rawName) || empty($rawTeam)) continue;
                $teamKey = strtoupper($rawTeam);
                if (!isset($teamsMap[$teamKey])) {
                    $teamsMap[$teamKey] = [
                        'team_name' => $rawTeam,
                        'coach_name' => null,
                        'officials' => [],
                        'athletes' => [],
                    ];
                }

                $upperPos = strtoupper($rawPos);
                if (str_contains($upperPos, 'COACH') || str_contains($upperPos, 'MANAGER')) {
                    $teamsMap[$teamKey]['officials'][] = ['name' => $rawName, 'role' => $rawPos];
                    if (str_contains($upperPos, 'COACH') && empty($teamsMap[$teamKey]['coach_name'])) {
                        $teamsMap[$teamKey]['coach_name'] = $rawName;
                    }
                    continue;
                }

                $jersey = (int)$rawJersey;
                if ($jersey <= 0 || $jersey > 999) {
                    $jersey = count($teamsMap[$teamKey]['athletes']) + 1;
                }
                $teamsMap[$teamKey]['athletes'][] = [
                    'name' => $rawName,
                    'jersey_number' => $jersey,
                    'position' => $this->normalizePosition($rawPos),
                ];
            }

            $total = array_reduce($teamsMap, fn($c, $t) => $c + count($t['athletes']), 0);
            return [
                'has_teams' => true,
                'total_athletes' => $total,
                'teams' => array_values($teamsMap),
            ];
        }

        $fallback = $this->parseAthletesFile($filePath, 'csv');
        return [
            'has_teams' => false,
            'total_athletes' => count($fallback),
            'athletes' => $fallback,
        ];
    }

    /**
     * Helper to normalize takraw player positions.
     */
    public function normalizePosition(string $rawPos): string
    {
        $pos = trim($rawPos);
        if (empty($pos)) {
            return 'Tekong';
        }
        if (strcasecmp($pos, 'killer') === 0 || strcasecmp($pos, 'spiker') === 0) {
            return 'Smash';
        }
        if (strcasecmp($pos, 'toss') === 0 || strcasecmp($pos, 'pengumpan') === 0) {
            return 'Feeder';
        }
        $formatted = ucfirst(strtolower($pos));
        if (in_array($formatted, ['Tekong', 'Feeder', 'Smash', 'Cadangan'])) {
            return $formatted;
        }
        return 'Tekong';
    }
}

