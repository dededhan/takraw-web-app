import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generate and download an official Takraw match report PDF per team or combined.
 * Supports 10-zone ball position grids and complete team/athlete performance & serve zone scoring statistics.
 *
 * @param {Object} match
 * @param {'home' | 'away' | 'all'} targetTeam - Specify whether to export for Home team, Away team, or full match
 */
export function exportMatchReportPdf(match, targetTeam = 'all') {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    const homeName = match.home_display_name || match.home_team?.name || match.home_super_team?.name || 'Tim Tuan Rumah';
    const awayName = match.away_display_name || match.away_team?.name || match.away_super_team?.name || 'Tim Tamu';

    const finishedSets = match.sets?.filter(s => s.status === 'finished') || [];
    const setsWonHome = finishedSets.filter(s => s.winner_team_id === match.home_team_id || s.winner_team_id === match.home_super_team_id).length;
    const setsWonAway = finishedSets.filter(s => s.winner_team_id === match.away_team_id || s.winner_team_id === match.away_super_team_id).length;

    const homeTeamId = match.home_team_id || match.home_super_team_id;
    const awayTeamId = match.away_team_id || match.away_super_team_id;

    const isSingleTeam = targetTeam === 'home' || targetTeam === 'away';
    const focusedTeamId = targetTeam === 'away' ? awayTeamId : homeTeamId;
    const focusedTeamName = targetTeam === 'away' ? awayName : homeName;
    const opponentTeamName = targetTeam === 'away' ? homeName : awayName;

    const isTeamMode = match.match_mode === 'team_regu' || match.match_mode === 'team_double';

    const homeAthletes = match.home_team?.athletes || match.home_super_team?.members?.flatMap(mem => mem.athletes || []) || [];
    const awayAthletes = match.away_team?.athletes || match.away_super_team?.members?.flatMap(mem => mem.athletes || []) || [];

    const homeTeamIds = isTeamMode
        ? [match.home_super_team_id, ...(match.home_super_team?.members?.map(mem => mem.id) || [])].filter(Boolean)
        : [match.home_team_id].filter(Boolean);

    const awayTeamIds = isTeamMode
        ? [match.away_super_team_id, ...(match.away_super_team?.members?.map(mem => mem.id) || [])].filter(Boolean)
        : [match.away_team_id].filter(Boolean);

    const homeAthleteIds = homeAthletes.map(a => a.id);
    const awayAthleteIds = awayAthletes.map(a => a.id);

    // Helper: calculate athlete stats
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
            strike_in: 0, strike_ace: 0, strike_error: 0,
            freeball_in: 0, freeball_ace: 0, freeball_error: 0,
            firstball_in: 0, firstball_ace: 0, firstball_error: 0,
            feeding_in: 0, feeding_ace: 0, feeding_error: 0,
            blocking_in: 0, blocking_ace: 0, blocking_error: 0,
            opponent_mistake: 0,
            // Backwards compatibility mappings:
            strike_success: 0, strike_fail: 0,
            receive_success: 0, receive_fail: 0,
            feeding_success: 0, feeding_fail: 0,
            block_success: 0, block_fail: 0,
        };

        for (let i = 1; i <= 10; i++) {
            agg[`zone_${i}`] = 0;
            agg[`zone_${i}_ace`] = 0;
            agg[`zone_${i}_in`] = 0;
        }

        stats.forEach(s => {
            Object.keys(agg).forEach(k => {
                agg[k] += Number(s[k]) || 0;
            });
        });

        return agg;
    };

    // Helper: calculate team stats
    const getTeamStatsForSet = (teamId, setId = null) => {
        let stats = [];
        const isTargetTeam = (st) => {
            if (st.team_id === teamId) return true;
            if (homeTeamIds.includes(teamId)) {
                return (st.team_id && homeTeamIds.includes(st.team_id)) || (st.athlete_id && homeAthleteIds.includes(st.athlete_id));
            }
            if (awayTeamIds.includes(teamId)) {
                return (st.team_id && awayTeamIds.includes(st.team_id)) || (st.athlete_id && awayAthleteIds.includes(st.athlete_id));
            }
            return false;
        };

        if (setId === 'all' || !setId) {
            match.sets?.forEach(s => {
                s.stats?.forEach(st => {
                    if (isTargetTeam(st)) stats.push(st);
                });
            });
        } else {
            const set = match.sets?.find(s => s.id === setId || s.set_number === setId);
            stats = set?.stats?.filter(st => isTargetTeam(st)) || [];
        }

        const agg = {
            service_in: 0, service_ace: 0, service_error: 0,
            strike_in: 0, strike_ace: 0, strike_error: 0,
            freeball_in: 0, freeball_ace: 0, freeball_error: 0,
            firstball_in: 0, firstball_ace: 0, firstball_error: 0,
            feeding_in: 0, feeding_ace: 0, feeding_error: 0,
            blocking_in: 0, blocking_ace: 0, blocking_error: 0,
            opponent_mistake: 0,
            // Backwards compatibility mappings:
            strike_success: 0, strike_fail: 0,
            receive_success: 0, receive_fail: 0,
            feeding_success: 0, feeding_fail: 0,
            block_success: 0, block_fail: 0,
        };

        for (let i = 1; i <= 10; i++) {
            agg[`zone_${i}`] = 0;
            agg[`zone_${i}_ace`] = 0;
            agg[`zone_${i}_in`] = 0;
        }

        stats.forEach(s => {
            Object.keys(agg).forEach(k => {
                agg[k] += Number(s[k]) || 0;
            });
        });

        return agg;
    };

    // Helper: Draw 10-zone Court Grid Box
    const drawCourtZoneTable = (startX, startY, width, title, zoneData) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
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

        const rows = [
            ['Z1 (Sudut Atas)', getZoneText(1), 'Z8 (Bawah Tengah)', getZoneText(8)],
            ['Z2 (0 - 1.22m)', getZoneText(2), 'Z9 (Tengah Lap.)', getZoneText(9)],
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
                fontSize: 6.5,
                halign: 'center',
                fontStyle: 'bold',
            },
            styles: {
                fontSize: 6,
                halign: 'center',
                valign: 'middle',
                cellPadding: 1,
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

    // ==========================================
    // PAGE 1: HEADER & STATISTIK TIM
    // ==========================================
    const darkBg = [24, 24, 27];

    // Header Background
    doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.rect(0, 0, 210, 36, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    const mainTitle = isSingleTeam 
        ? `LAPORAN PERFORMA & DISTRIBUSI SERVIS: ${focusedTeamName.toUpperCase()}`
        : 'LAPORAN HASIL PERTANDINGAN SEPAK TAKRAW';
    doc.text(mainTitle, 105, 13, { align: 'center' });

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(209, 213, 219);
    const tournamentName = match.tournament?.name || 'Turnamen Sepak Takraw';
    const matchMeta = `${tournamentName}  |  Stage: ${(match.stage || 'Group').toUpperCase()}  |  Lap: ${match.court_number || 1}  |  Wasit: ${match.referee?.name || '-'}`;
    doc.text(matchMeta, 105, 21, { align: 'center' });

    // Matchup Banner Box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 40, 182, 24, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 40, 182, 24, 3, 3, 'S');

    // Home Team Name & Score
    doc.setTextColor(16, 185, 129);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(homeName, 55, 48, { align: 'center' });
    doc.setFontSize(16);
    doc.text(String(setsWonHome), 55, 58, { align: 'center' });

    // VS
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(11);
    doc.text('VS', 105, 53, { align: 'center' });

    // Away Team Name & Score
    doc.setTextColor(245, 158, 11);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(awayName, 155, 48, { align: 'center' });
    doc.setFontSize(16);
    doc.text(String(setsWonAway), 155, 58, { align: 'center' });

    // Set Scores summary
    const setScoreText = match.sets?.map(s => `Set ${s.set_number}: ${s.home_score}-${s.away_score}`).join('   |   ') || '';
    if (setScoreText) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(setScoreText, 105, 62, { align: 'center' });
    }

    if (isSingleTeam) {
        // ==========================================
        // DEDICATED SINGLE TEAM REPORT
        // ==========================================
        
        // 1. Rekapitulasi Tim per Set (Compact Table)
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(31, 41, 55);
        doc.text(`1. REKAPITULASI STATISTIK PER SET (${focusedTeamName})`, 14, 70);

        const tAll = getTeamStatsForSet(focusedTeamId, 'all');
        const tSet1 = getTeamStatsForSet(focusedTeamId, 1);
        const tSet2 = getTeamStatsForSet(focusedTeamId, 2);
        const tSet3 = getTeamStatsForSet(focusedTeamId, 3);

        const metricsSingle = [
            { label: 'Servis (In / Ace / Err)', fn: (t) => `${t.service_in} / ${t.service_ace} / ${t.service_error}` },
            { label: 'Strike (In / Ace / Err)', fn: (t) => `${t.strike_in || t.strike_success} / ${t.strike_ace} / ${t.strike_error || t.strike_fail}` },
            { label: 'Freeball (In / Ace / Err)', fn: (t) => `${t.freeball_in} / ${t.freeball_ace} / ${t.freeball_error}` },
            { label: 'Firstball (In / Ace / Err)', fn: (t) => `${t.firstball_in || t.receive_success} / ${t.firstball_ace} / ${t.firstball_error || t.receive_fail}` },
            { label: 'Feeding (In / Ace / Err)', fn: (t) => `${t.feeding_in || t.feeding_success} / ${t.feeding_ace} / ${t.feeding_error || t.feeding_fail}` },
            { label: 'Blocking (In / Ace / Err)', fn: (t) => `${t.blocking_in || t.block_success} / ${t.blocking_ace} / ${t.blocking_error || t.block_fail}` },
            { label: 'Kesalahan Lawan (Poin Hadiah)', fn: (t) => `+${t.opponent_mistake || 0}` },
        ];

        const singleTeamRows = metricsSingle.map(m => [
            m.label,
            m.fn(tAll),
            m.fn(tSet1),
            m.fn(tSet2),
            m.fn(tSet3),
        ]);

        autoTable(doc, {
            startY: 73,
            head: [['Parameter Statistik (Format: In / Ace / Err)', 'All Sets', 'Set 1', 'Set 2', 'Set 3']],
            body: singleTeamRows,
            theme: 'striped',
            headStyles: {
                fillColor: [31, 41, 55],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center',
                fontSize: 7.5,
            },
            columnStyles: {
                0: { halign: 'left', fontStyle: 'bold', width: 70 },
                1: { halign: 'center', fontStyle: 'bold', textColor: [16, 185, 129], width: 28 },
                2: { halign: 'center', width: 28 },
                3: { halign: 'center', width: 28 },
                4: { halign: 'center', width: 28 },
            },
            styles: { fontSize: 7, cellPadding: 1.2 },
            margin: { left: 14, right: 14 },
        });

        // 2. Individual Athletes Table for focused team (Ringkasan Aksi)
        const athleteY = doc.lastAutoTable.finalY + 5;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(31, 41, 55);
        doc.text(`2. REKAPITULASI AKSI INDIVIDUAL PEMAIN (${focusedTeamName})`, 14, athleteY);

        const athletes = (targetTeam === 'away'
            ? (match.away_team?.athletes || match.away_super_team?.members?.flatMap(m => m.athletes || []) || [])
            : (match.home_team?.athletes || match.home_super_team?.members?.flatMap(m => m.athletes || []) || []));

        const athleteRows = athletes.map(a => {
            const st = getAthleteStatsForSet(a.id, 'all');
            const servText = `${st.service_in}/${st.service_ace}/${st.service_error}`;
            const strikeText = `${st.strike_in || st.strike_success}/${st.strike_ace}/${st.strike_error || st.strike_fail}`;
            const freeText = `${st.freeball_in}/${st.freeball_ace}/${st.freeball_error}`;
            const firstText = `${st.firstball_in || st.receive_success}/${st.firstball_ace}/${st.firstball_error || st.receive_fail}`;
            const feedText = `${st.feeding_in || st.feeding_success}/${st.feeding_ace}/${st.feeding_error || st.feeding_fail}`;
            const blockText = `${st.blocking_in || st.block_success}/${st.blocking_ace}/${st.blocking_error || st.block_fail}`;

            return [
                `#${a.jersey_number || '-'}`,
                a.name,
                a.position || 'Pemain',
                servText,
                strikeText,
                freeText,
                firstText,
                feedText,
                blockText,
            ];
        });

        autoTable(doc, {
            startY: athleteY + 2,
            head: [['No', 'Nama Pemain', 'Posisi', 'Servis', 'Strike', 'Freeball', 'Firstball', 'Feeding', 'Block']],
            body: athleteRows,
            theme: 'grid',
            headStyles: {
                fillColor: targetTeam === 'away' ? [217, 119, 6] : [16, 185, 129],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center',
                fontSize: 7,
            },
            styles: { fontSize: 6, halign: 'center', cellPadding: 1 },
            columnStyles: {
                0: { width: 10 },
                1: { halign: 'left', fontStyle: 'bold', width: 38 },
                2: { width: 18 },
                3: { width: 20 },
                4: { width: 20 },
                5: { width: 20 },
                6: { width: 20 },
                7: { width: 20 },
                8: { width: 16 },
            },
            margin: { left: 14, right: 14 },
        });

        // 3. TABEL RINCIAN SKOR SERVIS PER ZONA (Z1 - Z10) INDIVIDU PEMAIN
        const zoneTableY = doc.lastAutoTable.finalY + 5;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(31, 41, 55);
        doc.text(`3. RINCIAN SKOR SERVIS PER ZONA (Z1 - Z10) PEMAIN — Format: (ACE / IN)`, 14, zoneTableY);

        const playerZoneRows = athletes.map(a => {
            const st = getAthleteStatsForSet(a.id, 'all');
            const totalIn = st.service_in;
            const totalAce = st.service_ace;

            const formatCell = (zNum) => {
                const ace = st[`zone_${zNum}_ace`] || 0;
                const inC = st[`zone_${zNum}_in`] || 0;
                if (ace === 0 && inC === 0) return '-';
                return `${ace}/${inC}`;
            };

            return [
                `#${a.jersey_number || '-'}`,
                a.name,
                a.position || 'Pemain',
                formatCell(1),
                formatCell(2),
                formatCell(3),
                formatCell(4),
                formatCell(5),
                formatCell(6),
                formatCell(7),
                formatCell(8),
                formatCell(9),
                formatCell(10),
                `${totalAce} Ace`,
                `${totalIn} In`,
            ];
        });

        autoTable(doc, {
            startY: zoneTableY + 2,
            head: [['No', 'Nama Pemain', 'Posisi', 'Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6', 'Z7', 'Z8', 'Z9', 'Z10', 'Ace', 'In']],
            body: playerZoneRows,
            theme: 'grid',
            headStyles: {
                fillColor: [31, 41, 55],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center',
                fontSize: 6.5,
            },
            styles: { fontSize: 6, halign: 'center', cellPadding: 1 },
            columnStyles: {
                0: { width: 8 },
                1: { halign: 'left', fontStyle: 'bold', width: 34 },
                2: { width: 16 },
                3: { width: 10 },
                4: { width: 10 },
                5: { width: 10 },
                6: { width: 10 },
                7: { width: 10 },
                8: { width: 10 },
                9: { width: 10 },
                10: { width: 10 },
                11: { width: 10 },
                12: { width: 10 },
                13: { fontStyle: 'bold', textColor: [217, 119, 6], width: 12 },
                14: { fontStyle: 'bold', textColor: [16, 185, 129], width: 12 },
            },
            margin: { left: 14, right: 14 },
        });

        // 4. 10 Zones Ball Distribution Visual Grids (Page 2)
        doc.addPage();
        doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
        doc.rect(0, 0, 210, 24, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text(`DISTRIBUSI ZONA JATUH SERVIS (10 ZONA) — ${focusedTeamName.toUpperCase()}`, 105, 12, { align: 'center' });
        doc.setFontSize(7.5);
        doc.setTextColor(209, 213, 219);
        doc.text('Format: Persentase %  |  (ACE / IN)', 105, 18, { align: 'center' });

        const colWidth = 88;
        let yOffset = 32;

        const allZone = buildTeamZoneData(focusedTeamId, 'all');
        const set1Zone = buildTeamZoneData(focusedTeamId, 1);
        const set2Zone = buildTeamZoneData(focusedTeamId, 2);
        const set3Zone = buildTeamZoneData(focusedTeamId, 3);

        const y1 = drawCourtZoneTable(14, yOffset, colWidth, 'SERVE - ALL SETS', allZone);
        const y2 = drawCourtZoneTable(108, yOffset, colWidth, 'SERVE - SET 1', set1Zone);

        const nextY = Math.max(y1, y2) + 6;
        drawCourtZoneTable(14, nextY, colWidth, 'SERVE - SET 2', set2Zone);
        drawCourtZoneTable(108, nextY, colWidth, 'SERVE - SET 3', set3Zone);

        const filename = `Laporan_${focusedTeamName.replace(/\s+/g, '_')}_vs_${opponentTeamName.replace(/\s+/g, '_')}.pdf`;
        doc.save(filename);
        return;
    }

    // ==========================================
    // COMBINED (ALL TEAMS) REPORT
    // ==========================================
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    doc.text('1. REKAPITULASI STATISTIK PERFORMA TIM (In / Ace / Err)', 14, 72);

    const homeAll = getTeamStatsForSet(homeTeamId, 'all');
    const awayAll = getTeamStatsForSet(awayTeamId, 'all');

    const metricsCombined = [
        { label: 'Servis', hFn: (t) => `${t.service_in}/${t.service_ace}/${t.service_error}`, aFn: (t) => `${t.service_in}/${t.service_ace}/${t.service_error}` },
        { label: 'Strike / Smash', hFn: (t) => `${t.strike_in || t.strike_success}/${t.strike_ace}/${t.strike_error || t.strike_fail}`, aFn: (t) => `${t.strike_in || t.strike_success}/${t.strike_ace}/${t.strike_error || t.strike_fail}` },
        { label: 'Freeball', hFn: (t) => `${t.freeball_in}/${t.freeball_ace}/${t.freeball_error}`, aFn: (t) => `${t.freeball_in}/${t.freeball_ace}/${t.freeball_error}` },
        { label: 'Firstball', hFn: (t) => `${t.firstball_in || t.receive_success}/${t.firstball_ace}/${t.firstball_error || t.receive_fail}`, aFn: (t) => `${t.firstball_in || t.receive_success}/${t.firstball_ace}/${t.firstball_error || t.receive_fail}` },
        { label: 'Feeding', hFn: (t) => `${t.feeding_in || t.feeding_success}/${t.feeding_ace}/${t.feeding_error || t.feeding_fail}`, aFn: (t) => `${t.feeding_in || t.feeding_success}/${t.feeding_ace}/${t.feeding_error || t.feeding_fail}` },
        { label: 'Blocking', hFn: (t) => `${t.blocking_in || t.block_success}/${t.blocking_ace}/${t.blocking_error || t.block_fail}`, aFn: (t) => `${t.blocking_in || t.block_success}/${t.blocking_ace}/${t.blocking_error || t.block_fail}` },
        { label: 'Kesalahan Lawan (+Poin)', hFn: (t) => `+${t.opponent_mistake || 0}`, aFn: (t) => `+${t.opponent_mistake || 0}` },
    ];

    const teamTableRows = metricsCombined.map(m => [
        m.hFn(homeAll),
        m.label,
        m.aFn(awayAll),
    ]);

    autoTable(doc, {
        startY: 75,
        head: [[homeName, 'PARAMETER STATISTIK', awayName]],
        body: teamTableRows,
        theme: 'striped',
        headStyles: {
            fillColor: [31, 41, 55],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 7.5,
        },
        columnStyles: {
            0: { halign: 'center', fontStyle: 'bold', textColor: [16, 185, 129], width: 45 },
            1: { halign: 'center', fontStyle: 'bold', width: 92 },
            2: { halign: 'center', fontStyle: 'bold', textColor: [245, 158, 11], width: 45 },
        },
        styles: { fontSize: 7, cellPadding: 1.2 },
        margin: { left: 14, right: 14 },
    });

    const athleteY = doc.lastAutoTable.finalY + 5;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    doc.text('2. STATISTIK RINCIAN ZONA SERVIS (Z1 - Z10) SELURUH PEMAIN', 14, athleteY);

    const allCombinedAthletes = [
        ...(match.home_team?.athletes || match.home_super_team?.members?.flatMap(m => m.athletes || []) || []),
        ...(match.away_team?.athletes || match.away_super_team?.members?.flatMap(m => m.athletes || []) || []),
    ];

    const combinedZoneRows = allCombinedAthletes.map(a => {
        const st = getAthleteStatsForSet(a.id, 'all');
        const isHome = match.home_team?.athletes?.some(ha => ha.id === a.id) || false;
        const totalIn = st.service_in;
        const totalAce = st.service_ace;

        const formatCell = (zNum) => {
            const ace = st[`zone_${zNum}_ace`] || 0;
            const inC = st[`zone_${zNum}_in`] || 0;
            if (ace === 0 && inC === 0) return '-';
            return `${ace}/${inC}`;
        };

        return [
            `#${a.jersey_number || '-'}`,
            a.name,
            isHome ? homeName : awayName,
            a.position || 'Pemain',
            formatCell(1),
            formatCell(2),
            formatCell(3),
            formatCell(4),
            formatCell(5),
            formatCell(6),
            formatCell(7),
            formatCell(8),
            formatCell(9),
            formatCell(10),
            `${totalAce} / ${totalIn}`,
        ];
    });

    autoTable(doc, {
        startY: athleteY + 2,
        head: [['No', 'Nama Pemain', 'Tim', 'Posisi', 'Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6', 'Z7', 'Z8', 'Z9', 'Z10', 'Ace/In']],
        body: combinedZoneRows,
        theme: 'grid',
        headStyles: {
            fillColor: [16, 185, 129],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 6.5,
        },
        styles: { fontSize: 6, halign: 'center', cellPadding: 1 },
        columnStyles: {
            0: { width: 8 },
            1: { halign: 'left', fontStyle: 'bold', width: 30 },
            2: { halign: 'left', width: 22 },
            3: { width: 14 },
            4: { width: 9 },
            5: { width: 9 },
            6: { width: 9 },
            7: { width: 9 },
            8: { width: 9 },
            9: { width: 9 },
            10: { width: 9 },
            11: { width: 9 },
            12: { width: 9 },
            13: { width: 9 },
            14: { fontStyle: 'bold', width: 16 },
        },
        margin: { left: 14, right: 14 },
    });

    // Page 2: Zone distributions for both teams
    doc.addPage();
    doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.rect(0, 0, 210, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('DISTRIBUSI ZONA JATUH BOLA SERVIS (10 ZONA)', 105, 12, { align: 'center' });
    doc.setFontSize(7.5);
    doc.setTextColor(209, 213, 219);
    doc.text('Format Tampilan: Persentase %  |  (ACE / IN)', 105, 18, { align: 'center' });

    let yOffset = 30;
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(`🟢 DISTRIBUSI SERVIS TIM: ${homeName}`, 14, yOffset);
    yOffset += 4;

    const colWidth = 88;
    const homeAllZone = buildTeamZoneData(homeTeamId, 'all');
    const homeSet1Zone = buildTeamZoneData(homeTeamId, 1);
    const homeSet2Zone = buildTeamZoneData(homeTeamId, 2);
    const homeSet3Zone = buildTeamZoneData(homeTeamId, 3);

    const y1 = drawCourtZoneTable(14, yOffset, colWidth, 'SERVE - ALL SETS', homeAllZone);
    const y2 = drawCourtZoneTable(108, yOffset, colWidth, 'SERVE - SET 1', homeSet1Zone);

    yOffset = Math.max(y1, y2) + 6;

    const y3 = drawCourtZoneTable(14, yOffset, colWidth, 'SERVE - SET 2', homeSet2Zone);
    drawCourtZoneTable(108, yOffset, colWidth, 'SERVE - SET 3 (Jika Ada)', homeSet3Zone);

    yOffset = Math.max(y3, yOffset) + 8;

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(245, 158, 11);
    doc.text(`🟡 DISTRIBUSI SERVIS TIM: ${awayName}`, 14, yOffset);
    yOffset += 4;

    const awayAllZone = buildTeamZoneData(awayTeamId, 'all');
    const awaySet1Zone = buildTeamZoneData(awayTeamId, 1);
    const awaySet2Zone = buildTeamZoneData(awayTeamId, 2);
    const awaySet3Zone = buildTeamZoneData(awayTeamId, 3);

    const y5 = drawCourtZoneTable(14, yOffset, colWidth, 'SERVE - ALL SETS', awayAllZone);
    const y6 = drawCourtZoneTable(108, yOffset, colWidth, 'SERVE - SET 1', awaySet1Zone);

    yOffset = Math.max(y5, y6) + 6;

    const y7 = drawCourtZoneTable(14, yOffset, colWidth, 'SERVE - SET 2', awaySet2Zone);
    drawCourtZoneTable(108, yOffset, colWidth, 'SERVE - SET 3 (Jika Ada)', awaySet3Zone);

    const filename = `${homeName.replace(/\s+/g, '_')}_vs_${awayName.replace(/\s+/g, '_')}_Match_Report.pdf`;
    doc.save(filename);
}
