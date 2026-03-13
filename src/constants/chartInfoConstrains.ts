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