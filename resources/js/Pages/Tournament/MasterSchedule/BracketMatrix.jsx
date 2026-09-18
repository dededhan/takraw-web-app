import { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import VisualBracketTree, { formatSourceToHuman } from '@/Components/Tournament/VisualBracketTree';

const MODE_LABELS = {
    regu:        { label: 'Regu',        icon: '🏐', color: 'from-blue-600 to-blue-800', border: 'border-blue-500/40', badge: 'bg-blue-500/20 text-blue-300' },
    double:      { label: 'Double',      icon: '👥', color: 'from-emerald-600 to-emerald-800', border: 'border-emerald-500/40', badge: 'bg-emerald-500/20 text-emerald-300' },
    quadrant:    { label: 'Quadrant',    icon: '⬡',  color: 'from-purple-600 to-purple-800', border: 'border-purple-500/40', badge: 'bg-purple-500/20 text-purple-300' },
    team_regu:   { label: 'Team Regu',   icon: '🏆', color: 'from-amber-600 to-amber-800', border: 'border-amber-500/40', badge: 'bg-amber-500/20 text-amber-300' },
    team_double: { label: 'Team Double', icon: '🥇', color: 'from-red-600 to-red-800', border: 'border-red-500/40', badge: 'bg-red-500/20 text-red-300' },
};

const STAGE_OPTIONS = [
    { value: 'final',        label: '🏆 Final / Grand Final' },
    { value: 'third_place',  label: '🥉 Perebutan Juara 3' },
    { value: 'semifinal',    label: '⚔️ Semifinal' },
    { value: 'round_of_8',   label: '🥊 8 Besar (Quarterfinal)' },
    { value: 'round_of_16',  label: '🛡️ 16 Besar (Round of 16)' },
    { value: 'round_of_32',  label: '🌐 32 Besar (Round of 32)' },
];

const STAGE_ORDER_MAP = {
    round_of_32: 1,
    round_of_16: 2,
    round_of_8:  3,
    semifinal:    4,
    final:        5,
    third_place:  6,
};

const STAGE_LABELS_MAP = {
    round_of_32: { label: 'Babak 32 Besar', icon: '🌐', badge: 'bg-teal-500/15 text-teal-300 border-teal-500/30' },
    round_of_16: { label: 'Babak 16 Besar', icon: '🛡️', badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
    round_of_8:  { label: '8 Besar (Perempat Final)', icon: '🥊', badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
    semifinal:   { label: 'Semifinal', icon: '⚔️', badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
    final:       { label: 'Grand Final', icon: '🏆', badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
    third_place: { label: 'Perebutan Juara 3', icon: '🥉', badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
};

export default function BracketMatrix({
    tournament,
    activeModes = [],
    modeBrackets = {},
}) {
    const [activeTab, setActiveTab] = useState(activeModes[0]?.match_mode || 'regu');
    const [saving, setSaving] = useState(false);
    const [flash, setFlash] = useState(null);
    const [viewMode, setViewMode] = useState('both'); // 'both', 'visual', 'table'

    // State untuk mode swipe / penukaran posisi interaktif
    const [swapPendingSlot, setSwapPendingSlot] = useState(null);

    // Auto-dismiss flash notifikasi setelah 4.5 detik
    useEffect(() => {
        if (flash) {
            const timer = setTimeout(() => {
                setFlash(null);
            }, 4500);
            return () => clearTimeout(timer);
        }
    }, [flash]);

    const [editingBracket, setEditingBracket] = useState(null);
    const [editBracketName, setEditBracketName] = useState('');
    const [isRenaming, setIsRenaming] = useState(false);

    const handleRenameSubmit = (e) => {
        e.preventDefault();
        if (!editingBracket || !editBracketName.trim()) return;

        setIsRenaming(true);
        router.post(
            route('pools.rename-bracket', tournament.id),
            {
                match_mode: activeTab,
                old_bracket_name: editingBracket,
                new_bracket_name: editBracketName.trim(),
            },
            {
                onSuccess: () => {
                    setEditingBracket(null);
                    setEditBracketName('');
                },
                onFinish: () => setIsRenaming(false),
            }
        );
    };

    // Inisialisasi formData: keyed by [mode][bracketName] => Array of stages
    const [formData, setFormData] = useState(() => {
        const initial = {};
        activeModes.forEach(mode => {
            const mKey = mode.match_mode;
            initial[mKey] = {};
            const brackets = modeBrackets[mKey] || [];
            brackets.forEach(b => {
                initial[mKey][b.bracket_name] = (b.stages || []).map(s => ({
                    bracket_stage:    s.bracket_stage || 'final',
                    bracket_position: Number(s.bracket_position || 1),
                    home_source:      s.home_source || 'pool_A_rank_1',
                    away_source:      s.away_source || 'pool_B_rank_1',
                }));
            });
        });
        return initial;
    });

    const activeBrackets = modeBrackets[activeTab] || [];

    // Helper: update stage row untuk braket tertentu dengan AUTO-SWAP (SWIPE POSISI)
    // Jika sumber tim yang dipilih (value) sudah dipakai di slot lain dalam braket ini,
    // tukar posisi secara otomatis sehingga semua juara dan runner-up tetap masuk bagan
    const updateBracketRow = (bracketName, stageIdx, field, value) => {
        setFormData(prev => {
            const currentList = [...(prev[activeTab]?.[bracketName] || [])];
            if (!currentList[stageIdx]) return prev;

            // Jika field bukan sumber tim (misal bracket_stage atau bracket_position), update biasa
            if (field !== 'home_source' && field !== 'away_source') {
                return {
                    ...prev,
                    [activeTab]: {
                        ...(prev[activeTab] || {}),
                        [bracketName]: currentList.map((row, i) =>
                            i === stageIdx ? { ...row, [field]: value } : row
                        ),
                    },
                };
            }

            const oldValue = currentList[stageIdx][field];
            if (oldValue === value) return prev;

            const updatedList = currentList.map(r => ({ ...r }));

            // AUTO-SWAP: Cari apakah value sudah dipakai di slot lain di braket ini
            let swapDetail = null;

            if (value && value !== 'bye') {
                for (let i = 0; i < updatedList.length; i++) {
                    const r = updatedList[i];
                    if (i === stageIdx) {
                        const otherSide = field === 'home_source' ? 'away_source' : 'home_source';
                        if (r[otherSide] === value) {
                            updatedList[i][otherSide] = oldValue;
                            swapDetail = {
                                stage: r.bracket_stage,
                                pos: r.bracket_position,
                                side: otherSide === 'home_source' ? 'Home' : 'Away',
                            };
                            break;
                        }
                    } else {
                        if (r.home_source === value) {
                            updatedList[i].home_source = oldValue;
                            swapDetail = {
                                stage: r.bracket_stage,
                                pos: r.bracket_position,
                                side: 'Home',
                            };
                            break;
                        }
                        if (r.away_source === value) {
                            updatedList[i].away_source = oldValue;
                            swapDetail = {
                                stage: r.bracket_stage,
                                pos: r.bracket_position,
                                side: 'Away',
                            };
                            break;
                        }
                    }
                }
            }

            updatedList[stageIdx][field] = value;

            if (swapDetail) {
                const newLabel = formatSourceToHuman(value);
                const oldLabel = formatSourceToHuman(oldValue);
                setFlash({
                    type: 'info',
                    msg: `🔄 Posisi otomatis ditukar (Swap): "${newLabel}" ⇄ "${oldLabel}" (dengan Laga #${swapDetail.pos} ${swapDetail.side})`
                });
            }

            return {
                ...prev,
                [activeTab]: {
                    ...(prev[activeTab] || {}),
                    [bracketName]: updatedList,
                },
            };
        });
    };

    // Eksekusi penukaran manual antara dua slot spesifik
    const executeSlotSwap = (bracketName, rowIdxA, fieldA, rowIdxB, fieldB) => {
        setFormData(prev => {
            const list = [...(prev[activeTab]?.[bracketName] || [])];
            if (!list[rowIdxA] || !list[rowIdxB]) return prev;

            const updatedList = list.map(r => ({ ...r }));
            const valA = updatedList[rowIdxA][fieldA];
            const valB = updatedList[rowIdxB][fieldB];

            updatedList[rowIdxA][fieldA] = valB;
            updatedList[rowIdxB][fieldB] = valA;

            const labelA = formatSourceToHuman(valA);
            const labelB = formatSourceToHuman(valB);

            setFlash({
                type: 'success',
                msg: `🔄 Berhasil menukar posisi: "${labelA}" ⇄ "${labelB}"!`,
            });

            return {
                ...prev,
                [activeTab]: {
                    ...(prev[activeTab] || {}),
                    [bracketName]: updatedList,
                },
            };
        });
    };

    // Handler klik slot untuk penukaran posisi interaktif (hanya untuk babak awal)
    const handleSlotClickForSwap = (bracketName, rowIdx, field, source, stage, pos) => {
        const stages = formData[activeTab]?.[bracketName] || [];
        const initialStage = stages.reduce((earliest, r) => {
            if (!earliest) return r.bracket_stage;
            const oCurr = STAGE_ORDER_MAP[r.bracket_stage] || 99;
            const oEarl = STAGE_ORDER_MAP[earliest] || 99;
            return oCurr < oEarl ? r.bracket_stage : earliest;
        }, null);

        if (stage !== initialStage) {
            setFlash({
                type: 'info',
                msg: 'Penukaran posisi hanya berlaku untuk babak awal (Juara/Runner-up pool). Babak lanjutan mengalir secara otomatis.',
            });
            return;
        }

        if (!swapPendingSlot) {
            setSwapPendingSlot({ bracketName, rowIdx, field, source, stage, pos });
            setFlash({
                type: 'info',
                msg: `⚡ Memilih "${formatSourceToHuman(source)}" (Laga #${pos} ${field === 'home_source' ? 'Home' : 'Away'}). Klik tombol "⇄ Tukar" atau kartu tim lain untuk menukar.`,
            });
        } else {
            if (
                swapPendingSlot.bracketName === bracketName &&
                swapPendingSlot.rowIdx === rowIdx &&
                swapPendingSlot.field === field
            ) {
                setSwapPendingSlot(null);
                setFlash({ type: 'info', msg: 'Penukaran posisi dibatalkan.' });
            } else if (swapPendingSlot.bracketName === bracketName) {
                executeSlotSwap(bracketName, swapPendingSlot.rowIdx, swapPendingSlot.field, rowIdx, field);
                setSwapPendingSlot(null);
            } else {
                setSwapPendingSlot({ bracketName, rowIdx, field, source, stage, pos });
            }
        }
    };

    // Helper: tukar seluruh pertandingan (Home & Away) dengan pertandingan lain di babak yang sama
    const swapEntireMatch = (bracketName, rowIdxA, rowIdxB) => {
        if (rowIdxA === rowIdxB) return;
        setFormData(prev => {
            const list = [...(prev[activeTab]?.[bracketName] || [])];
            if (!list[rowIdxA] || !list[rowIdxB]) return prev;

            const itemA = { ...list[rowIdxA] };
            const itemB = { ...list[rowIdxB] };

            const tempHome = itemA.home_source;
            const tempAway = itemA.away_source;

            itemA.home_source = itemB.home_source;
            itemA.away_source = itemB.away_source;

            itemB.home_source = tempHome;
            itemB.away_source = tempAway;

            list[rowIdxA] = itemA;
            list[rowIdxB] = itemB;

            setFlash({
                type: 'success',
                msg: `🔄 Seluruh laga #${itemA.bracket_position} dan #${itemB.bracket_position} (${itemA.bracket_stage}) berhasil ditukar posisinya!`,
            });

            return {
                ...prev,
                [activeTab]: {
                    ...(prev[activeTab] || {}),
                    [bracketName]: list,
                },
            };
        });
    };

    // Helper: tambah baris babak untuk braket tertentu
    const addBracketRow = (bracketName, defaultStage = 'final') => {
        const currentRows = formData[activeTab]?.[bracketName] || [];
        const nextPos = currentRows.filter(r => r.bracket_stage === defaultStage).length + 1;
        const newRow = {
            bracket_stage:    defaultStage,
            bracket_position: nextPos,
            home_source:      'pool_A_rank_1',
            away_source:      'pool_B_rank_1',
        };
        setFormData(prev => ({
            ...prev,
            [activeTab]: {
                ...(prev[activeTab] || {}),
                [bracketName]: [...currentRows, newRow],
            },
        }));
    };

    // Helper: hapus baris babak untuk braket tertentu
    const deleteBracketRow = (bracketName, stageIdx) => {
        setFormData(prev => ({
            ...prev,
            [activeTab]: {
                ...(prev[activeTab] || {}),
                [bracketName]: (prev[activeTab]?.[bracketName] || []).filter((_, i) => i !== stageIdx),
            },
        }));
    };

    const swapRowHomeAway = (bracketName, rowIdx) => {
        setFormData(prev => {
            const list = [...(prev[activeTab]?.[bracketName] || [])];
            if (!list[rowIdx]) return prev;
            const item = { ...list[rowIdx] };
            const temp = item.home_source;
            item.home_source = item.away_source;
            item.away_source = temp;
            list[rowIdx] = item;
            setFlash({
                type: 'info',
                msg: `🔄 Posisi Home & Away pada Laga #${item.bracket_position} berhasil ditukar!`,
            });
            return {
                ...prev,
                [activeTab]: {
                    ...(prev[activeTab] || {}),
                    [bracketName]: list,
                },
            };
        });
    };

    const toggleRowBye = (bracketName, rowIdx) => {
        setFormData(prev => {
            const list = [...(prev[activeTab]?.[bracketName] || [])];
            if (!list[rowIdx]) return prev;
            const item = { ...list[rowIdx] };
            item.away_source = item.away_source === 'bye' ? 'wildcard_1' : 'bye';
            list[rowIdx] = item;
            return {
                ...prev,
                [activeTab]: {
                    ...(prev[activeTab] || {}),
                    [bracketName]: list,
                },
            };
        });
    };

    // Helper: generate standar Juara & Runner-up untuk 1 s/d 16 pool (identik dengan logic backend)
    const getStandardPresetStages = (poolCount) => {
        if (poolCount <= 1) return [];

        const make = (stage, pos, home, away) => ({
            bracket_stage: stage,
            bracket_position: pos,
            home_source: home,
            away_source: away,
        });

        if (poolCount === 2) {
            return [
                make('semifinal', 1, 'pool_A_rank_1', 'pool_B_rank_2'),
                make('semifinal', 2, 'pool_B_rank_1', 'pool_A_rank_2'),
                make('final', 1, 'winner_sf_1', 'winner_sf_2'),
            ];
        }

        if (poolCount === 3) {
            return [
                make('round_of_8', 1, 'pool_A_rank_1', 'bye'),
                make('round_of_8', 2, 'pool_C_rank_1', 'pool_B_rank_2'),
                make('round_of_8', 3, 'pool_B_rank_1', 'bye'),
                make('round_of_8', 4, 'pool_A_rank_2', 'pool_C_rank_2'),
                make('semifinal', 1, 'winner_qf_1', 'winner_qf_2'),
                make('semifinal', 2, 'winner_qf_3', 'winner_qf_4'),
                make('final', 1, 'winner_sf_1', 'winner_sf_2'),
            ];
        }

        if (poolCount === 4) {
            return [
                make('round_of_8', 1, 'pool_A_rank_1', 'pool_B_rank_2'),
                make('round_of_8', 2, 'pool_C_rank_1', 'pool_D_rank_2'),
                make('round_of_8', 3, 'pool_B_rank_1', 'pool_A_rank_2'),
                make('round_of_8', 4, 'pool_D_rank_1', 'pool_C_rank_2'),
                make('semifinal', 1, 'winner_qf_1', 'winner_qf_2'),
                make('semifinal', 2, 'winner_qf_3', 'winner_qf_4'),
                make('final', 1, 'winner_sf_1', 'winner_sf_2'),
            ];
        }

        if (poolCount === 5) {
            return [
                make('round_of_16', 1, 'pool_A_rank_1', 'bye'),
                make('round_of_16', 2, 'pool_C_rank_1', 'pool_D_rank_2'),
                make('round_of_16', 3, 'pool_E_rank_1', 'bye'),
                make('round_of_16', 4, 'pool_B_rank_2', 'bye'),
                make('round_of_16', 5, 'pool_B_rank_1', 'bye'),
                make('round_of_16', 6, 'pool_D_rank_1', 'pool_C_rank_2'),
                make('round_of_16', 7, 'pool_A_rank_2', 'bye'),
                make('round_of_16', 8, 'pool_E_rank_2', 'bye'),
                make('round_of_8', 1, 'winner_r16_1', 'winner_r16_2'),
                make('round_of_8', 2, 'winner_r16_3', 'winner_r16_4'),
                make('round_of_8', 3, 'winner_r16_5', 'winner_r16_6'),
                make('round_of_8', 4, 'winner_r16_7', 'winner_r16_8'),
                make('semifinal', 1, 'winner_qf_1', 'winner_qf_2'),
                make('semifinal', 2, 'winner_qf_3', 'winner_qf_4'),
                make('final', 1, 'winner_sf_1', 'winner_sf_2'),
            ];
        }

        if (poolCount === 6) {
            return [
                make('round_of_16', 1, 'pool_A_rank_1', 'bye'),
                make('round_of_16', 2, 'pool_E_rank_1', 'pool_F_rank_2'),
                make('round_of_16', 3, 'pool_C_rank_1', 'bye'),
                make('round_of_16', 4, 'pool_B_rank_2', 'pool_D_rank_2'),
                make('round_of_16', 5, 'pool_B_rank_1', 'bye'),
                make('round_of_16', 6, 'pool_F_rank_1', 'pool_E_rank_2'),
                make('round_of_16', 7, 'pool_D_rank_1', 'bye'),
                make('round_of_16', 8, 'pool_A_rank_2', 'pool_C_rank_2'),
                make('round_of_8', 1, 'winner_r16_1', 'winner_r16_2'),
                make('round_of_8', 2, 'winner_r16_3', 'winner_r16_4'),
                make('round_of_8', 3, 'winner_r16_5', 'winner_r16_6'),
                make('round_of_8', 4, 'winner_r16_7', 'winner_r16_8'),
                make('semifinal', 1, 'winner_qf_1', 'winner_qf_2'),
                make('semifinal', 2, 'winner_qf_3', 'winner_qf_4'),
                make('final', 1, 'winner_sf_1', 'winner_sf_2'),
            ];
        }

        if (poolCount === 7) {
            return [
                make('round_of_16', 1, 'pool_A_rank_1', 'bye'),
                make('round_of_16', 2, 'pool_C_rank_1', 'pool_D_rank_2'),
                make('round_of_16', 3, 'pool_E_rank_1', 'pool_F_rank_2'),
                make('round_of_16', 4, 'pool_G_rank_1', 'pool_B_rank_2'),
                make('round_of_16', 5, 'pool_B_rank_1', 'bye'),
                make('round_of_16', 6, 'pool_D_rank_1', 'pool_C_rank_2'),
                make('round_of_16', 7, 'pool_F_rank_1', 'pool_E_rank_2'),
                make('round_of_16', 8, 'pool_A_rank_2', 'pool_G_rank_2'),
                make('round_of_8', 1, 'winner_r16_1', 'winner_r16_2'),
                make('round_of_8', 2, 'winner_r16_3', 'winner_r16_4'),
                make('round_of_8', 3, 'winner_r16_5', 'winner_r16_6'),
                make('round_of_8', 4, 'winner_r16_7', 'winner_r16_8'),
                make('semifinal', 1, 'winner_qf_1', 'winner_qf_2'),
                make('semifinal', 2, 'winner_qf_3', 'winner_qf_4'),
                make('final', 1, 'winner_sf_1', 'winner_sf_2'),
            ];
        }

        if (poolCount === 8) {
            return [
                make('round_of_16', 1, 'pool_A_rank_1', 'pool_B_rank_2'),
                make('round_of_16', 2, 'pool_C_rank_1', 'pool_D_rank_2'),
                make('round_of_16', 3, 'pool_E_rank_1', 'pool_F_rank_2'),
                make('round_of_16', 4, 'pool_G_rank_1', 'pool_H_rank_2'),
                make('round_of_16', 5, 'pool_B_rank_1', 'pool_A_rank_2'),
                make('round_of_16', 6, 'pool_D_rank_1', 'pool_C_rank_2'),
                make('round_of_16', 7, 'pool_F_rank_1', 'pool_E_rank_2'),
                make('round_of_16', 8, 'pool_H_rank_1', 'pool_G_rank_2'),
                make('round_of_8', 1, 'winner_r16_1', 'winner_r16_2'),
                make('round_of_8', 2, 'winner_r16_3', 'winner_r16_4'),
                make('round_of_8', 3, 'winner_r16_5', 'winner_r16_6'),
                make('round_of_8', 4, 'winner_r16_7', 'winner_r16_8'),
                make('semifinal', 1, 'winner_qf_1', 'winner_qf_2'),
                make('semifinal', 2, 'winner_qf_3', 'winner_qf_4'),
                make('final', 1, 'winner_sf_1', 'winner_sf_2'),
            ];
        }

        // 9 s/d 16 pool (32 Besar dengan 32 - 2*poolCount BYE)
        const totalTeams = poolCount * 2;
        const byeCount = Math.max(0, 32 - totalTeams);
        const byePositions = [1, 9, 5, 13, 3, 11, 7, 15, 2, 10, 6, 14, 4, 12, 8, 16];
        const slotsWithBye = byePositions.slice(0, byeCount);
        const pools = Array.from({ length: poolCount }, (_, i) => String.fromCharCode(65 + i));

        const stages = [];
        for (let pos = 1; pos <= 16; pos++) {
            const poolIdx = (pos - 1) % poolCount;
            const pLetter = pools[poolIdx];
            const oppIdx = (poolIdx + 1) % poolCount;
            const oppLetter = pools[oppIdx];

            const home = `pool_${pLetter}_rank_1`;
            const away = slotsWithBye.includes(pos) ? 'bye' : `pool_${oppLetter}_rank_2`;
            stages.push(make('round_of_32', pos, home, away));
        }

        for (let p = 1; p <= 8; p++) {
            const h = (p * 2) - 1;
            const a = p * 2;
            stages.push(make('round_of_16', p, `winner_r32_${h}`, `winner_r32_${a}`));
        }

        stages.push(make('round_of_8', 1, 'winner_r16_1', 'winner_r16_2'));
        stages.push(make('round_of_8', 2, 'winner_r16_3', 'winner_r16_4'));
        stages.push(make('round_of_8', 3, 'winner_r16_5', 'winner_r16_6'));
        stages.push(make('round_of_8', 4, 'winner_r16_7', 'winner_r16_8'));

        stages.push(make('semifinal', 1, 'winner_qf_1', 'winner_qf_2'));
        stages.push(make('semifinal', 2, 'winner_qf_3', 'winner_qf_4'));

        stages.push(make('final', 1, 'winner_sf_1', 'winner_sf_2'));

        return stages;
    };

    // Helper: terapkan preset ke braket tertentu
    const applyBracketPreset = (bracketName, poolCount, presetType) => {
        let newStages = [];

        if (presetType === 'empty') {
            newStages = [];
        } else if (presetType === 'standard' || presetType === 'default') {
            newStages = getStandardPresetStages(poolCount);
        } else if (presetType === '2pool_direct_final') {
            newStages = [
                { bracket_stage: 'final', bracket_position: 1, home_source: 'pool_A_rank_1', away_source: 'pool_B_rank_1' },
            ];
        } else if (presetType === '3pool_semifinal') {
            newStages = [
                { bracket_stage: 'semifinal', bracket_position: 1, home_source: 'pool_A_rank_1', away_source: 'pool_B_rank_1' },
                { bracket_stage: 'semifinal', bracket_position: 2, home_source: 'pool_C_rank_1', away_source: 'best_runner_up' },
                { bracket_stage: 'final', bracket_position: 1, home_source: 'winner_sf_1', away_source: 'winner_sf_2' },
            ];
        } else if (presetType === '8pool_qf') {
            newStages = [
                { bracket_stage: 'round_of_8', bracket_position: 1, home_source: 'pool_A_rank_1', away_source: 'pool_B_rank_1' },
                { bracket_stage: 'round_of_8', bracket_position: 2, home_source: 'pool_C_rank_1', away_source: 'pool_D_rank_1' },
                { bracket_stage: 'round_of_8', bracket_position: 3, home_source: 'pool_E_rank_1', away_source: 'pool_F_rank_1' },
                { bracket_stage: 'round_of_8', bracket_position: 4, home_source: 'pool_G_rank_1', away_source: 'pool_H_rank_1' },
                { bracket_stage: 'semifinal', bracket_position: 1, home_source: 'winner_qf_1', away_source: 'winner_qf_2' },
                { bracket_stage: 'semifinal', bracket_position: 2, home_source: 'winner_qf_3', away_source: 'winner_qf_4' },
                { bracket_stage: 'final', bracket_position: 1, home_source: 'winner_sf_1', away_source: 'winner_sf_2' },
            ];
        } else if (presetType === 'multi_r16_juara') {
            const letters = Array.from({ length: Math.min(poolCount, 16) }, (_, i) => String.fromCharCode(65 + i));
            const byeCount = Math.max(0, 16 - poolCount);
            const byePriorityPositions = [1, 5, 3, 7, 2, 6, 4, 8];
            const slotsWithBye = byePriorityPositions.slice(0, byeCount);

            let poolIdx = 0;
            for (let pos = 1; pos <= 8; pos++) {
                const home = poolIdx < letters.length ? `pool_${letters[poolIdx++]}_rank_1` : 'wildcard_1';
                let away;
                if (slotsWithBye.includes(pos)) {
                    away = 'bye';
                } else {
                    away = poolIdx < letters.length ? `pool_${letters[poolIdx++]}_rank_1` : 'wildcard_2';
                }
                newStages.push({ bracket_stage: 'round_of_16', bracket_position: pos, home_source: home, away_source: away });
            }
            newStages.push({ bracket_stage: 'round_of_8', bracket_position: 1, home_source: 'winner_r16_1', away_source: 'winner_r16_2' });
            newStages.push({ bracket_stage: 'round_of_8', bracket_position: 2, home_source: 'winner_r16_3', away_source: 'winner_r16_4' });
            newStages.push({ bracket_stage: 'round_of_8', bracket_position: 3, home_source: 'winner_r16_5', away_source: 'winner_r16_6' });
            newStages.push({ bracket_stage: 'round_of_8', bracket_position: 4, home_source: 'winner_r16_7', away_source: 'winner_r16_8' });
            newStages.push({ bracket_stage: 'semifinal', bracket_position: 1, home_source: 'winner_qf_1', away_source: 'winner_qf_2' });
            newStages.push({ bracket_stage: 'semifinal', bracket_position: 2, home_source: 'winner_qf_3', away_source: 'winner_qf_4' });
            newStages.push({ bracket_stage: 'final', bracket_position: 1, home_source: 'winner_sf_1', away_source: 'winner_sf_2' });
        } else {
            newStages = getStandardPresetStages(poolCount);
        }

        setFormData(prev => ({
            ...prev,
            [activeTab]: {
                ...(prev[activeTab] || {}),
                [bracketName]: newStages,
            },
        }));
    };

    // Sumber dropdown per braket (Hanya untuk babak awal: Juara Pool, Runner-up Pool, dan BYE)
    const getBracketSourceOptions = (bracket) => {
        const options = [];
        const pools = bracket.pools || [];

        if (pools.length > 0) {
            pools.forEach(p => {
                options.push({ value: `pool_${p.name}_rank_1`, label: `🥇 Juara Pool ${p.name}` });
                options.push({ value: `pool_${p.name}_rank_2`, label: `🥈 Runner-up Pool ${p.name}` });
            });
        } else {
            const count = bracket.pool_count || 2;
            const letters = Array.from({ length: Math.max(1, Math.min(count, 16)) }, (_, i) => String.fromCharCode(65 + i));
            letters.forEach(p => {
                options.push({ value: `pool_${p}_rank_1`, label: `🥇 Juara Pool ${p}` });
                options.push({ value: `pool_${p}_rank_2`, label: `🥈 Runner-up Pool ${p}` });
            });
        }

        // Special: BYE & Wildcard untuk Babak Awal
        options.push({ value: 'bye', label: '⬛ BYE (Langsung Lolos Otomatis)' });
        options.push({ value: 'wildcard_1', label: '🃏 Wildcard #1' });
        options.push({ value: 'wildcard_2', label: '🃏 Wildcard #2' });

        return options;
    };

    const handleSave = () => {
        setSaving(true);
        const allMatrices = [];

        Object.entries(formData).forEach(([modeKey, bracketMap]) => {
            Object.entries(bracketMap || {}).forEach(([bracketName, stages]) => {
                (stages || []).forEach((s, idx) => {
                    allMatrices.push({
                        match_mode:       modeKey,
                        bracket_name:     bracketName,
                        bracket_stage:    s.bracket_stage,
                        bracket_position: Number(s.bracket_position || (idx + 1)),
                        home_source:      s.home_source,
                        away_source:      s.away_source,
                    });
                });
            });
        });

        router.post(
            route('tournaments.master-schedule.bracket-matrix.store', tournament.id),
            { matrices: allMatrices },
            {
                onSuccess: () => {
                    setFlash({ type: 'success', msg: 'Konfigurasi Bracket Matrix berhasil disimpan!' });
                    setSaving(false);
                },
                onError: () => {
                    setFlash({ type: 'error', msg: 'Gagal menyimpan Bracket Matrix. Periksa kembali form.' });
                    setSaving(false);
                },
            }
        );
    };

    return (
        <AuthenticatedLayout header={
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link
                        href={route('tournaments.master-schedule.config', tournament.id)}
                        className="text-surface-400 hover:text-surface-200 text-sm font-semibold transition-colors"
                    >
                        ← Konfigurasi
                    </Link>
                    <span className="text-surface-600">/</span>
                    <h2 className="text-lg font-bold text-surface-100 flex items-center gap-2">
                        <span>⚔️</span>
                        <span>Konfigurasi Bracket Matrix Per Braket</span>
                        <span className="text-surface-400 font-normal text-sm">({tournament.name})</span>
                    </h2>
                </div>
                <Link
                    href={route('pools.index', tournament.id)}
                    target="_blank"
                    className="px-3 py-1.5 rounded-xl bg-surface-800 hover:bg-surface-700 border border-surface-700 text-xs font-bold text-primary-300 flex items-center gap-1.5 transition-colors"
                >
                    <span>⚙️ Atur Bagan & Pool</span>
                    <span>↗</span>
                </Link>
            </div>
        }>
            <Head title={`Bracket Matrix — ${tournament.name}`} />

            <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-6">
                {flash && (
                    <div className={`p-4 rounded-2xl text-sm font-bold border flex items-center gap-2 animate-fade-in ${
                        flash.type === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                            : 'bg-red-500/10 border-red-500/20 text-red-300'
                    }`}>
                        <span>{flash.type === 'success' ? '✅' : '⚠️'}</span>
                        <span>{flash.msg}</span>
                    </div>
                )}

                {/* Banner Panduan */}
                <div className="rounded-3xl border border-surface-700/60 bg-surface-900/90 backdrop-blur-md p-6 shadow-xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h3 className="text-base font-bold text-surface-100 flex items-center gap-2">
                                <span>🧭</span>
                                <span>Alur Pembacaan Sistem: Mode ➔ Braket ➔ Jumlah Pool ➔ Custom Babak Gugur</span>
                            </h3>
                            <p className="text-xs text-surface-400 mt-1 leading-relaxed max-w-3xl">
                                Setiap mode membaca braket dan pool yang ada. Jika suatu braket <strong>1 Pool</strong>, maka otomatis <strong>tidak ada babak gugur</strong> (juara dari klasemen). Jika <strong>2 Pool</strong> ada Semifinal/Final, dan jika <strong>3 Pool</strong> ada sistem BYE/Wildcard.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Switcher Tampilan (Bagan Visual & Tabel Konfigurasi) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-900/90 border border-surface-800/80 p-3.5 rounded-2xl shadow-md">
                    <div className="flex items-center gap-2">
                        <span className="text-sm">👁️</span>
                        <div>
                            <div className="text-xs font-bold text-surface-200">Mode Tampilan Bagan</div>
                            <div className="text-[11px] text-surface-400">Pilih tampilan diagram visual pohon braket, tabel konfigurasi, atau keduanya</div>
                        </div>
                    </div>
                    <div className="flex items-center bg-surface-950 p-1 rounded-xl border border-surface-800 gap-1 self-start sm:self-auto">
                        <button
                            type="button"
                            onClick={() => setViewMode('both')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                viewMode === 'both' ? 'bg-primary-600 text-white shadow' : 'text-surface-400 hover:text-surface-200'
                            }`}
                        >
                            <span>⚡</span>
                            <span>Bagan & Tabel</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('visual')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                viewMode === 'visual' ? 'bg-primary-600 text-white shadow' : 'text-surface-400 hover:text-surface-200'
                            }`}
                        >
                            <span>🌳</span>
                            <span>Bagan Visual Saja</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                viewMode === 'table' ? 'bg-primary-600 text-white shadow' : 'text-surface-400 hover:text-surface-200'
                            }`}
                        >
                            <span>📋</span>
                            <span>Tabel Saja</span>
                        </button>
                    </div>
                </div>

                {/* Mode Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {activeModes.map(mode => {
                        const mKey = mode.match_mode;
                        const cfg = MODE_LABELS[mKey] || { label: mKey, icon: '🏆', color: 'from-gray-600 to-gray-800', border: 'border-surface-700', badge: 'bg-surface-800 text-surface-300' };
                        const bList = modeBrackets[mKey] || [];
                        const totalPools = bList.reduce((acc, b) => acc + (b.pool_count || 0), 0);
                        const isCurrent = activeTab === mKey;

                        return (
                            <button
                                key={mKey}
                                type="button"
                                onClick={() => setActiveTab(mKey)}
                                className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl font-bold text-xs transition-all whitespace-nowrap border-2 ${
                                    isCurrent
                                        ? `bg-gradient-to-r ${cfg.color} text-white shadow-lg ring-1 ring-white/20 border-white/30 scale-[1.02]`
                                        : 'bg-surface-900/80 border-surface-800 text-surface-400 hover:text-surface-200 hover:border-surface-700'
                                }`}
                            >
                                <span className="text-lg">{cfg.icon}</span>
                                <span>{cfg.label}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${cfg.badge}`}>
                                    {bList.length} Braket ({totalPools} Pool)
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* List Braket Cards di dalam Mode Aktif */}
                <div className="space-y-6">
                    {activeBrackets.map((b, bIdx) => {
                        const bracketRows = formData[activeTab]?.[b.bracket_name] || [];
                        const sourceOptions = getBracketSourceOptions(b);

                        const initialStage = bracketRows.length > 0
                            ? bracketRows.reduce((earliest, r) => {
                                if (!earliest) return r.bracket_stage;
                                const oCurr = STAGE_ORDER_MAP[r.bracket_stage] || 99;
                                const oEarl = STAGE_ORDER_MAP[earliest] || 99;
                                return oCurr < oEarl ? r.bracket_stage : earliest;
                            }, null)
                            : null;

                        const initialStageMeta = STAGE_LABELS_MAP[initialStage] || { label: 'Babak Awal', icon: '⚔️', badge: 'bg-surface-800 text-surface-300' };

                        const initialRowsWithIdx = bracketRows
                            .map((row, rIdx) => ({ row, rIdx }))
                            .filter(({ row }) => row.bracket_stage === initialStage);

                        const subsequentRowsWithIdx = bracketRows
                            .map((row, rIdx) => ({ row, rIdx }))
                            .filter(({ row }) => row.bracket_stage !== initialStage);

                        return (
                            <div
                                key={b.bracket_name || bIdx}
                                className="rounded-3xl border border-surface-700/60 bg-surface-900/90 backdrop-blur-md p-6 sm:p-7 space-y-5 shadow-xl transition-all"
                            >
                                {/* Header Braket */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-surface-800">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2.5 flex-wrap">
                                            <span className="text-lg">🏷️</span>
                                            {editingBracket === b.bracket_name ? (
                                                <form onSubmit={handleRenameSubmit} className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={editBracketName}
                                                        onChange={(e) => setEditBracketName(e.target.value)}
                                                        className="px-2.5 py-1 rounded-lg bg-surface-950 border border-primary-500 text-surface-100 text-xs font-bold focus:ring-1 focus:ring-primary-400"
                                                        placeholder="Nama braket baru..."
                                                        autoFocus
                                                        required
                                                    />
                                                    <button
                                                        type="submit"
                                                        disabled={isRenaming || !editBracketName.trim()}
                                                        className="px-2.5 py-1 rounded-lg bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer"
                                                    >
                                                        {isRenaming ? '...' : 'Simpan'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingBracket(null)}
                                                        className="px-2 py-1 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-300 text-xs transition-colors cursor-pointer"
                                                    >
                                                        Batal
                                                    </button>
                                                </form>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-base font-bold text-surface-100">
                                                        {b.bracket_name}
                                                    </h3>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setEditingBracket(b.bracket_name); setEditBracketName(b.bracket_name); }}
                                                        className="px-2 py-0.5 rounded-lg bg-surface-800 hover:bg-surface-700 border border-surface-700 text-surface-300 hover:text-surface-100 text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                                                        title="Ubah Nama Braket"
                                                    >
                                                        <span>✏️</span>
                                                        <span>Ubah Nama</span>
                                                    </button>
                                                </div>
                                            )}
                                            <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-surface-800 text-primary-300 border border-surface-700">
                                                {b.pool_count} Pool
                                            </span>
                                            {b.is_single_pool ? (
                                                <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    🏆 1 Pool (Round Robin Murni)
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                    ⚔️ Babak Gugur / Playoff
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 text-xs text-surface-400">
                                            <span>Daftar Pool:</span>
                                            {(b.pools || []).map(p => (
                                                <span key={p.id} className="px-2 py-0.5 rounded bg-surface-950 text-surface-300 border border-surface-800 font-medium">
                                                    Pool {p.name} ({p.teams_count} Tim)
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Preset Cepat Khusus Braket Ini (Mendukung 1 s/d 16 Pool) */}
                                    {!b.is_single_pool && (
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[11px] font-bold text-surface-400 uppercase">Preset:</span>
                                            {b.pool_count === 2 && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => applyBracketPreset(b.bracket_name, 2, 'standard')}
                                                        className="px-2.5 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-semibold transition-colors cursor-pointer"
                                                    >
                                                        ⚔️ Semifinal Silang (2 Juara + 2 Runner-up) + Final
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => applyBracketPreset(b.bracket_name, 2, '2pool_direct_final')}
                                                        className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-colors cursor-pointer"
                                                    >
                                                        🥇 Grand Final Langsung (Juara A vs B)
                                                    </button>
                                                </>
                                            )}

                                            {b.pool_count === 3 && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => applyBracketPreset(b.bracket_name, 3, 'standard')}
                                                        className="px-2.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold transition-colors cursor-pointer"
                                                    >
                                                        🥊 8 Besar (4 Kotak: 3 Juara + 3 Runner-up, 2 BYE) + SF + Final
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => applyBracketPreset(b.bracket_name, 3, '3pool_semifinal')}
                                                        className="px-2.5 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-semibold transition-colors cursor-pointer"
                                                    >
                                                        ⚔️ Semifinal (3 Juara + 1 Runner-up Terbaik)
                                                    </button>
                                                </>
                                            )}

                                            {b.pool_count === 4 && (
                                                <button
                                                    type="button"
                                                    onClick={() => applyBracketPreset(b.bracket_name, 4, 'standard')}
                                                    className="px-2.5 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-semibold transition-colors cursor-pointer"
                                                >
                                                    🥊 8 Besar Silang (4 Kotak: 4 Juara + 4 Runner-up) + SF + Final
                                                </button>
                                            )}

                                            {b.pool_count === 5 && (
                                                <button
                                                    type="button"
                                                    onClick={() => applyBracketPreset(b.bracket_name, 5, 'standard')}
                                                    className="px-2.5 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-colors cursor-pointer"
                                                >
                                                    🛡️ 16 Besar (8 Kotak: 5 Juara + 5 Runner-up, 6 BYE) + 8 Besar + SF + Final
                                                </button>
                                            )}

                                            {b.pool_count === 6 && (
                                                <button
                                                    type="button"
                                                    onClick={() => applyBracketPreset(b.bracket_name, 6, 'standard')}
                                                    className="px-2.5 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-colors cursor-pointer"
                                                >
                                                    🛡️ 16 Besar (8 Kotak: 6 Juara + 6 Runner-up, 4 BYE) + 8 Besar + SF + Final
                                                </button>
                                            )}

                                            {b.pool_count === 7 && (
                                                <button
                                                    type="button"
                                                    onClick={() => applyBracketPreset(b.bracket_name, 7, 'standard')}
                                                    className="px-2.5 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-colors cursor-pointer"
                                                >
                                                    🛡️ 16 Besar (8 Kotak: 7 Juara + 7 Runner-up, 2 BYE) + 8 Besar + SF + Final
                                                </button>
                                            )}

                                            {b.pool_count === 8 && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => applyBracketPreset(b.bracket_name, 8, 'standard')}
                                                        className="px-2.5 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-colors cursor-pointer"
                                                    >
                                                        🛡️ 16 Besar (8 Kotak: 8 Juara + 8 Runner-up Murni) + 8 Besar + SF + Final
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => applyBracketPreset(b.bracket_name, 8, '8pool_qf')}
                                                        className="px-2.5 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-semibold transition-colors cursor-pointer"
                                                    >
                                                        🥊 8 Besar (Hanya 8 Juara Pool)
                                                    </button>
                                                </>
                                            )}

                                            {b.pool_count >= 9 && b.pool_count <= 16 && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => applyBracketPreset(b.bracket_name, b.pool_count, 'standard')}
                                                        className="px-2.5 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-colors cursor-pointer"
                                                    >
                                                        🌐 32 Besar (16 Kotak: {b.pool_count} Juara + {b.pool_count} Runner-up, {32 - b.pool_count * 2} BYE) + 16B + 8B + SF + Final
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => applyBracketPreset(b.bracket_name, b.pool_count, 'multi_r16_juara')}
                                                        className="px-2.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold transition-colors cursor-pointer"
                                                    >
                                                        🛡️ 16 Besar (Hanya Juara Pool {b.pool_count < 16 ? `+ ${16 - b.pool_count} BYE` : 'Murni'})
                                                    </button>
                                                </>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => applyBracketPreset(b.bracket_name, b.pool_count, 'empty')}
                                                className="px-2.5 py-1.5 rounded-xl bg-surface-800 hover:bg-surface-700 border border-surface-700 text-surface-400 text-xs font-semibold transition-colors cursor-pointer"
                                            >
                                                Kosongkan
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Body Braket: 1 Pool vs Multi Pool */}
                                {b.is_single_pool ? (
                                    <div className="p-6 text-center bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-2">
                                        <div className="text-3xl">🏆</div>
                                        <h4 className="font-bold text-emerald-300 text-sm">
                                            Format 1 Pool (Full Round Robin — Tanpa Babak Gugur)
                                        </h4>
                                        <p className="text-surface-300 text-xs max-w-xl mx-auto leading-relaxed">
                                            Braket <strong>"{b.bracket_name}"</strong> hanya terdiri dari 1 Pool. Seluruh tim saling bertanding setengah kompetisi di babak pool. <strong>Pemenang dan Juara 1, 2, 3 ditentukan langsung berdasarkan perolehan poin klasemen tertinggi akhir pool</strong> tanpa ada babak gugur lanjutan.
                                        </p>
                                        <div className="pt-1">
                                            <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold border border-emerald-500/20">
                                                ✨ Otomatis Tanpa Pertandingan Gugur
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Banner Mode Tukar Posisi Aktif */}
                                        {swapPendingSlot && swapPendingSlot.bracketName === b.bracket_name && (
                                            <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 flex items-center justify-between gap-3 animate-fade-in shadow-lg">
                                                <div className="flex items-center gap-2.5 text-xs font-bold">
                                                    <span className="text-xl animate-bounce">⚡</span>
                                                    <div>
                                                        <span>Mode Tukar Posisi: </span>
                                                        <span className="text-white font-extrabold underline">
                                                            {formatSourceToHuman(swapPendingSlot.source)}
                                                        </span>
                                                        <span className="text-surface-300 ml-1">
                                                            (Laga #{swapPendingSlot.pos} {swapPendingSlot.field === 'home_source' ? 'Home' : 'Away'})
                                                        </span>
                                                        <p className="text-[11px] text-amber-300/80 font-normal mt-0.5">
                                                            👉 Klik tombol <strong>"⇄ Tukar"</strong> pada tabel atau klik kartu tim pada diagram visual di bawah untuk menukar posisinya!
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSwapPendingSlot(null);
                                                        setFlash({ type: 'info', msg: 'Mode penukaran posisi dibatalkan.' });
                                                    }}
                                                    className="px-3 py-1.5 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-200 border border-surface-600 text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                                                >
                                                    ✕ Batal
                                                </button>
                                            </div>
                                        )}

                                        {/* Diagram Visual Pohon Bagan */}
                                        {viewMode !== 'table' && bracketRows.length > 0 && (
                                            <div className="pt-1 pb-2">
                                                <VisualBracketTree
                                                    bracketName={b.bracket_name}
                                                    poolCount={b.pool_count}
                                                    isSinglePool={b.is_single_pool}
                                                    stages={bracketRows}
                                                    swapPendingSlot={swapPendingSlot?.bracketName === b.bracket_name ? swapPendingSlot : null}
                                                    onSelectSlot={(m, field) => {
                                                        const rowIdx = bracketRows.findIndex(
                                                            r => r.bracket_stage === m.bracket_stage && r.bracket_position === m.bracket_position
                                                        );
                                                        if (rowIdx !== -1) {
                                                            handleSlotClickForSwap(b.bracket_name, rowIdx, field, m[field], m.bracket_stage, m.bracket_position);
                                                        }
                                                    }}
                                                />
                                            </div>
                                        )}

                                        {/* Tabel Konfigurasi Detail */}
                                        {viewMode !== 'visual' && (
                                            <div>
                                                {bracketRows.length === 0 ? (
                                                    <div className="p-6 text-center bg-surface-950/70 rounded-2xl border border-dashed border-surface-800 space-y-2.5">
                                                        <div className="text-3xl">🥊</div>
                                                        <p className="text-surface-300 text-xs font-semibold">
                                                            Belum ada jadwal babak gugur untuk braket "{b.bracket_name}".
                                                        </p>
                                                        <p className="text-surface-400 text-xs max-w-md mx-auto">
                                                            Pilih preset cepat di atas atau klik tombol di bawah untuk menyusun babak gugur.
                                                        </p>
                                                        <div className="pt-1 flex justify-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => addBracketRow(b.bracket_name, 'final')}
                                                                className="px-3.5 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                                                            >
                                                                ➕ Tambah Laga Babak Gugur
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-6">
                                                        {/* TABEL 1: BABAK AWAL (Pemilihan Juara, Runner-up & BYE dengan Auto-Swap) */}
                                                        <div className="space-y-3">
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-surface-800/80">
                                                                <div className="flex items-center gap-2.5 flex-wrap">
                                                                    <span className="font-extrabold text-surface-100 text-xs sm:text-sm flex items-center gap-1.5">
                                                                        <span>🎯</span>
                                                                        <span>Babak Awal: {initialStageMeta.label}</span>
                                                                    </span>
                                                                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${initialStageMeta.badge}`}>
                                                                        {initialRowsWithIdx.length} Pertandingan
                                                                    </span>
                                                                    <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                                                                        <span>⚡</span> Sistem Auto-Swap Aktif
                                                                    </span>
                                                                </div>
                                                                <span className="text-[11px] text-surface-400">
                                                                    Pilih posisi Juara & Runner-up pool serta BYE. Memilih tim yang sudah terpasang otomatis menukar (swipe) posisi.
                                                                </span>
                                                            </div>

                                                            <div className="overflow-x-auto rounded-2xl border border-surface-800 bg-surface-950/50 shadow-inner">
                                                                <table className="w-full text-left text-xs border-collapse">
                                                                    <thead>
                                                                        <tr className="border-b border-surface-800 bg-surface-900/80 text-surface-400 uppercase tracking-wider text-[10.5px]">
                                                                            <th className="py-2.5 px-3 w-16 text-center">Posisi</th>
                                                                            <th className="py-2.5 px-3">Tim Home (Sudut Merah)</th>
                                                                            <th className="py-2.5 px-2 w-8 text-center">vs</th>
                                                                            <th className="py-2.5 px-3">Tim Away (Sudut Biru)</th>
                                                                            <th className="py-2.5 px-3 w-56 text-center">Aksi Cepat</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-surface-800/60">
                                                                        {initialRowsWithIdx.map(({ row, rIdx }) => {
                                                                            const isBye = row.home_source === 'bye' || row.away_source === 'bye';
                                                                            return (
                                                                                <tr key={rIdx} className={`hover:bg-surface-900/50 transition-colors ${isBye ? 'bg-indigo-950/15' : ''}`}>
                                                                                    {/* Posisi */}
                                                                                    <td className="py-2.5 px-3 text-center">
                                                                                        <span className="inline-block px-2 py-1 rounded-lg bg-surface-800 text-surface-200 font-mono font-bold text-xs border border-surface-700 shadow-sm">
                                                                                            #{row.bracket_position}
                                                                                        </span>
                                                                                    </td>

                                                                                    {/* Tim Home */}
                                                                                    <td className="py-2.5 px-3">
                                                                                        <div className="flex items-center gap-1.5">
                                                                                            <select
                                                                                                value={row.home_source}
                                                                                                onChange={e => updateBracketRow(b.bracket_name, rIdx, 'home_source', e.target.value)}
                                                                                                className={`w-full rounded-xl bg-surface-950 border px-3 py-1.5 text-xs font-semibold text-surface-200 focus:border-primary-500 transition-all ${
                                                                                                    swapPendingSlot?.bracketName === b.bracket_name &&
                                                                                                    swapPendingSlot?.rowIdx === rIdx &&
                                                                                                    swapPendingSlot?.field === 'home_source'
                                                                                                        ? 'border-amber-400 ring-2 ring-amber-400/50 bg-amber-500/15 text-amber-200'
                                                                                                        : 'border-surface-700'
                                                                                                }`}
                                                                                            >
                                                                                                {sourceOptions.map(opt => (
                                                                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                                                                ))}
                                                                                            </select>
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => handleSlotClickForSwap(b.bracket_name, rIdx, 'home_source', row.home_source, row.bracket_stage, row.bracket_position)}
                                                                                                className={`px-2 py-1.5 rounded-lg border text-xs font-bold shrink-0 transition-all cursor-pointer ${
                                                                                                    swapPendingSlot?.bracketName === b.bracket_name &&
                                                                                                    swapPendingSlot?.rowIdx === rIdx &&
                                                                                                    swapPendingSlot?.field === 'home_source'
                                                                                                        ? 'bg-amber-500 text-black border-amber-400 shadow-md animate-pulse'
                                                                                                        : swapPendingSlot
                                                                                                        ? 'bg-primary-600/30 hover:bg-primary-600 text-primary-200 border-primary-500/50 hover:text-white'
                                                                                                        : 'bg-surface-800 hover:bg-surface-700 text-surface-400 hover:text-surface-100 border-surface-700'
                                                                                                }`}
                                                                                                title={
                                                                                                    swapPendingSlot?.bracketName === b.bracket_name &&
                                                                                                    swapPendingSlot?.rowIdx === rIdx &&
                                                                                                    swapPendingSlot?.field === 'home_source'
                                                                                                        ? 'Klik untuk batal tukar'
                                                                                                        : swapPendingSlot
                                                                                                        ? `Tukar dengan ${formatSourceToHuman(swapPendingSlot.source)}`
                                                                                                        : 'Klik untuk menukar posisi slot ini'
                                                                                                }
                                                                                            >
                                                                                                {swapPendingSlot?.bracketName === b.bracket_name &&
                                                                                                swapPendingSlot?.rowIdx === rIdx &&
                                                                                                swapPendingSlot?.field === 'home_source' ? (
                                                                                                    '⚡ Terpilih'
                                                                                                ) : swapPendingSlot ? (
                                                                                                    '⇄ Tukar'
                                                                                                ) : (
                                                                                                    '🔀'
                                                                                                )}
                                                                                            </button>
                                                                                        </div>
                                                                                    </td>

                                                                                    {/* vs */}
                                                                                    <td className="py-2.5 px-2 text-center font-bold text-surface-500 text-xs">
                                                                                        vs
                                                                                    </td>

                                                                                    {/* Tim Away */}
                                                                                    <td className="py-2.5 px-3">
                                                                                        <div className="flex items-center gap-1.5">
                                                                                            <select
                                                                                                value={row.away_source}
                                                                                                onChange={e => updateBracketRow(b.bracket_name, rIdx, 'away_source', e.target.value)}
                                                                                                className={`w-full rounded-xl bg-surface-950 border px-3 py-1.5 text-xs font-semibold text-surface-200 focus:border-primary-500 transition-all ${
                                                                                                    swapPendingSlot?.bracketName === b.bracket_name &&
                                                                                                    swapPendingSlot?.rowIdx === rIdx &&
                                                                                                    swapPendingSlot?.field === 'away_source'
                                                                                                        ? 'border-amber-400 ring-2 ring-amber-400/50 bg-amber-500/15 text-amber-200'
                                                                                                        : 'border-surface-700'
                                                                                                }`}
                                                                                            >
                                                                                                {sourceOptions.map(opt => (
                                                                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                                                                ))}
                                                                                            </select>
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => handleSlotClickForSwap(b.bracket_name, rIdx, 'away_source', row.away_source, row.bracket_stage, row.bracket_position)}
                                                                                                className={`px-2 py-1.5 rounded-lg border text-xs font-bold shrink-0 transition-all cursor-pointer ${
                                                                                                    swapPendingSlot?.bracketName === b.bracket_name &&
                                                                                                    swapPendingSlot?.rowIdx === rIdx &&
                                                                                                    swapPendingSlot?.field === 'away_source'
                                                                                                        ? 'bg-amber-500 text-black border-amber-400 shadow-md animate-pulse'
                                                                                                        : swapPendingSlot
                                                                                                        ? 'bg-primary-600/30 hover:bg-primary-600 text-primary-200 border-primary-500/50 hover:text-white'
                                                                                                        : 'bg-surface-800 hover:bg-surface-700 text-surface-400 hover:text-surface-100 border-surface-700'
                                                                                                }`}
                                                                                                title={
                                                                                                    swapPendingSlot?.bracketName === b.bracket_name &&
                                                                                                    swapPendingSlot?.rowIdx === rIdx &&
                                                                                                    swapPendingSlot?.field === 'away_source'
                                                                                                        ? 'Klik untuk batal tukar'
                                                                                                        : swapPendingSlot
                                                                                                        ? `Tukar dengan ${formatSourceToHuman(swapPendingSlot.source)}`
                                                                                                        : 'Klik untuk menukar posisi slot ini'
                                                                                                }
                                                                                            >
                                                                                                {swapPendingSlot?.bracketName === b.bracket_name &&
                                                                                                swapPendingSlot?.rowIdx === rIdx &&
                                                                                                swapPendingSlot?.field === 'away_source' ? (
                                                                                                    '⚡ Terpilih'
                                                                                                ) : swapPendingSlot ? (
                                                                                                    '⇄ Tukar'
                                                                                                ) : (
                                                                                                    '🔀'
                                                                                                )}
                                                                                            </button>
                                                                                        </div>
                                                                                    </td>

                                                                                    {/* Aksi Cepat */}
                                                                                    <td className="py-2.5 px-3 text-center">
                                                                                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => swapRowHomeAway(b.bracket_name, rIdx)}
                                                                                                className="px-2 py-1 rounded-lg bg-surface-800 hover:bg-surface-700 border border-surface-700 text-surface-300 hover:text-white text-[10.5px] font-semibold transition-colors cursor-pointer whitespace-nowrap"
                                                                                                title="Tukar Posisi Tim Home & Away di laga ini"
                                                                                            >
                                                                                                🔁 Home ⇄ Away
                                                                                            </button>

                                                                                            {initialRowsWithIdx.length > 1 && (
                                                                                                <select
                                                                                                    defaultValue=""
                                                                                                    onChange={(e) => {
                                                                                                        const targetPos = parseInt(e.target.value, 10);
                                                                                                        if (!targetPos) return;
                                                                                                        const targetIdx = bracketRows.findIndex(
                                                                                                            r => r.bracket_stage === row.bracket_stage && r.bracket_position === targetPos
                                                                                                        );
                                                                                                        if (targetIdx !== -1) {
                                                                                                            swapEntireMatch(b.bracket_name, rIdx, targetIdx);
                                                                                                        }
                                                                                                        e.target.value = "";
                                                                                                    }}
                                                                                                    className="px-1.5 py-1 rounded-lg bg-surface-800 hover:bg-surface-700 border border-surface-700 text-surface-300 text-[10.5px] font-semibold cursor-pointer max-w-[110px]"
                                                                                                    title="Tukar seluruh laga ini (Home & Away) dengan laga lain di babak awal"
                                                                                                >
                                                                                                    <option value="" disabled>↕️ Tukar Laga...</option>
                                                                                                    {initialRowsWithIdx
                                                                                                        .filter(({ row: r }) => r.bracket_position !== row.bracket_position)
                                                                                                        .map(({ row: r }) => (
                                                                                                            <option key={r.bracket_position} value={r.bracket_position}>
                                                                                                                Laga #{r.bracket_position}
                                                                                                            </option>
                                                                                                        ))}
                                                                                                </select>
                                                                                            )}

                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => toggleRowBye(b.bracket_name, rIdx)}
                                                                                                className={`px-2 py-1 rounded-lg border text-[10.5px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                                                                                                    row.away_source === 'bye'
                                                                                                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-bold'
                                                                                                        : 'bg-surface-800 hover:bg-surface-700 border-surface-700 text-surface-400 hover:text-surface-200'
                                                                                                }`}
                                                                                                title="Pasang atau Batalkan Lawan BYE"
                                                                                            >
                                                                                                {row.away_source === 'bye' ? '⬛ Batal BYE' : '⬛ +BYE'}
                                                                                            </button>
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>

                                                        {/* TABEL 2: ALUR BABAK LANJUTAN (8 Besar s/d Final — Alur Otomatis Tanpa Perlu Memilih) */}
                                                        {subsequentRowsWithIdx.length > 0 && (
                                                            <div className="space-y-3 pt-2">
                                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-surface-800/80">
                                                                    <div className="flex items-center gap-2.5 flex-wrap">
                                                                        <span className="font-extrabold text-surface-100 text-xs sm:text-sm flex items-center gap-1.5">
                                                                            <span>⚡</span>
                                                                            <span>Alur Babak Lanjutan (8 Besar s/d Final)</span>
                                                                        </span>
                                                                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                                                                            {subsequentRowsWithIdx.length} Pertandingan
                                                                        </span>
                                                                        <span className="text-[11px] font-semibold text-surface-400 bg-surface-950 px-2.5 py-0.5 rounded-full border border-surface-800 flex items-center gap-1">
                                                                            <span>🔒</span> Alur Otomatis (Tanpa Perlu Memilih)
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-[11px] text-surface-400">
                                                                        Pemenang babak sebelumnya otomatis lolos mengisi posisi bagan ini sampai partai final.
                                                                    </span>
                                                                </div>

                                                                <div className="overflow-x-auto rounded-2xl border border-surface-800/80 bg-surface-950/40">
                                                                    <table className="w-full text-left text-xs border-collapse">
                                                                        <thead>
                                                                            <tr className="border-b border-surface-800 bg-surface-900/60 text-surface-400 uppercase tracking-wider text-[10.5px]">
                                                                                <th className="py-2.5 px-3 w-44">Babak</th>
                                                                                <th className="py-2.5 px-3 w-16 text-center">Posisi</th>
                                                                                <th className="py-2.5 px-3">Tim Home (Sudut Merah)</th>
                                                                                <th className="py-2.5 px-2 w-8 text-center">vs</th>
                                                                                <th className="py-2.5 px-3">Tim Away (Sudut Biru)</th>
                                                                                <th className="py-2.5 px-3 w-48 text-center">Status Alur</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-surface-800/40">
                                                                            {subsequentRowsWithIdx.map(({ row, rIdx }) => {
                                                                                const stageMeta = STAGE_LABELS_MAP[row.bracket_stage] || { label: row.bracket_stage, icon: '⚔️', badge: 'bg-surface-800 text-surface-300' };
                                                                                return (
                                                                                    <tr key={rIdx} className="hover:bg-surface-900/30 transition-colors">
                                                                                        {/* Babak */}
                                                                                        <td className="py-2.5 px-3">
                                                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-bold text-xs border ${stageMeta.badge}`}>
                                                                                                <span>{stageMeta.icon}</span>
                                                                                                <span>{stageMeta.label}</span>
                                                                                            </span>
                                                                                        </td>

                                                                                        {/* Posisi */}
                                                                                        <td className="py-2.5 px-3 text-center">
                                                                                            <span className="inline-block px-2 py-0.5 rounded-lg bg-surface-800/80 text-surface-300 font-mono font-bold text-xs border border-surface-700/60">
                                                                                                #{row.bracket_position}
                                                                                            </span>
                                                                                        </td>

                                                                                        {/* Home */}
                                                                                        <td className="py-2.5 px-3">
                                                                                            <div className="px-3 py-1.5 rounded-xl bg-surface-950 border border-surface-800 text-surface-200 text-xs font-semibold flex items-center justify-between gap-2 shadow-inner">
                                                                                                <span className="truncate">{formatSourceToHuman(row.home_source)}</span>
                                                                                                <span className="text-[10px] text-emerald-400 font-mono shrink-0">✓ Auto</span>
                                                                                            </div>
                                                                                        </td>

                                                                                        {/* vs */}
                                                                                        <td className="py-2.5 px-2 text-center font-bold text-surface-500 text-xs">
                                                                                            vs
                                                                                        </td>

                                                                                        {/* Away */}
                                                                                        <td className="py-2.5 px-3">
                                                                                            <div className="px-3 py-1.5 rounded-xl bg-surface-950 border border-surface-800 text-surface-200 text-xs font-semibold flex items-center justify-between gap-2 shadow-inner">
                                                                                                <span className="truncate">{formatSourceToHuman(row.away_source)}</span>
                                                                                                <span className="text-[10px] text-emerald-400 font-mono shrink-0">✓ Auto</span>
                                                                                            </div>
                                                                                        </td>

                                                                                        {/* Status Alur */}
                                                                                        <td className="py-2.5 px-3 text-center">
                                                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface-900 text-surface-400 border border-surface-800 text-[11px] font-medium">
                                                                                                <span>🔒</span>
                                                                                                <span>Otomatis dari Bagan</span>
                                                                                            </span>
                                                                                        </td>
                                                                                    </tr>
                                                                                );
                                                                            })}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Bottom Sticky Action Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-surface-800">
                    <Link
                        href={route('tournaments.master-schedule.config', tournament.id)}
                        className="px-5 py-3 rounded-2xl bg-surface-900 hover:bg-surface-800 border border-surface-700 text-surface-300 text-xs font-bold transition-all w-full sm:w-auto text-center"
                    >
                        ← Kembali ke Konfigurasi Jadwal
                    </Link>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-3 rounded-2xl bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white text-xs font-bold shadow-xl shadow-primary-600/30 flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
                        >
                            {saving ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Menyimpan Bracket Matrix...</span>
                                </>
                            ) : (
                                <>
                                    <span>💾</span>
                                    <span>Simpan Bracket Matrix & Lanjut Generate Jadwal →</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
