import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generate and download an official Takraw match report PDF per team.
 * Uses clean standard ASCII fonts to prevent any unicode/emoji encoding artifacts.
 *
 * Supports:
 * - Final match score & winner status (e.g. "MENANG 2-1 Regu" / "MENANG 2-0 Set")
 * - Per-Grub / Regu breakdown (Grub A, Grub B, Grub C) with All-Sets + per-set statistics
 * - Detailed Action Performance (In/Ace/Err -> Success/Total & %)
 * - Total Accumulated Performance row (sum of all actions: Total Success/Total Attempts & %)
 * - Per-Player performance tables within each grub with All-Sets + per-set details & Total Performance
 * - 10-zone court distribution tables
 *
 * @param {Object} match
 * @param {'home' | 'away'} targetTeam - Specify whether to export for Home team or Away team
 */
export function exportMatchReportPdf(match, targetTeam = 'home') {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    const isHome = targetTeam !== 'away';
    const isTeamMode = match.match_mode === 'team_regu' || match.match_mode === 'team_double';

    const homeName = match.home_display_name || match.home_team?.name || match.home_super_team?.name || 'Tim Tuan Rumah';
    const awayName = match.away_display_name || match.away_team?.name || match.away_super_team?.name || 'Tim Tamu';

    const focusedTeamName = isHome ? homeName : awayName;
    const opponentTeamName = isHome ? awayName : homeName;

    const focusedSuperTeam = isHome ? match.home_super_team : match.away_super_team;
    const opponentSuperTeam = isHome ? match.away_super_team : match.home_super_team;

    const homeTeamIds = isTeamMode
        ? [match.home_super_team_id, ...(match.home_super_team?.members?.map(mem => mem.id) || [])].filter(Boolean)
        : [match.home_team_id].filter(Boolean);

    const awayTeamIds = isTeamMode
        ? [match.away_super_team_id, ...(match.away_super_team?.members?.map(mem => mem.id) || [])].filter(Boolean)
        : [match.away_team_id].filter(Boolean);

    const homeAthletes = match.home_team?.athletes || match.home_super_team?.members?.flatMap(mem => mem.athletes || []) || [];
    const awayAthletes = match.away_team?.athletes || match.away_super_team?.members?.flatMap(mem => mem.athletes || []) || [];

    const homeAthleteIds = homeAthletes.map(a => a.id);
    const awayAthleteIds = awayAthletes.map(a => a.id);

    const focusedTeamIds = isHome ? homeTeamIds : awayTeamIds;
    const focusedAthleteIds = isHome ? homeAthleteIds : awayAthleteIds;
    const focusedAthletes = isHome ? homeAthletes : awayAthletes;

    // ─────────────────────────────────────────────────────────────────
    // 1. PERFORMANCE CALCULATION HELPERS
    // ─────────────────────────────────────────────────────────────────
    const formatActionPerformance = (inCount = 0, aceCount = 0, errCount = 0) => {
        const inC = Number(inCount) || 0;
        const aceC = Number(aceCount) || 0;
        const errC = Number(errCount) || 0;
        const success = inC + aceC;
        const total = success + errC;
        if (total === 0) return '0/0/0 (0%)';
        const pct = ((success / total) * 100).toFixed(0);
        return `${inC}/${aceC}/${errC} (${pct}%)`;
    };

    const calculateTotalPerformance = (stats) => {
        const actions = [
            { in: stats.service_in || 0, ace: stats.service_ace || 0, err: stats.service_error || 0 },
            { in: stats.strike_in || stats.strike_success || 0, ace: stats.strike_ace || 0, err: stats.strike_error || stats.strike_fail || 0 },
            { in: stats.freeball_in || 0, ace: stats.freeball_ace || 0, err: stats.freeball_error || 0 },
            { in: stats.firstball_in || stats.receive_success || 0, ace: stats.firstball_ace || 0, err: stats.firstball_error || stats.receive_fail || 0 },
            { in: stats.feeding_in || stats.feeding_success || 0, ace: stats.feeding_ace || 0, err: stats.feeding_error || stats.feeding_fail || 0 },
            { in: stats.blocking_in || stats.block_success || 0, ace: stats.blocking_ace || 0, err: stats.blocking_error || stats.block_fail || 0 },
        ];

        let totalIn = 0;
        let totalAce = 0;
        let totalErr = 0;

        actions.forEach(a => {
            totalIn += Number(a.in) || 0;
            totalAce += Number(a.ace) || 0;
            totalErr += Number(a.err) || 0;
        });

        const totalSuccess = totalIn + totalAce;
        const totalAttempts = totalSuccess + totalErr;
        const pct = totalAttempts > 0 ? ((totalSuccess / totalAttempts) * 100).toFixed(0) : '0';

        return {
            totalIn,
            totalAce,
            totalErr,
            totalSuccess,
            totalAttempts,
            pct,
            shortFormatted: `${totalSuccess}/${totalAttempts} (${pct}%)`,
            fullFormatted: `${totalIn}/${totalAce}/${totalErr} (${pct}%) | ${totalSuccess}/${totalAttempts}`,
        };
    };

    // ─────────────────────────────────────────────────────────────────
    // 2. CALCULATE MATCH & REGU OUTCOMES
    // ─────────────────────────────────────────────────────────────────
    let matchWinnerStatus = '';
    let matchScoreText = '';
    let reguSummaries = [];

    if (isTeamMode) {
        let homeReguWins = 0;
        let awayReguWins = 0;

        reguSummaries = [0, 1, 2].map(rIdx => {
            const setNums = [rIdx * 3 + 1, rIdx * 3 + 2, rIdx * 3 + 3];
            const rSets = match.sets?.filter(s => setNums.includes(s.set_number)) || [];
            const finishedSets = rSets.filter(s => s.status === 'finished');

            const hWon = finishedSets.filter(s => s.home_score > s.away_score).length;
            const aWon = finishedSets.filter(s => s.away_score > s.home_score).length;

            let winner = null;
            if (hWon >= 2 || (finishedSets.length >= 3 && hWon > aWon)) winner = 'home';
            else if (aWon >= 2 || (finishedSets.length >= 3 && aWon > hWon)) winner = 'away';

            if (winner === 'home') homeReguWins++;
            else if (winner === 'away') awayReguWins++;

            const homeMember = match.home_super_team?.members?.[rIdx];
            const awayMember = match.away_super_team?.members?.[rIdx];
            const focusedMember = isHome ? homeMember : awayMember;
            const oppMember = isHome ? awayMember : homeMember;

            const fWon = isHome ? hWon : aWon;
            const oWon = isHome ? aWon : hWon;
            const isReguWin = (isHome && winner === 'home') || (!isHome && winner === 'away');

            return {
                index: rIdx,
                grubLetter: String.fromCharCode(65 + rIdx), // 'A', 'B', 'C'
                reguLabel: `Regu ${rIdx + 1} (Grub ${String.fromCharCode(65 + rIdx)})`,
                memberName: focusedMember?.name || `Regu ${rIdx + 1}`,
                oppMemberName: oppMember?.name || `Regu ${rIdx + 1} Lawan`,
                member: focusedMember,
                setNumbers: setNums,
                sets: rSets,
                finishedSets,
                focusedWon: fWon,
                oppWon: oWon,
                winner,
                isWin: isReguWin,
                scoreSummary: finishedSets.length > 0
                    ? finishedSets.map(s => `Set ${s.set_number}: ${isHome ? s.home_score : s.away_score}-${isHome ? s.away_score : s.home_score}`).join(' | ')
                    : 'Belum dimainkan',
            };
        });

        const focusedReguWins = isHome ? homeReguWins : awayReguWins;
        const oppReguWins = isHome ? awayReguWins : homeReguWins;

        if (focusedReguWins > oppReguWins) {
            matchWinnerStatus = `MENANG (${focusedReguWins} - ${oppReguWins} Regu)`;
        } else if (oppReguWins > focusedReguWins) {
            matchWinnerStatus = `KALAH (${focusedReguWins} - ${oppReguWins} Regu)`;
        } else {
            matchWinnerStatus = `IMBANG / BERJALAN (${focusedReguWins} - ${oppReguWins} Regu)`;
        }
        matchScoreText = `${focusedTeamName} ${focusedReguWins} - ${oppReguWins} ${opponentTeamName}`;
    } else {
        const finishedSets = match.sets?.filter(s => s.status === 'finished') || [];
        const hWon = finishedSets.filter(s => s.home_score > s.away_score).length;
        const aWon = finishedSets.filter(s => s.away_score > s.home_score).length;
        const fWon = isHome ? hWon : aWon;
        const oWon = isHome ? aWon : hWon;

        if (fWon > oWon) {
            matchWinnerStatus = `MENANG (${fWon} - ${oWon} Set)`;
        } else if (oWon > fWon) {
            matchWinnerStatus = `KALAH (${fWon} - ${oWon} Set)`;
        } else {
            matchWinnerStatus = `IMBANG / BERJALAN (${fWon} - ${oWon} Set)`;
        }
        matchScoreText = `${focusedTeamName} ${fWon} - ${oWon} ${opponentTeamName}`;
    }

    // ─────────────────────────────────────────────────────────────────
    // 3. HELPER STATS CALCULATORS
    // ─────────────────────────────────────────────────────────────────
    const aggregateStats = (statsList) => {
        const agg = {
            service_in: 0, service_ace: 0, service_error: 0,
            strike_in: 0, strike_ace: 0, strike_error: 0,
            freeball_in: 0, freeball_ace: 0, freeball_error: 0,
            firstball_in: 0, firstball_ace: 0, firstball_error: 0,
            feeding_in: 0, feeding_ace: 0, feeding_error: 0,
            blocking_in: 0, blocking_ace: 0, blocking_error: 0,
            opponent_mistake: 0,
            strike_success: 0, strike_fail: 0,
            receive_success: 0, receive_fail: 0,
            feeding_success: 0, feeding_fail: 0,
            block_success: 0, block_fail: 0,
            action_zones: { service: {}, strike: {}, blocking: {}, freeball: {}, firstball: {}, feeding: {} },
        };

        for (let i = 1; i <= 10; i++) {
            agg[`zone_${i}`] = 0;
            agg[`zone_${i}_ace`] = 0;
            agg[`zone_${i}_in`] = 0;
        }

        statsList.forEach(s => {
            Object.keys(agg).forEach(k => {
                if (k !== 'action_zones') {
                    agg[k] += Number(s[k]) || 0;
                }
            });

            let az = s.action_zones;
            if (typeof az === 'string') {
                try { az = JSON.parse(az); } catch(e) { az = null; }
            }
            if (az && typeof az === 'object') {
                Object.keys(az).forEach(act => {
                    if (!agg.action_zones[act]) agg.action_zones[act] = {};
                    let actObj = az[act];
                    if (typeof actObj === 'string') {
                        try { actObj = JSON.parse(actObj); } catch(e) { actObj = null; }
                    }
                    if (actObj && typeof actObj === 'object') {
                        Object.keys(actObj).forEach(zk => {
                            agg.action_zones[act][zk] = (agg.action_zones[act][zk] || 0) + (Number(actObj[zk]) || 0);
                        });
                    }
                });
            }
        });

        return agg;
    };

    // Retrieve stats for a specific athlete (all sets, or specific set_number / set_numbers array)
    const getAthleteStats = (athleteId, setNumbers = null) => {
        let stats = [];
        match.sets?.forEach(s => {
            let includeSet = false;
            if (setNumbers === null) includeSet = true;
            else if (Array.isArray(setNumbers)) includeSet = setNumbers.includes(s.set_number);
            else includeSet = s.set_number === setNumbers;

            if (includeSet) {
                s.stats?.forEach(st => {
                    if (st.athlete_id === athleteId) stats.push(st);
                });
            }
        });
        return aggregateStats(stats);
    };

    // Retrieve stats for a team / regu / super team (all sets, or specific set_number / set_numbers array)
    const getTeamStats = (filterTeamIds, filterAthleteIds, setNumbers = null) => {
        let stats = [];
        const isMatch = (st) => {
            if (st.athlete_id && filterAthleteIds.includes(st.athlete_id)) return true;
            if (st.team_id && filterTeamIds.includes(st.team_id)) return true;
            return false;
        };

        match.sets?.forEach(s => {
            let includeSet = false;
            if (setNumbers === null) includeSet = true;
            else if (Array.isArray(setNumbers)) includeSet = setNumbers.includes(s.set_number);
            else includeSet = s.set_number === setNumbers;

            if (includeSet) {
                s.stats?.forEach(st => {
                    if (isMatch(st)) stats.push(st);
                });
            }
        });

        return aggregateStats(stats);
    };

    // Helper: Build 10-zone data object
    const buildZoneData = (stats) => {
        const zd = {};
        for (let i = 1; i <= 10; i++) {
            zd[`zone_${i}`] = {
                ace: stats[`zone_${i}_ace`] || 0,
                in: stats[`zone_${i}_in`] || (stats[`zone_${i}_ace`] === 0 ? stats[`zone_${i}`] || 0 : 0),
            };
        }
        return zd;
    };

    // Helper: Draw 10-zone mini-table
    const drawCourtZoneTable = (startX, startY, width, title, zoneData) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
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
            return `${pct} (${zd.ace}/${zd.in})`;
        };

        const rows = [
            ['Z1 (Sudut Atas)', getZoneText(1), 'Z8 (Bawah Tengah)', getZoneText(8)],
            ['Z2 (0 - 1.22m)', getZoneText(2), 'Z9 (Tengah Lap.)', getZoneText(9)],
            ['Z3 (1.22 - 2.44m)', getZoneText(3), 'Z10 (Atas Tengah)', getZoneText(10)],
            ['Z4 (2.44 - 3.66m)', getZoneText(4), 'Z5 (3.66 - 4.88m)', getZoneText(5)],
            ['Z6 (4.88 - 6.10m)', getZoneText(6), 'Z7 (Sudut Bawah)', getZoneText(7)],
        ];

        autoTable(doc, {
            startY: startY + 1.5,
            margin: { left: startX },
            tableWidth: width,
            head: [['Zona', '% (Ace/In)', 'Zona', '% (Ace/In)']],
            body: rows,
            theme: 'grid',
            headStyles: {
                fillColor: [31, 41, 55],
                textColor: [255, 255, 255],
                fontSize: 6,
                halign: 'center',
                fontStyle: 'bold',
            },
            styles: {
                fontSize: 5.5,
                halign: 'center',
                valign: 'middle',
                cellPadding: 0.8,
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

    // ─────────────────────────────────────────────────────────────────
    // 4. RENDER HEADER & OVERALL MATCH SCORE BANNER
    // ─────────────────────────────────────────────────────────────────
    const primaryColor = isHome ? [16, 185, 129] : [245, 158, 11]; // Emerald for Home, Amber for Away
    const darkBg = [24, 24, 27];

    // Header Background Banner
    doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
    doc.rect(0, 0, 210, 32, 'F');

    // Header Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`LAPORAN REKAP PERFORMA TIM & PEMAIN: ${focusedTeamName.toUpperCase()}`, 105, 12, { align: 'center' });

    // Header Subtitle / Metadata
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(209, 213, 219);
    const tournamentName = match.tournament?.name || 'Turnamen Sepak Takraw';
    const matchMeta = `${tournamentName}  |  Mode: ${(match.match_mode || 'regu').toUpperCase()}  |  Babak: ${(match.stage || 'Penyisihan').toUpperCase()}  |  Lap: ${match.court_number || 1}  |  Wasit: ${match.referee?.name || '-'}`;
    doc.text(matchMeta, 105, 19, { align: 'center' });

    // ─────────────────────────────────────────────────────────────────
    // OVERALL SCORECARD BANNER
    // ─────────────────────────────────────────────────────────────────
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 36, 182, 22, 2.5, 2.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 36, 182, 22, 2.5, 2.5, 'S');

    // Win/Loss Outcome Badge
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`HASIL: ${matchWinnerStatus}`, 105, 43, { align: 'center' });

    // Team vs Team & Scores
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(matchScoreText, 105, 49, { align: 'center' });

    // Breakdown sub-text
    if (isTeamMode) {
        const reguQuick = reguSummaries.map(r => `${r.reguLabel}: ${r.isWin ? 'Menang' : (r.winner ? 'Kalah' : '-')} (${r.focusedWon}-${r.oppWon})`).join('  |  ');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(reguQuick, 105, 54, { align: 'center' });
    }

    let currentY = 62;

    // ─────────────────────────────────────────────────────────────────
    // 5. RENDER TEAM STATS & ATHLETES (SUPER TEAM MODE)
    // ─────────────────────────────────────────────────────────────────
    if (isTeamMode) {
        // Pre-calculate athletes for each regu:
        // - Grub A & B: Only athletes who actually recorded scores/actions (attempts > 0) in that grub
        // - Grub C (or last regu): Athletes who recorded scores in Grub C + all remaining unplayed team members
        const uniqueAllAthletes = Array.from(new Map(focusedAthletes.map(a => [a.id, a])).values());
        const reguAthletesMap = {};
        const assignedAthleteIds = new Set();

        reguSummaries.forEach((regu, rIdx) => {
            const isLastRegu = rIdx === reguSummaries.length - 1;
            const scoredAthletes = uniqueAllAthletes.filter(a => {
                const perf = calculateTotalPerformance(getAthleteStats(a.id, regu.setNumbers));
                return perf.totalAttempts > 0;
            });

            if (!isLastRegu) {
                const list = scoredAthletes.length > 0 ? scoredAthletes : (regu.member?.athletes || []);
                reguAthletesMap[rIdx] = list;
                list.forEach(a => assignedAthleteIds.add(a.id));
            } else {
                const remainingAthletes = uniqueAllAthletes.filter(a => !assignedAthleteIds.has(a.id) && !scoredAthletes.some(sa => sa.id === a.id));
                reguAthletesMap[rIdx] = [...scoredAthletes, ...remainingAthletes];
            }
        });

        reguSummaries.forEach((regu, rIndex) => {
            const sNums = regu.setNumbers; // [1, 2, 3] or [4, 5, 6] or [7, 8, 9]
            const athletesForRegu = reguAthletesMap[rIndex] || [];

            // Cek jika halaman hampir penuh, buat halaman baru
            if (currentY > 230) {
                doc.addPage();
                currentY = 16;
            }

            // Section Header: REGU X (GRUB A/B/C)
            doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
            doc.roundedRect(14, currentY, 182, 9, 1.5, 1.5, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            const reguTitle = `${regu.reguLabel.toUpperCase()} - ${regu.memberName.toUpperCase()}  |  Hasil: ${regu.isWin ? 'MENANG' : (regu.winner ? 'KALAH' : '-')} (${regu.focusedWon}-${regu.oppWon} Set)`;
            doc.text(reguTitle, 18, currentY + 6);

            currentY += 12;

            // Skor Sesi Regu Ini
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            doc.text(`Rincian Skor: ${regu.scoreSummary}`, 14, currentY);
            currentY += 4;

            // ─── TABEL 1: PERFORMA TIM REGU (All Sets + Set 1, 2, 3) ───
            const tAll = getTeamStats(focusedTeamIds, focusedAthleteIds, sNums);
            const tSet1 = getTeamStats(focusedTeamIds, focusedAthleteIds, sNums[0]);
            const tSet2 = getTeamStats(focusedTeamIds, focusedAthleteIds, sNums[1]);
            const tSet3 = getTeamStats(focusedTeamIds, focusedAthleteIds, sNums[2]);

            const totPerfAll = calculateTotalPerformance(tAll);
            const totPerfS1 = calculateTotalPerformance(tSet1);
            const totPerfS2 = calculateTotalPerformance(tSet2);
            const totPerfS3 = calculateTotalPerformance(tSet3);

            const metricsList = [
                { label: 'Servis', fn: (t) => formatActionPerformance(t.service_in, t.service_ace, t.service_error) },
                { label: 'Strike / Smash', fn: (t) => formatActionPerformance(t.strike_in || t.strike_success, t.strike_ace, t.strike_error || t.strike_fail) },
                { label: 'Freeball', fn: (t) => formatActionPerformance(t.freeball_in, t.freeball_ace, t.freeball_error) },
                { label: 'Firstball / Receive', fn: (t) => formatActionPerformance(t.firstball_in || t.receive_success, t.firstball_ace, t.firstball_error || t.receive_fail) },
                { label: 'Feeding', fn: (t) => formatActionPerformance(t.feeding_in || t.feeding_success, t.feeding_ace, t.feeding_error || t.feeding_fail) },
                { label: 'Blocking', fn: (t) => formatActionPerformance(t.blocking_in || t.block_success, t.blocking_ace, t.blocking_error || t.block_fail) },
                { label: 'Kesalahan Lawan', fn: (t) => `+${t.opponent_mistake || 0} Poin` },
            ];

            const reguTableRows = metricsList.map(m => [
                m.label,
                m.fn(tAll),
                m.fn(tSet1),
                m.fn(tSet2),
                m.fn(tSet3),
            ]);

            // Baris Total Performa Akumulasi Aksi (All Actions Sum)
            reguTableRows.push([
                { content: 'TOTAL PERFORMA AKSI (Sukses / Total %)', styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
                { content: totPerfAll.shortFormatted, styles: { fontStyle: 'bold', halign: 'center', fillColor: [220, 252, 231], textColor: [22, 101, 52] } },
                { content: totPerfS1.shortFormatted, styles: { fontStyle: 'bold', halign: 'center', fillColor: [241, 245, 249] } },
                { content: totPerfS2.shortFormatted, styles: { fontStyle: 'bold', halign: 'center', fillColor: [241, 245, 249] } },
                { content: totPerfS3.shortFormatted, styles: { fontStyle: 'bold', halign: 'center', fillColor: [241, 245, 249] } },
            ]);

            autoTable(doc, {
                startY: currentY,
                head: [[
                    `Parameter Statistik (Format: In/Ace/Err [Perf %])`,
                    `All Sets (${regu.reguLabel})`,
                    `Set ${sNums[0]}`,
                    `Set ${sNums[1]}`,
                    `Set ${sNums[2]}`,
                ]],
                body: reguTableRows,
                theme: 'striped',
                headStyles: {
                    fillColor: [31, 41, 55],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    halign: 'center',
                    fontSize: 6.5,
                },
                columnStyles: {
                    0: { halign: 'left', fontStyle: 'bold', width: 54 },
                    1: { halign: 'center', fontStyle: 'bold', textColor: [16, 185, 129], width: 33 },
                    2: { halign: 'center', width: 31 },
                    3: { halign: 'center', width: 31 },
                    4: { halign: 'center', width: 33 },
                },
                styles: { fontSize: 6, cellPadding: 1 },
                margin: { left: 14, right: 14 },
            });

            currentY = doc.lastAutoTable.finalY + 5;

            // ─── TABEL 2: PERFORMA INDIVIDUAL PEMAIN DI REGU INI ───
            if (athletesForRegu.length > 0) {
                doc.setFontSize(8.5);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(31, 41, 55);
                doc.text(`STATISTIK INDIVIDU PEMAIN - ${regu.reguLabel.toUpperCase()} (${regu.memberName})`, 14, currentY);
                currentY += 2;

                const athleteDetailRows = [];
                athletesForRegu.forEach(ath => {
                    const aAll = getAthleteStats(ath.id, sNums);
                    const aS1 = getAthleteStats(ath.id, sNums[0]);
                    const aS2 = getAthleteStats(ath.id, sNums[1]);
                    const aS3 = getAthleteStats(ath.id, sNums[2]);

                    const athPerfAll = calculateTotalPerformance(aAll);
                    const athPerfS1 = calculateTotalPerformance(aS1);
                    const athPerfS2 = calculateTotalPerformance(aS2);
                    const athPerfS3 = calculateTotalPerformance(aS3);

                    const athHeader = `#${ath.jersey_number || '-'} ${ath.name} (${ath.position || 'Pemain'})`;

                    athleteDetailRows.push([
                        { content: athHeader, colSpan: 5, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } }
                    ]);

                    athleteDetailRows.push([
                        '  - Servis (In/Ace/Err %)',
                        formatActionPerformance(aAll.service_in, aAll.service_ace, aAll.service_error),
                        formatActionPerformance(aS1.service_in, aS1.service_ace, aS1.service_error),
                        formatActionPerformance(aS2.service_in, aS2.service_ace, aS2.service_error),
                        formatActionPerformance(aS3.service_in, aS3.service_ace, aS3.service_error),
                    ]);
                    athleteDetailRows.push([
                        '  - Strike (In/Ace/Err %)',
                        formatActionPerformance(aAll.strike_in || aAll.strike_success, aAll.strike_ace, aAll.strike_error || aAll.strike_fail),
                        formatActionPerformance(aS1.strike_in || aS1.strike_success, aS1.strike_ace, aS1.strike_error || aS1.strike_fail),
                        formatActionPerformance(aS2.strike_in || aS2.strike_success, aS2.strike_ace, aS2.strike_error || aS2.strike_fail),
                        formatActionPerformance(aS3.strike_in || aS3.strike_success, aS3.strike_ace, aS3.strike_error || aS3.strike_fail),
                    ]);
                    athleteDetailRows.push([
                        '  - Freeball (In/Ace/Err %)',
                        formatActionPerformance(aAll.freeball_in, aAll.freeball_ace, aAll.freeball_error),
                        formatActionPerformance(aS1.freeball_in, aS1.freeball_ace, aS1.freeball_error),
                        formatActionPerformance(aS2.freeball_in, aS2.freeball_ace, aS2.freeball_error),
                        formatActionPerformance(aS3.freeball_in, aS3.freeball_ace, aS3.freeball_error),
                    ]);
                    athleteDetailRows.push([
                        '  - Firstball (In/Ace/Err %)',
                        formatActionPerformance(aAll.firstball_in || aAll.receive_success, aAll.firstball_ace, aAll.firstball_error || aAll.receive_fail),
                        formatActionPerformance(aS1.firstball_in || aS1.receive_success, aS1.firstball_ace, aS1.firstball_error || aS1.receive_fail),
                        formatActionPerformance(aS2.firstball_in || aS2.receive_success, aS2.firstball_ace, aS2.firstball_error || aS2.receive_fail),
                        formatActionPerformance(aS3.firstball_in || aS3.receive_success, aS3.firstball_ace, aS3.firstball_error || aS3.receive_fail),
                    ]);
                    athleteDetailRows.push([
                        '  - Feeding (In/Ace/Err %)',
                        formatActionPerformance(aAll.feeding_in || aAll.feeding_success, aAll.feeding_ace, aAll.feeding_error || aAll.feeding_fail),
                        formatActionPerformance(aS1.feeding_in || aS1.feeding_success, aS1.feeding_ace, aS1.feeding_error || aS1.feeding_fail),
                        formatActionPerformance(aS2.feeding_in || aS2.feeding_success, aS2.feeding_ace, aS2.feeding_error || aS2.feeding_fail),
                        formatActionPerformance(aS3.feeding_in || aS3.feeding_success, aS3.feeding_ace, aS3.feeding_error || aS3.feeding_fail),
                    ]);
                    athleteDetailRows.push([
                        '  - Blocking (In/Ace/Err %)',
                        formatActionPerformance(aAll.blocking_in || aAll.block_success, aAll.blocking_ace, aAll.blocking_error || aAll.block_fail),
                        formatActionPerformance(aS1.blocking_in || aS1.block_success, aS1.blocking_ace, aS1.blocking_error || aS1.block_fail),
                        formatActionPerformance(aS2.blocking_in || aS2.block_success, aS2.blocking_ace, aS2.blocking_error || aS2.block_fail),
                        formatActionPerformance(aS3.blocking_in || aS3.block_success, aS3.blocking_ace, aS3.blocking_error || aS3.block_fail),
                    ]);
                    athleteDetailRows.push([
                        { content: '  TOTAL PERFORMA PEMAIN', styles: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [15, 23, 42] } },
                        { content: athPerfAll.shortFormatted, styles: { fontStyle: 'bold', halign: 'center', textColor: [16, 185, 129] } },
                        { content: athPerfS1.shortFormatted, styles: { fontStyle: 'bold', halign: 'center' } },
                        { content: athPerfS2.shortFormatted, styles: { fontStyle: 'bold', halign: 'center' } },
                        { content: athPerfS3.shortFormatted, styles: { fontStyle: 'bold', halign: 'center' } },
                    ]);
                });

                autoTable(doc, {
                    startY: currentY,
                    head: [['Nama Pemain / Parameter Aksi', `All Sets (${regu.reguLabel})`, `Set ${sNums[0]}`, `Set ${sNums[1]}`, `Set ${sNums[2]}`]],
                    body: athleteDetailRows,
                    theme: 'grid',
                    headStyles: {
                        fillColor: isHome ? [16, 185, 129] : [217, 119, 6],
                        textColor: [255, 255, 255],
                        fontStyle: 'bold',
                        halign: 'center',
                        fontSize: 6.5,
                    },
                    columnStyles: {
                        0: { halign: 'left', fontStyle: 'bold', width: 54 },
                        1: { halign: 'center', fontStyle: 'bold', width: 33 },
                        2: { halign: 'center', width: 31 },
                        3: { halign: 'center', width: 31 },
                        4: { halign: 'center', width: 33 },
                    },
                    styles: { fontSize: 5.8, cellPadding: 0.8 },
                    margin: { left: 14, right: 14 },
                });

                currentY = doc.lastAutoTable.finalY + 6;
            }

            // ─── TABEL 3: PETA 10 ZONA SERVIS REGU INI ───
            if (currentY > 215) {
                doc.addPage();
                currentY = 16;
            }

            const reguAllZone = buildZoneData(tAll);
            const reguS1Zone = buildZoneData(tSet1);
            const reguS2Zone = buildZoneData(tSet2);
            const reguS3Zone = buildZoneData(tSet3);

            const colW = 88;
            const yA = drawCourtZoneTable(14, currentY, colW, `DISTRIBUSI SERVIS (10 ZONA) - ${regu.reguLabel} ALL SETS`, reguAllZone);
            const yB = drawCourtZoneTable(108, currentY, colW, `DISTRIBUSI SERVIS - SET ${sNums[0]}`, reguS1Zone);

            currentY = Math.max(yA, yB) + 4;

            const yC = drawCourtZoneTable(14, currentY, colW, `DISTRIBUSI SERVIS - SET ${sNums[1]}`, reguS2Zone);
            const yD = drawCourtZoneTable(108, currentY, colW, `DISTRIBUSI SERVIS - SET ${sNums[2]}`, reguS3Zone);

            currentY = Math.max(yC, yD) + 8;
        });

    } else {
        // ─────────────────────────────────────────────────────────────────
        // 6. RENDER SINGLE TEAM MODE (REGU / DOUBLE / QUADRANT)
        // ─────────────────────────────────────────────────────────────────
        const tAll = getTeamStats(focusedTeamIds, focusedAthleteIds, null);
        const tSet1 = getTeamStats(focusedTeamIds, focusedAthleteIds, 1);
        const tSet2 = getTeamStats(focusedTeamIds, focusedAthleteIds, 2);
        const tSet3 = getTeamStats(focusedTeamIds, focusedAthleteIds, 3);

        const totPerfAll = calculateTotalPerformance(tAll);
        const totPerfS1 = calculateTotalPerformance(tSet1);
        const totPerfS2 = calculateTotalPerformance(tSet2);
        const totPerfS3 = calculateTotalPerformance(tSet3);

        const metricsList = [
            { label: 'Servis', fn: (t) => formatActionPerformance(t.service_in, t.service_ace, t.service_error) },
            { label: 'Strike / Smash', fn: (t) => formatActionPerformance(t.strike_in || t.strike_success, t.strike_ace, t.strike_error || t.strike_fail) },
            { label: 'Freeball', fn: (t) => formatActionPerformance(t.freeball_in, t.freeball_ace, t.freeball_error) },
            { label: 'Firstball / Receive', fn: (t) => formatActionPerformance(t.firstball_in || t.receive_success, t.firstball_ace, t.firstball_error || t.receive_fail) },
            { label: 'Feeding', fn: (t) => formatActionPerformance(t.feeding_in || t.feeding_success, t.feeding_ace, t.feeding_error || t.feeding_fail) },
            { label: 'Blocking', fn: (t) => formatActionPerformance(t.blocking_in || t.block_success, t.blocking_ace, t.blocking_error || t.block_fail) },
            { label: 'Kesalahan Lawan', fn: (t) => `+${t.opponent_mistake || 0} Poin` },
        ];

        const singleTableRows = metricsList.map(m => [
            m.label,
            m.fn(tAll),
            m.fn(tSet1),
            m.fn(tSet2),
            m.fn(tSet3),
        ]);

        singleTableRows.push([
            { content: 'TOTAL PERFORMA AKSI (Sukses / Total %)', styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
            { content: totPerfAll.shortFormatted, styles: { fontStyle: 'bold', halign: 'center', fillColor: [220, 252, 231], textColor: [22, 101, 52] } },
            { content: totPerfS1.shortFormatted, styles: { fontStyle: 'bold', halign: 'center', fillColor: [241, 245, 249] } },
            { content: totPerfS2.shortFormatted, styles: { fontStyle: 'bold', halign: 'center', fillColor: [241, 245, 249] } },
            { content: totPerfS3.shortFormatted, styles: { fontStyle: 'bold', halign: 'center', fillColor: [241, 245, 249] } },
        ]);

        autoTable(doc, {
            startY: currentY,
            head: [[`Parameter Statistik (${focusedTeamName})`, 'All Sets (Total)', 'Set 1', 'Set 2', 'Set 3']],
            body: singleTableRows,
            theme: 'striped',
            headStyles: {
                fillColor: [31, 41, 55],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center',
                fontSize: 7,
            },
            columnStyles: {
                0: { halign: 'left', fontStyle: 'bold', width: 54 },
                1: { halign: 'center', fontStyle: 'bold', textColor: [16, 185, 129], width: 33 },
                2: { halign: 'center', width: 31 },
                3: { halign: 'center', width: 31 },
                4: { halign: 'center', width: 33 },
            },
            styles: { fontSize: 6.5, cellPadding: 1 },
            margin: { left: 14, right: 14 },
        });

        currentY = doc.lastAutoTable.finalY + 6;

        // Individual athletes table
        const athletes = focusedAthletes;
        if (athletes.length > 0) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(31, 41, 55);
            doc.text(`STATISTIK PERFORMA INDIVIDU PEMAIN (${focusedTeamName})`, 14, currentY);
            currentY += 2;

            const athleteDetailRows = [];
            athletes.forEach(ath => {
                const aAll = getAthleteStats(ath.id, null);
                const aS1 = getAthleteStats(ath.id, 1);
                const aS2 = getAthleteStats(ath.id, 2);
                const aS3 = getAthleteStats(ath.id, 3);

                const athPerfAll = calculateTotalPerformance(aAll);
                const athPerfS1 = calculateTotalPerformance(aS1);
                const athPerfS2 = calculateTotalPerformance(aS2);
                const athPerfS3 = calculateTotalPerformance(aS3);

                const athHeader = `#${ath.jersey_number || '-'} ${ath.name} (${ath.position || 'Pemain'})`;

                athleteDetailRows.push([
                    { content: athHeader, colSpan: 5, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } }
                ]);

                athleteDetailRows.push([
                    '  - Servis (In/Ace/Err %)',
                    formatActionPerformance(aAll.service_in, aAll.service_ace, aAll.service_error),
                    formatActionPerformance(aS1.service_in, aS1.service_ace, aS1.service_error),
                    formatActionPerformance(aS2.service_in, aS2.service_ace, aS2.service_error),
                    formatActionPerformance(aS3.service_in, aS3.service_ace, aS3.service_error),
                ]);
                athleteDetailRows.push([
                    '  - Strike (In/Ace/Err %)',
                    formatActionPerformance(aAll.strike_in || aAll.strike_success, aAll.strike_ace, aAll.strike_error || aAll.strike_fail),
                    formatActionPerformance(aS1.strike_in || aS1.strike_success, aS1.strike_ace, aS1.strike_error || aS1.strike_fail),
                    formatActionPerformance(aS2.strike_in || aS2.strike_success, aS2.strike_ace, aS2.strike_error || aS2.strike_fail),
                    formatActionPerformance(aS3.strike_in || aS3.strike_success, aS3.strike_ace, aS3.strike_error || aS3.strike_fail),
                ]);
                athleteDetailRows.push([
                    '  - Freeball (In/Ace/Err %)',
                    formatActionPerformance(aAll.freeball_in, aAll.freeball_ace, aAll.freeball_error),
                    formatActionPerformance(aS1.freeball_in, aS1.freeball_ace, aS1.freeball_error),
                    formatActionPerformance(aS2.freeball_in, aS2.freeball_ace, aS2.freeball_error),
                    formatActionPerformance(aS3.freeball_in, aS3.freeball_ace, aS3.freeball_error),
                ]);
                athleteDetailRows.push([
                    '  - Firstball (In/Ace/Err %)',
                    formatActionPerformance(aAll.firstball_in || aAll.receive_success, aAll.firstball_ace, aAll.firstball_error || aAll.receive_fail),
                    formatActionPerformance(aS1.firstball_in || aS1.receive_success, aS1.firstball_ace, aS1.firstball_error || aS1.receive_fail),
                    formatActionPerformance(aS2.firstball_in || aS2.receive_success, aS2.firstball_ace, aS2.firstball_error || aS2.receive_fail),
                    formatActionPerformance(aS3.firstball_in || aS3.receive_success, aS3.firstball_ace, aS3.firstball_error || aS3.receive_fail),
                ]);
                athleteDetailRows.push([
                    '  - Feeding (In/Ace/Err %)',
                    formatActionPerformance(aAll.feeding_in || aAll.feeding_success, aAll.feeding_ace, aAll.feeding_error || aAll.feeding_fail),
                    formatActionPerformance(aS1.feeding_in || aS1.feeding_success, aS1.feeding_ace, aS1.feeding_error || aS1.feeding_fail),
                    formatActionPerformance(aS2.feeding_in || aS2.feeding_success, aS2.feeding_ace, aS2.feeding_error || aS2.feeding_fail),
                    formatActionPerformance(aS3.feeding_in || aS3.feeding_success, aS3.feeding_ace, aS3.feeding_error || aS3.feeding_fail),
                ]);
                athleteDetailRows.push([
                    '  - Blocking (In/Ace/Err %)',
                    formatActionPerformance(aAll.blocking_in || aAll.block_success, aAll.blocking_ace, aAll.blocking_error || aAll.block_fail),
                    formatActionPerformance(aS1.blocking_in || aS1.block_success, aS1.blocking_ace, aS1.blocking_error || aS1.block_fail),
                    formatActionPerformance(aS2.blocking_in || aS2.block_success, aS2.blocking_ace, aS2.blocking_error || aS2.block_fail),
                    formatActionPerformance(aS3.blocking_in || aS3.block_success, aS3.blocking_ace, aS3.blocking_error || aS3.block_fail),
                ]);
                athleteDetailRows.push([
                    { content: '  TOTAL PERFORMA PEMAIN', styles: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [15, 23, 42] } },
                    { content: athPerfAll.shortFormatted, styles: { fontStyle: 'bold', halign: 'center', textColor: [16, 185, 129] } },
                    { content: athPerfS1.shortFormatted, styles: { fontStyle: 'bold', halign: 'center' } },
                    { content: athPerfS2.shortFormatted, styles: { fontStyle: 'bold', halign: 'center' } },
                    { content: athPerfS3.shortFormatted, styles: { fontStyle: 'bold', halign: 'center' } },
                ]);
            });

            autoTable(doc, {
                startY: currentY,
                head: [['Nama Pemain / Parameter Aksi', 'All Sets (Total)', 'Set 1', 'Set 2', 'Set 3']],
                body: athleteDetailRows,
                theme: 'grid',
                headStyles: {
                    fillColor: isHome ? [16, 185, 129] : [217, 119, 6],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    halign: 'center',
                    fontSize: 6.5,
                },
                columnStyles: {
                    0: { halign: 'left', fontStyle: 'bold', width: 54 },
                    1: { halign: 'center', fontStyle: 'bold', width: 33 },
                    2: { halign: 'center', width: 31 },
                    3: { halign: 'center', width: 31 },
                    4: { halign: 'center', width: 33 },
                },
                styles: { fontSize: 6.5, cellPadding: 0.8 },
                margin: { left: 14, right: 14 },
            });

            currentY = doc.lastAutoTable.finalY + 6;
        }

        // 10-Zone Distribution for Single Team
        if (currentY > 215) {
            doc.addPage();
            currentY = 16;
        }

        const teamAllZone = buildZoneData(tAll);
        const teamS1Zone = buildZoneData(tSet1);
        const teamS2Zone = buildZoneData(tSet2);
        const teamS3Zone = buildZoneData(tSet3);

        const colW = 88;
        const yA = drawCourtZoneTable(14, currentY, colW, `DISTRIBUSI SERVIS (10 ZONA) - ALL SETS`, teamAllZone);
        const yB = drawCourtZoneTable(108, currentY, colW, `DISTRIBUSI SERVIS - SET 1`, teamS1Zone);

        currentY = Math.max(yA, yB) + 4;

        const yC = drawCourtZoneTable(14, currentY, colW, `DISTRIBUSI SERVIS - SET 2`, teamS2Zone);
        const yD = drawCourtZoneTable(108, currentY, colW, `DISTRIBUSI SERVIS - SET 3 (Jika Ada)`, teamS3Zone);
    }

    const filename = `Laporan_Statistik_${focusedTeamName.replace(/\s+/g, '_')}_vs_${opponentTeamName.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
}
