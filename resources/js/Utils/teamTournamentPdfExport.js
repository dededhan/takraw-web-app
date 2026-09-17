import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generate and download an official Team Tournament Performance Report PDF.
 * Consolidates all matches, overall team action performance, and athlete roster statistics.
 *
 * @param {Object} tournament
 * @param {Object} team
 * @param {Object} teamAggStats
 * @param {Array} athleteLeaderboard
 * @param {Array} teamMatches
 */
export function exportTeamTournamentPdf({
    tournament,
    team,
    teamAggStats,
    athleteLeaderboard = [],
    teamMatches = [],
}) {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    const formatActionPerf = (inCount = 0, aceCount = 0, errCount = 0) => {
        const inC = Number(inCount) || 0;
        const aceC = Number(aceCount) || 0;
        const errC = Number(errCount) || 0;
        const success = inC + aceC;
        const total = success + errC;
        if (total === 0) return { inC, aceC, errC, success: 0, total: 0, pct: '0%' };
        const pct = `${Math.round((success / total) * 100)}%`;
        return { inC, aceC, errC, success, total, pct };
    };

    // Calculate actions
    const serv = formatActionPerf(teamAggStats.service_in, teamAggStats.service_ace, teamAggStats.service_error);
    const strike = formatActionPerf(teamAggStats.strike_in || teamAggStats.strike_success, teamAggStats.strike_ace, teamAggStats.strike_error || teamAggStats.strike_fail);
    const free = formatActionPerf(teamAggStats.freeball_in, teamAggStats.freeball_ace, teamAggStats.freeball_error);
    const first = formatActionPerf(teamAggStats.firstball_in || teamAggStats.receive_success, teamAggStats.firstball_ace, teamAggStats.firstball_error || teamAggStats.receive_fail);
    const feed = formatActionPerf(teamAggStats.feeding_in || teamAggStats.feeding_success, teamAggStats.feeding_ace, teamAggStats.feeding_error || teamAggStats.feeding_fail);
    const block = formatActionPerf(teamAggStats.blocking_in || teamAggStats.block_success, teamAggStats.blocking_ace, teamAggStats.blocking_error || teamAggStats.block_fail);

    const totalIn = serv.inC + strike.inC + free.inC + first.inC + feed.inC + block.inC;
    const totalAce = serv.aceC + strike.aceC + free.aceC + first.aceC + feed.aceC + block.aceC;
    const totalErr = serv.errC + strike.errC + free.errC + first.errC + feed.errC + block.errC;
    const totalSuccess = totalIn + totalAce;
    const totalAttempts = totalSuccess + totalErr;
    const overallPct = totalAttempts > 0 ? `${Math.round((totalSuccess / totalAttempts) * 100)}%` : '0%';

    // Wins and Losses
    const finishedMatches = teamMatches.filter(m => m.status === 'finished');
    let winsCount = 0;
    let lossesCount = 0;
    finishedMatches.forEach(m => {
        const isWinner = team.is_super
            ? m.winner_super_team_id === team.id
            : m.winner_team_id === team.id;
        if (isWinner) winsCount++;
        else lossesCount++;
    });
    const winRate = finishedMatches.length > 0 ? `${Math.round((winsCount / finishedMatches.length) * 100)}%` : '0%';

    // Page Geometry
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    let currentY = 14;

    // ─────────────────────────────────────────────────────────────────
    // 1. HEADER SECTION
    // ─────────────────────────────────────────────────────────────────
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(margin, currentY, pageWidth - margin * 2, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('LAPORAN AKUMULASI PERFORMA TIM (SEMUA LAGA)', pageWidth / 2, currentY + 7, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225); // Slate-300
    doc.text(`Turnamen: ${tournament.name || 'Kejuaraan Sepak Takraw'}`, pageWidth / 2, currentY + 13, { align: 'center' });
    doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth / 2, currentY + 18, { align: 'center' });

    currentY += 28;

    // ─────────────────────────────────────────────────────────────────
    // 2. METADATA & SUMMARY BOXES
    // ─────────────────────────────────────────────────────────────────
    const boxWidth = (pageWidth - margin * 2 - 6) / 2;
    
    // Left Box: Team Profile
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, boxWidth, 22, 2, 2, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Tim: ${team.name} ${team.is_super ? '[SUPER TEAM]' : ''}`, margin + 4, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Wilayah / Asal: ${team.region || 'Tanpa Wilayah'}`, margin + 4, currentY + 11);
    doc.text(`Jumlah Atlet Terdaftar: ${team.is_super ? (team.members?.flatMap(m => m.athletes || []).length || 0) : (team.athletes?.length || 0)} Pemain`, margin + 4, currentY + 16);

    // Right Box: Match Record & Performance KPI
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin + boxWidth + 6, currentY, boxWidth, 22, 2, 2, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Hasil Laga: ${winsCount} Menang - ${lossesCount} Kalah (Win Rate: ${winRate})`, margin + boxWidth + 10, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Total Laga Selesai: ${finishedMatches.length} Pertandingan`, margin + boxWidth + 10, currentY + 11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129); // Emerald-600
    doc.text(`Total All Performance: ${overallPct} (${totalSuccess}/${totalAttempts} Sukses)`, margin + boxWidth + 10, currentY + 16);

    currentY += 26;

    // ─────────────────────────────────────────────────────────────────
    // 3. TABEL 1: REKAP PERFORMA TIM (SEMUA PARAMETER)
    // ─────────────────────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('I. Parameter Statistik Performa Tim (Semua Pertandingan)', margin, currentY);
    currentY += 3;

    const actionTableData = [
        ['Servis (Tekong)', serv.inC, serv.aceC, serv.errC, serv.success, serv.total, serv.pct],
        ['Strike / Smash (Killer)', strike.inC, strike.aceC, strike.errC, strike.success, strike.total, strike.pct],
        ['Freeball', free.inC, free.aceC, free.errC, free.success, free.total, free.pct],
        ['Firstball / Receive', first.inC, first.aceC, first.errC, first.success, first.total, first.pct],
        ['Feeding / Umpan (Feeder)', feed.inC, feed.aceC, feed.errC, feed.success, feed.total, feed.pct],
        ['Blocking / Pertahanan', block.inC, block.aceC, block.errC, block.success, block.total, block.pct],
        ['TOTAL ALL PERFORMANCE', totalIn, totalAce, totalErr, totalSuccess, totalAttempts, overallPct],
    ];

    autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [['Parameter Statistik', 'Bola Masuk (In)', 'Bola Poin (Ace)', 'Error (Err)', 'Total Sukses', 'Total Percobaan', 'Performa (%)']],
        body: actionTableData,
        theme: 'grid',
        headStyles: {
            fillColor: [30, 41, 59],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
            halign: 'center',
        },
        columnStyles: {
            0: { halign: 'left', fontStyle: 'bold', cellWidth: 50 },
            1: { halign: 'center' },
            2: { halign: 'center' },
            3: { halign: 'center' },
            4: { halign: 'center', fontStyle: 'bold' },
            5: { halign: 'center' },
            6: { halign: 'center', fontStyle: 'bold' },
        },
        styles: {
            fontSize: 8,
            cellPadding: 2,
        },
        didParseCell: (data) => {
            if (data.row.index === actionTableData.length - 1) {
                data.cell.styles.fillColor = [254, 243, 199]; // Amber-100
                data.cell.styles.textColor = [146, 64, 14]; // Amber-800
                data.cell.styles.fontStyle = 'bold';
            }
        },
    });

    currentY = doc.lastAutoTable.finalY + 8;

    // ─────────────────────────────────────────────────────────────────
    // 4. TABEL 2: RIWAYAT SEMUA PERTANDINGAN TIM
    // ─────────────────────────────────────────────────────────────────
    if (finishedMatches.length > 0) {
        if (currentY > 230) {
            doc.addPage();
            currentY = 16;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text('II. Rincian Pertandingan yang Telah Dimainkan', margin, currentY);
        currentY += 3;

        const stageLabels = {
            pool: 'Babak Pool',
            round_of_16: '16 Besar',
            quarterfinal: 'Perempat Final',
            semifinal: 'Semifinal',
            third_place: 'Juara 3',
            final: 'Final',
        };

        const matchTableData = finishedMatches.map((m, idx) => {
            const isHome = team.is_super ? m.home_super_team_id === team.id : m.home_team_id === team.id;
            const oppName = isHome
                ? (team.is_super ? (m.away_super_team?.name || 'Lawan') : (m.away_team?.name || 'Lawan'))
                : (team.is_super ? (m.home_super_team?.name || 'Lawan') : (m.home_team?.name || 'Lawan'));

            const sets = m.sets || [];
            let mySetsWon = 0;
            let oppSetsWon = 0;
            const setScores = sets.map(s => {
                const myScore = isHome ? Number(s.home_score) || 0 : Number(s.away_score) || 0;
                const oppScore = isHome ? Number(s.away_score) || 0 : Number(s.home_score) || 0;
                if (myScore > oppScore) mySetsWon++;
                else if (oppScore > myScore) oppSetsWon++;
                return `${myScore}-${oppScore}`;
            });

            const isWinner = team.is_super ? m.winner_super_team_id === team.id : m.winner_team_id === team.id;

            return [
                idx + 1,
                stageLabels[m.stage] || m.stage || '-',
                `vs ${oppName}`,
                `${mySetsWon} - ${oppSetsWon}`,
                setScores.join(', ') || '-',
                isWinner ? 'MENANG' : 'KALAH',
            ];
        });

        autoTable(doc, {
            startY: currentY,
            margin: { left: margin, right: margin },
            head: [['No', 'Babak', 'Lawan', 'Set (M-K)', 'Rincian Skor Set', 'Hasil']],
            body: matchTableData,
            theme: 'grid',
            headStyles: {
                fillColor: [51, 65, 85],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8,
                halign: 'center',
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                1: { halign: 'center', cellWidth: 26 },
                2: { halign: 'left' },
                3: { halign: 'center', fontStyle: 'bold', cellWidth: 24 },
                4: { halign: 'center', cellWidth: 40 },
                5: { halign: 'center', fontStyle: 'bold', cellWidth: 22 },
            },
            styles: {
                fontSize: 8,
                cellPadding: 2,
            },
            didParseCell: (data) => {
                if (data.column.index === 5 && data.section === 'body') {
                    if (data.cell.raw === 'MENANG') {
                        data.cell.styles.textColor = [16, 185, 129];
                    } else {
                        data.cell.styles.textColor = [239, 68, 68];
                    }
                }
            },
        });

        currentY = doc.lastAutoTable.finalY + 8;
    }

    // ─────────────────────────────────────────────────────────────────
    // 5. TABEL 3: REKAP PERFORMA INDIVIDU SELURUH ATLET
    // ─────────────────────────────────────────────────────────────────
    if (athleteLeaderboard && athleteLeaderboard.length > 0) {
        if (currentY > 210) {
            doc.addPage();
            currentY = 16;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text('III. Rekapitulasi Statistik Atlet Binaan (Semua Pertandingan)', margin, currentY);
        currentY += 3;

        const athleteTableData = athleteLeaderboard.map((a, idx) => {
            const stats = a.stats || {};
            const sIn = (stats.service_in || 0) + (stats.strike_in || stats.strike_success || 0) + (stats.freeball_in || 0) + (stats.firstball_in || stats.receive_success || 0) + (stats.feeding_in || stats.feeding_success || 0) + (stats.blocking_in || stats.block_success || 0);
            const sAce = (stats.service_ace || 0) + (stats.strike_ace || 0) + (stats.freeball_ace || 0) + (stats.firstball_ace || 0) + (stats.feeding_ace || 0) + (stats.blocking_ace || 0);
            const sErr = (stats.service_error || 0) + (stats.strike_error || stats.strike_fail || 0) + (stats.freeball_error || 0) + (stats.firstball_error || stats.receive_fail || 0) + (stats.feeding_error || stats.feeding_fail || 0) + (stats.blocking_error || stats.block_fail || 0);
            const sSuccess = sIn + sAce;
            const sTotal = sSuccess + sErr;
            const sPct = sTotal > 0 ? `${Math.round((sSuccess / sTotal) * 100)}%` : '0%';

            return [
                idx + 1,
                `#${a.jersey_number || '-'}`,
                a.name,
                a.position || 'All-Round',
                a.matches_played || 0,
                a.sets_played || 0,
                sSuccess,
                sTotal,
                sPct,
            ];
        });

        autoTable(doc, {
            startY: currentY,
            margin: { left: margin, right: margin },
            head: [['No', 'Jersey', 'Nama Atlet', 'Posisi', 'Laga', 'Set', 'Sukses', 'Total', 'Performa']],
            body: athleteTableData,
            theme: 'grid',
            headStyles: {
                fillColor: [30, 41, 59],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8,
                halign: 'center',
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 8 },
                1: { halign: 'center', cellWidth: 14 },
                2: { halign: 'left' },
                3: { halign: 'center', cellWidth: 26 },
                4: { halign: 'center', cellWidth: 12 },
                5: { halign: 'center', cellWidth: 12 },
                6: { halign: 'center', fontStyle: 'bold', cellWidth: 16 },
                7: { halign: 'center', cellWidth: 16 },
                8: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
            },
            styles: {
                fontSize: 8,
                cellPadding: 2,
            },
        });

        currentY = doc.lastAutoTable.finalY + 12;
    }

    // ─────────────────────────────────────────────────────────────────
    // 6. FOOTER & SIGNATURE
    // ─────────────────────────────────────────────────────────────────
    if (currentY > 250) {
        doc.addPage();
        currentY = 20;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Catatan: Data laporan ini dihasilkan secara otomatis berdasarkan pencatatan wasit resmi pertandingan.', margin, currentY);

    const signX = pageWidth - margin - 50;
    doc.setTextColor(15, 23, 42);
    doc.text('Mengetahui / Mengesahkan,', signX, currentY + 8);
    doc.text('Pelatih / Manajer Tim,', signX, currentY + 12);
    doc.setFont('helvetica', 'bold');
    doc.text(`( ${team.name} )`, signX, currentY + 28);

    // Save PDF
    const cleanTeamName = (team.name || 'Team').replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanTourName = (tournament.name || 'Turnamen').replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`Laporan_Performa_${cleanTeamName}_${cleanTourName}.pdf`);
}
