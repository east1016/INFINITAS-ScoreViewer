export const clearColorMap: { [key: number]: string } = {
  0: '#FFFFFF',
  1: '#CCCCCC',
  2: '#FF66CC',
  3: '#99FF99',
  4: '#99CCFF',
  5: '#FF6666',
  6: '#FFD700',
  7: '#FF9966'
};

export const raderCategoryColors: Record<string, string> = {
  NOTES: '#ff69b4',
  CHORD: '#99ff99',
  PEAK: '#ffff66',
  CHARGE: '#cc66ff',
  SCRATCH: '#ff6666',
  SOFLAN: '#99ccff'
};

export const scoreColorMap: { [key: string]: string } = {
    'A': '#20B2AA',      // 緑青 (LightSeaGreen)
    'AA': '#C0C0C0',     // 銀色
    'AAA': '#FFD700',    // 金色
    'MAX-': '#FF9966',   // FULLCOMBOと同じ色
    'B': '#2196f3',
    'C': '#2196f3',
    'D': '#2196f3',
    'E': '#2196f3',
    'F': '#2196f3'
};

// 表用の薄い色（アルファ50%相当の色）
export const scoreColorMapLight: { [key: string]: string } = {
    'A': '#90D9D5',      // 緑青の薄い版
    'AA': '#E0E0E0',     // 銀色の薄い版
    'AAA': '#FFECB3',    // 金色の薄い版
    'MAX-': '#FF9966',   // FULLCOMBOと完全に同じ色
};

// AtCoderカラー（公式色）
// BPIベースの色分け: 目標BPIとの差分で判定
// 差分 > +10: 赤（大幅超過）, +5〜+10: 橙, 0〜+5: 黄, -5〜0: 青, -10〜-5: 水色, < -10: 緑（目標から遠い）
const atcoderColors = {
  red: '#FF0000',
  orange: '#FF8000',
  yellow: '#C0C000',
  blue: '#0000FF',
  cyan: '#00C0C0',
  green: '#006400',
};

// bpiDiff = 現在のBPI - 目標BPI（正: 目標超過、負: 目標未達）
export const bpiGapColor = (bpiDiff: number, isBg: boolean): string => {
  const alpha = isBg ? '80' : 'FF'; // 16進数のアルファ値（80 = 50%）
  let color: string;

  if (bpiDiff > 10) {
    // 目標を大幅超過: 赤
    color = atcoderColors.red;
  } else if (bpiDiff > 5) {
    // 目標超過: 橙
    color = atcoderColors.orange;
  } else if (bpiDiff >= 0) {
    // 目標達成〜わずかに超過: 黄
    color = atcoderColors.yellow;
  } else if (bpiDiff > -5) {
    // 目標未達（近い）: 青
    color = atcoderColors.blue;
  } else if (bpiDiff > -10) {
    // 目標から遠い: 水色
    color = atcoderColors.cyan;
  } else {
    // 目標から最も遠い: 緑
    color = atcoderColors.green;
  }

  return color + alpha;
};