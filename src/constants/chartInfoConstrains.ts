export const chartCategories: string[] = [
    'NOTES',
    'CHORD',
    'PEAK',
    'CHARGE',
    'SCRATCH',
    'SOFLAN'
];

// 外部データソースにノーツ数が未登録の譜面の補正データ
// key: "id_difficulty", value: notes
export const notesOverride: Record<string, number> = {
    '4087_H': 1189, // Inner Spirit -GIGA HiTECH MIX- [H]
    '4089_H': 1141, // GHEL NAGARAJA [H]
};