import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generate and download a comprehensive match report PDF matching official Takraw standards.
 * Supports 10-zone ball position grids and complete team/athlete performance statistics.
 */
export function exportMatchReportPdf(match) {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    const homeName = match.home_display_name || match.home_team?.name || match.home_super_team?.name || 'Home Team';
    const awayName = match.away_display_name || match.away_team?.name || match.away_super_team?.name || 'Away Team';

    const finishedSets = match.sets?.filter(s => s.status === 'finished') || [];
    const setsWonHome = finishedSets.filter(s => s.winner_team_id === match.home_team_id || s.winner_team_id === match.home_super_team_id).length;
    const setsWonAway = finishedSets.filter(s => s.winner_team_id === match.away_team_id || s.winner_team_id === match.away_super_team_id).length;

    const allAthletes = [
        ...(match.home_team?.athletes || []),
        ...(match.away_team?.athletes || []),
        ...(match.home_super_team?.members?.flatMap(mem => mem.athletes || []) || []),
        ...(match.away_super_team?.members?.flatMap(mem => mem.athletes || []) || []),
    ];

    // Helper: calculate stats
    const getAthleteStatsForSet = (athleteId, setId = null) => {
        let stats = [];
        if (setId === 'all' || !setId) {
            match.sets?.forEach(s => {
                s.stats?.forEach(st => {
                    if (st.athlete_id === athleteId) stats.push(st);
                });
            });
        } else {
            const set = match.sets?.find(s => s.id === setId || s.set_number === setId);
            stats = set?.stats?.filter(st => st.athlete_id === athleteId) || [];
        }

        const agg = {
            service_in: 0, service_ace: 0, service_error: 0,
            receive_success: 0, receive_fail: 0,
            feeding_success: 0, feeding_fail: 0,
            strike_success: 0, strike_fail: 0,
            block_success: 0, block_fail: 0,
        };

        for (let i = 1; i <= 10; i++) {
            agg[`zone_${i}`] = 0;
            agg[`zone_${i}_ace`] = 0;
            agg[`zone_${i}_in`] = 0;
        }

        stats.forEach(s => {
            Object.keys(agg).forEach(k => {
                agg[k] += s[k] || 0;
            });
        });

        return agg;
    };

    const getTeamStatsForSet = (teamId, setId = null) => {
        let stats = [];
        if (setId === 'all' || !setId) {
            match.sets?.forEach(s => {
                s.stats?.forEach(st => {
                    if (st.team_id === teamId) stats.push(st);
                });
            });
        } else {
            const set = match.sets?.find(s => s.id === setId || s.set_number === setId);
            stats = set?.stats?.filter(st => st.team_id === teamId) || [];
        }

        const agg = {
            service_in: 0, service_ace: 0, service_error: 0,
            receive_success: 0, receive_fail: 0,
            feeding_success: 0, feeding_fail: 0,
            strike_success: 0, strike_fail: 0,
            block_success: 0, block_fail: 0,
        };

        for (let i = 1; i <= 10; i++) {
            agg[`zone_${i}`] = 0;
            agg[`zone_${i}_ace`] = 0;
            agg[`zone_${i}_in`] = 0;
        }

        stats.forEach(s => {
            Object.keys(agg).forEach(k => {
                agg[k] += s[k] || 0;
            });
        });

        return agg;
    };

    // --- PAGE 1: HEADER & TEAM PERFORMANCE RECAP ---
    const primaryColor = [16, 185, 129]; // Emerald primary
    const darkBg = [24, 24, 27];

    // Header Background
    doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.rect(0, 0, 210, 38, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('LAPORAN HASIL PERTANDINGAN SEPAK TAKRAW', 105, 14, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(209, 213, 219);
    const tournamentName = match.tournament?.name || 'Turnamen Sepak Takraw';
    const matchMeta = `${tournamentName}  |  Stage: ${(match.stage || 'Group').toUpperCase()}  |  Lap: ${match.court_number || 1}  |  Wasit: ${match.referee?.name || '-'}`;
    doc.text(matchMeta, 105, 22, { align: 'center' });

    // Matchup Banner Box
    doc.setFillColor(244, 244, 245);
    doc.roundedRect(14, 42, 182, 28, 3, 3, 'F');
    doc.setDrawColor(228, 228, 231);
    doc.roundedRect(14, 42, 182, 28, 3, 3, 'S');

    // Home Team Name & Score
    doc.setTextColor(16, 185, 129);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(homeName, 60, 52, { align: 'center' });

    doc.setFontSize(18);
    doc.text(String(setsWonHome), 60, 63, { align: 'center' });

    // VS
    doc.setTextColor(156, 163, 175);
    doc.setFontSize(12);
    doc.text('VS', 105, 57, { align: 'center' });

    // Away Team Name & Score
    doc.setTextColor(245, 158, 11);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(awayName, 150, 52, { align: 'center' });

    doc.setFontSize(18);
    doc.text(String(setsWonAway), 150, 63, { align: 'center' });

    // Set Scores summary
    let setScoreText = match.sets?.map(s => `Set ${s.set_number}: ${s.home_score}-${s.away_score}`).join('   |   ') || '';
    if (setScoreText) {
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128);
        doc.text(setScoreText, 105, 68, { align: 'center' });
    }

    // Section 1: Team Performance Table
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    doc.text('1. REKAPITULASI STATISTIK PERFORMA TIM', 14, 78);

    const homeTeamId = match.home_team_id || match.home_super_team_id;
    const awayTeamId = match.away_team_id || match.away_super_team_id;

    const homeAll = getTeamStatsForSet(homeTeamId, 'all');
    const awayAll = getTeamStatsForSet(awayTeamId, 'all');

    const metrics = [
        { label: 'Servis Masuk (In)', hk: 'service_in', ak: 'service_in' },
        { label: 'Servis Ace', hk: 'service_ace', ak: 'service_ace' },
        { label: 'Servis Error', hk: 'service_error', ak: 'service_error' },
        { label: 'Receive Sukses (✓)', hk: 'receive_success', ak: 'receive_success' },
        { label: 'Receive Gagal (✗)', hk: 'receive_fail', ak: 'receive_fail' },
        { label: 'Feeding Sukses (✓)', hk: 'feeding_success', ak: 'feeding_success' },
        { label: 'Feeding Gagal (✗)', hk: 'feeding_fail', ak: 'feeding_fail' },
        { label: 'Strike / Smash Sukses (✓)', hk: 'strike_success', ak: 'strike_success' },
        { label: 'Strike / Smash Gagal (✗)', hk: 'strike_fail', ak: 'strike_fail' },
        { label: 'Block Sukses (✓)', hk: 'block_success', ak: 'block_success' },
        { label: 'Block Gagal (✗)', hk: 'block_fail', ak: 'block_fail' },
    ];

    const teamTableRows = metrics.map(m => {
        const hVal = homeAll[m.hk] || 0;
        const aVal = awayAll[m.ak] || 0;
        return [hVal, m.label, aVal];
    });

    autoTable(doc, {
        startY: 82,
        head: [[homeName, 'PARAMETER STATISTIK', awayName]],
        body: teamTableRows,
        theme: 'striped',
        headStyles: {
            fillColor: [31, 41, 55],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 8.5,
        },
        columnStyles: {
            0: { halign: 'center', fontStyle: 'bold', textColor: [16, 185, 129], width: 45 },
            1: { halign: 'center', fontStyle: 'bold', width: 92 },
            2: { halign: 'center', fontStyle: 'bold', textColor: [245, 158, 11], width: 45 },
        },
        styles: { fontSize: 8, cellPadding: 2 },
        margin: { left: 14, right: 14 },
    });

    // Section 2: Individual Athletes Table
    const athleteY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    doc.text('2. STATISTIK INDIVIDUAL PEMAIN', 14, athleteY);

    const athleteRows = [];

    const addAthletesToTable = (athletes, teamLabel, teamColor) => {
        athletes.forEach(a => {
            const st = getAthleteStatsForSet(a.id, 'all');
            const totalServ = st.service_in + st.service_ace + st.service_error;
            const servText = totalServ > 0 ? `${st.service_in}/${st.service_ace}/${st.service_error}` : '-';
            const strikeText = (st.strike_success + st.strike_fail) > 0 ? `${st.strike_success}/${st.strike_fail}` : '-';
            const recText = (st.receive_success + st.receive_fail) > 0 ? `${st.receive_success}/${st.receive_fail}` : '-';
            const feedText = (st.feeding_success + st.feeding_fail) > 0 ? `${st.feeding_success}/${st.feeding_fail}` : '-';
            const blockText = (st.block_success + st.block_fail) > 0 ? `${st.block_success}/${st.block_fail}` : '-';

            athleteRows.push([
                `#${a.jersey_number || '-'}`,
                a.name,
                teamLabel,
                a.position || 'Pemain',
                servText,
                strikeText,
                recText,
                feedText,
                blockText,
            ]);
        });
    };

    addAthletesToTable(match.home_team?.athletes || match.home_super_team?.members?.flatMap(m => m.athletes || []) || [], homeName, 'home');
    addAthletesToTable(match.away_team?.athletes || match.away_super_team?.members?.flatMap(m => m.athletes || []) || [], awayName, 'away');

    autoTable(doc, {
        startY: athleteY + 3,
        head: [['No', 'Nama Pemain', 'Tim', 'Posisi', 'Serv (In/Ace/Err)', 'Smash (✓/✗)', 'Rec (✓/✗)', 'Feed (✓/✗)', 'Block (✓/✗)']],
        body: athleteRows,
        theme: 'grid',
        headStyles: {
            fillColor: [16, 185, 129],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 7.5,
        },
        styles: { fontSize: 7, halign: 'center', cellPadding: 1.8 },
        columnStyles: {
            0: { width: 10 },
            1: { halign: 'left', fontStyle: 'bold', width: 38 },
            2: { halign: 'left', width: 28 },
            3: { width: 18 },
            4: { width: 25 },
            5: { width: 18 },
            6: { width: 15 },
            7: { width: 15 },
            8: { width: 15 },
        },
        margin: { left: 14, right: 14 },
    });

    // --- PAGE 2: TEAM BALL POSITION (10 ZONES GRID) ---
    doc.addPage();

    // Page 2 Header
    doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.rect(0, 0, 210, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('DISTRIBUSI ZONA JATUH BOLA SERVIS (10 ZONA)', 105, 12, { align: 'center' });
    doc.setFontSize(8);
    doc.setTextColor(209, 213, 219);
    doc.text('Format Tampilan: Persentase %  |  (ACE / IN)', 105, 18, { align: 'center' });

    // Helper: Draw 10-zone Court Grid Box
    const drawCourtZoneTable = (startX, startY, width, title, zoneData) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(31, 41, 55);
        doc.text(title, startX, startY);

        const totalHits = Object.keys(zoneData).reduce((acc, k) => {
            const z = zoneData[k];
            return acc + (z.ace + z.in);
        }, 0);

        const getZoneText = (zoneNum) => {
            const zd = zoneData[`zone_${zoneNum}`] || { ace: 0, in: 0 };
            const hits = zd.ace + zd.in;
            const pct = totalHits > 0 ? ((hits / totalHits) * 100).toFixed(1) + '%' : '0.0%';
            return `${pct}\n(${zd.ace}/${zd.in})`;
        };

        // Table with 10 zones formatted cleanly
        const rows = [
            ['Z1 (Sudut Atas)', getZoneText(1), 'Z8 (Bawah Tengah)', getZoneText(8)],
            ['Z2 (0 - 1.22m)', getZoneText(2), 'Z9 (Tengah)', getZoneText(9)],
            ['Z3 (1.22 - 2.44m)', getZoneText(3), 'Z10 (Atas Tengah)', getZoneText(10)],
            ['Z4 (2.44 - 3.66m)', getZoneText(4), 'Z5 (3.66 - 4.88m)', getZoneText(5)],
            ['Z6 (4.88 - 6.10m)', getZoneText(6), 'Z7 (Sudut Bawah)', getZoneText(7)],
        ];

        autoTable(doc, {
            startY: startY + 2,
            margin: { left: startX },
            tableWidth: width,
            head: [['Zona', '% (Ace/In)', 'Zona', '% (Ace/In)']],
            body: rows,
            theme: 'grid',
            headStyles: {
                fillColor: [31, 41, 55],
                textColor: [255, 255, 255],
                fontSize: 7,
                halign: 'center',
            },
            styles: {
                fontSize: 6.5,
                halign: 'center',
                valign: 'middle',
                cellPadding: 1.2,
            },
            columnStyles: {
                0: { halign: 'left', fontStyle: 'bold', width: width * 0.32 },
                1: { fontStyle: 'bold', textColor: [16, 185, 129], width: width * 0.18 },
                2: { halign: 'left', fontStyle: 'bold', width: width * 0.32 },
                3: { fontStyle: 'bold', textColor: [16, 185, 129], width: width * 0.18 },
            },
        });

        return doc.lastAutoTable.finalY;
    };

    // Calculate zone data for team
    const buildTeamZoneData = (teamId, setNum = null) => {
        const stats = getTeamStatsForSet(teamId, setNum);
        const zd = {};
        for (let i = 1; i <= 10; i++) {
            zd[`zone_${i}`] = {
                ace: stats[`zone_${i}_ace`] || 0,
                in: stats[`zone_${i}_in`] || (stats[`zone_${i}_ace`] === 0 ? stats[`zone_${i}`] || 0 : 0),
            };
        }
        return zd;
    };

    // Home Team: ALL SETS, SET 1, SET 2
    let yOffset = 30;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(`🟢 DISTRIBUSI SERVIS TIM: ${homeName}`, 14, yOffset);
    yOffset += 4;

    const homeAllZone = buildTeamZoneData(homeTeamId, 'all');
    const homeSet1Zone = buildTeamZoneData(homeTeamId, 1);
    const homeSet2Zone = buildTeamZoneData(homeTeamId, 2);

    const colWidth = 88;
    const y1 = drawCourtZoneTable(14, yOffset, colWidth, 'SERVE - ALL SETS', homeAllZone);
    const y2 = drawCourtZoneTable(108, yOffset, colWidth, 'SERVE - SET 1', homeSet1Zone);

    yOffset = Math.max(y1, y2) + 6;

    const y3 = drawCourtZoneTable(14, yOffset, colWidth, 'SERVE - SET 2', homeSet2Zone);
    const homeSet3Zone = buildTeamZoneData(homeTeamId, 3);
    const y4 = drawCourtZoneTable(108, yOffset, colWidth, 'SERVE - SET 3 (Jika Ada)', homeSet3Zone);

    yOffset = Math.max(y3, y4) + 10;

    // Away Team: ALL SETS, SET 1, SET 2
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(245, 158, 11);
    doc.text(`🟡 DISTRIBUSI SERVIS TIM: ${awayName}`, 14, yOffset);
    yOffset += 4;

    const awayAllZone = buildTeamZoneData(awayTeamId, 'all');
    const awaySet1Zone = buildTeamZoneData(awayTeamId, 1);
    const awaySet2Zone = buildTeamZoneData(awayTeamId, 2);

    const y5 = drawCourtZoneTable(14, yOffset, colWidth, 'SERVE - ALL SETS', awayAllZone);
    const y6 = drawCourtZoneTable(108, yOffset, colWidth, 'SERVE - SET 1', awaySet1Zone);

    yOffset = Math.max(y5, y6) + 6;

    const y7 = drawCourtZoneTable(14, yOffset, colWidth, 'SERVE - SET 2', awaySet2Zone);
    const awaySet3Zone = buildTeamZoneData(awayTeamId, 3);
    drawCourtZoneTable(108, yOffset, colWidth, 'SERVE - SET 3 (Jika Ada)', awaySet3Zone);

    // Save/Download PDF
    const filename = `${homeName.replace(/\s+/g, '_')}_vs_${awayName.replace(/\s+/g, '_')}_Match_Report.pdf`;
    doc.save(filename);
}
