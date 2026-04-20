export const chartCategories: string[] = [
    'NOTES',
    'CHORD',
    'PEAK',
    'CHARGE',
    'SCRATCH',
    'SOFLAN'
];

// 外部データソースにノーツ数やレベルが未登録の譜面の補正データ
// src/data/notesOverride.json から読み込み
import notesOverrideData from '../data/notesOverride.json';
import chartInfoOverrideData from '../data/chartInfoOverride.json';

type NotesOverrideEntry = { notes: number; level?: number; title: string };
const notesOverrideRaw: Record<string, NotesOverrideEntry> = notesOverrideData;

// 従来のインターフェース（key -> notes）を維持
export const notesOverride: Record<string, number> = Object.fromEntries(
    Object.entries(notesOverrideRaw).map(([key, value]) => [key, value.notes])
);

// レベルのoverride（key -> level）
export const levelOverride: Record<string, number> = Object.fromEntries(
    Object.entries(notesOverrideRaw)
        .filter(([, value]) => value.level !== undefined)
        .map(([key, value]) => [key, value.level as number])
);

// 完全なoverride情報を取得（モーダル表示用）
export const chartOverrideData: Record<string, NotesOverrideEntry> = notesOverrideRaw;

// chart-info.json のフラグをオーバーライド（オンラインデータに誤りがある曲）
// src/data/chartInfoOverride.json から読み込み
type ChartInfoOverrideEntry = { in_inf?: boolean; in_ac?: boolean; title: string };
const chartInfoOverrideRaw: Record<string, ChartInfoOverrideEntry> = chartInfoOverrideData;

export const inInfOverride: Record<string, boolean> = Object.fromEntries(
    Object.entries(chartInfoOverrideRaw)
        .filter(([, value]) => value.in_inf !== undefined)
        .map(([key, value]) => [key, value.in_inf as boolean])
);

export const inAcOverride: Record<string, boolean> = Object.fromEntries(
    Object.entries(chartInfoOverrideRaw)
        .filter(([, value]) => value.in_ac !== undefined)
        .map(([key, value]) => [key, value.in_ac as boolean])
);