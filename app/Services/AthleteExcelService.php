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
            ['Candra Saputra', 3, 'Killer', 'L', 'Spiker Utama'],
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
            '3. Posisi yang didukung: Tekong, Feeder, Killer, atau Cadangan (jika kosong akan otomatis diset sebagai Cadangan).',
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
                if (empty($name) || str_starts_with($name, '📌') || str_starts_with($name, '1.') || str_starts_with($name, '2.')) {
                    continue;
                }

                $jersey = (int)trim((string)($row[$jerseyCol] ?? 0));
                $position = trim((string)($row[$posCol] ?? 'Cadangan'));

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
                while (($row = fgetcsv($handle)) !== null) {
                    if (count($row) < 2) continue;
                    $name = trim($row[0] ?? '');
                    if (empty($name)) continue;

                    $jersey = (int)trim($row[1] ?? 0);
                    $position = trim($row[2] ?? 'Cadangan');

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
}
