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

// グレード達成数カウント
export const achiveTargetGradeMap: Record<string, number> = {
  "A": 6 / 9,
  "AA": 7 / 9,
  "AAA": 8 / 9,
  "MAX-": 17 / 18,
};

export const getGradeAchiveCount = (filteredSongs: { rate: number }[]) => {
  const result: Record<string, number> = {};

  Object.keys(achiveTargetGradeMap).forEach((key) => {
    const threshold = achiveTargetGradeMap[key];
    result[key] = filteredSongs.filter((s) => s.rate >= threshold).length;
  });

  return result;
}
