export type FilterState = {
  cleartype?: number[];
  unlocked?: boolean;
  releaseType?: 'ac' | 'inf' | 'ac_only' | 'inf_only';
  version?: number[];
  difficultyPattern?: number[];
  label?: number[];
  level?: number;
  grade?: number[];  // 0:F, 1:E, 2:D, 3:C, 4:B, 5:A, 6:AA, 7:AAA, 8:MAX-
};