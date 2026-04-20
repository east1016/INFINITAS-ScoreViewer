import { difficultyKey } from "../constants/difficultyConstrains";
import { FilterState } from "../types/Types";

// Convert rate (0-1) to grade index: 0:F, 1:E, 2:D, 3:C, 4:B, 5:A, 6:AA, 7:AAA, 8:MAX-
export const getGradeIndex = (rate: number): number => {
  if (rate >= 17 / 18) return 8;  // MAX-
  if (rate >= 8 / 9) return 7;    // AAA
  if (rate >= 7 / 9) return 6;    // AA
  if (rate >= 2 / 3) return 5;    // A
  if (rate >= 5 / 9) return 4;    // B
  if (rate >= 4 / 9) return 3;    // C
  if (rate >= 1 / 3) return 2;    // D
  if (rate >= 2 / 9) return 1;    // E
  return 0;                        // F
};

export const isMatchSong = (filters: FilterState, lamp: number, difficulty: string, konamiInfInfo: any, chartInfo: any, unlocked: boolean, version: number, label: number, rate?: number) =>{

    if (filters?.cleartype && filters?.cleartype.length > 0 && !filters?.cleartype.includes(lamp)) return false;
    if (filters?.difficultyPattern && !filters.difficultyPattern.includes(difficultyKey.indexOf(difficulty))) return false;
    if (filters?.unlocked !== undefined && filters?.unlocked !== unlocked) return false;
    if (filters?.releaseType) {
      const notInInf = (!chartInfo?.in_inf || (difficulty === 'L' && !konamiInfInfo?.in_leggendaria));
      if (filters?.releaseType === 'ac' && !chartInfo?.in_ac) return false;
      if (filters?.releaseType === 'inf' && notInInf) return false;
      if (filters?.releaseType === 'ac_only' && (!chartInfo?.in_ac || (chartInfo?.in_ac && !notInInf))) return false;
      if (filters?.releaseType === 'inf_only' && (notInInf || (!notInInf && chartInfo?.in_ac))) return false;
    }
    if (filters?.version?.length && !filters?.version?.includes(version)) return false;
    if (filters?.label?.length && !filters?.label?.includes(label)) return false;
    if (filters?.grade && filters?.grade.length > 0 && rate !== undefined) {
      const gradeIndex = getGradeIndex(rate);
      if (!filters.grade.includes(gradeIndex)) return false;
    }

    return true;
}