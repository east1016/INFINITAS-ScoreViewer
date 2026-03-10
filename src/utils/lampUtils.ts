import { achiveTargetClearMap } from '../constants/clearConstrains';

// ランプ達成数カウント
export const getLampAchiveCount = (filteredSongs: any[], clearData: any) => {
  const lampAchieved = (lamp: number, threshold: number): boolean => lamp >= threshold;

  const result: Record<string, number> = {};

  Object.keys(achiveTargetClearMap).forEach((key) => {
    const threshold = achiveTargetClearMap[key as keyof typeof achiveTargetClearMap];
    result[key] = filteredSongs.filter((s) =>
      lampAchieved(clearData[`${s.id}_${s.difficulty}`] || 0, threshold)
    ).length;
  });

  return result
}

// グレード達成数カウント（SongRow形式）
// gradeUtils.tsの閾値に基づく
export const achiveTargetGradeMap: Record<string, number> = {
  "A": 2 / 3,      // 12/18 ≈ 66.67%
  "AA": 7 / 9,     // 14/18 ≈ 77.78%
  "AAA": 8 / 9,    // 16/18 ≈ 88.89%
  "MAX-": 17 / 18, // ≈ 94.44%
};

export const getGradeAchiveCount = (filteredSongs: { rate: number }[]) => {
  const result: Record<string, number> = {};

  Object.keys(achiveTargetGradeMap).forEach((key) => {
    const threshold = achiveTargetGradeMap[key];
    result[key] = filteredSongs.filter((s) => s.rate >= threshold).length;
  });

  return result;
}
