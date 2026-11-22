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
    'A': '#20B2AA',
    'AA': '#C0C0C0',
    'AAA': '#FFD700',
    'MAX-': '#FF9966',
    'B': '#2196f3',
    'C': '#2196f3',
    'D': '#2196f3',
    'E': '#2196f3',
    'F': '#2196f3'
};

export const scoreColorMapLight: { [key: string]: string } = {
    'A': '#90D9D5',
    'AA': '#E0E0E0',
    'AAA': '#FFECB3',
    'MAX-': '#FF9966',
};

const atcoderColors = {
  red: '#FF0000',
  orange: '#FF8000',
  yellow: '#C0C000',
  blue: '#0000FF',
  cyan: '#00C0C0',
  green: '#006400',
};

export const bpiGapColor = (bpiDiff: number): string => {
  if (bpiDiff > 10) return atcoderColors.red + '80';
  if (bpiDiff > 5)  return atcoderColors.orange + '80';
  if (bpiDiff >= 0) return atcoderColors.yellow + '80';
  if (bpiDiff > -5) return atcoderColors.blue + '80';
  if (bpiDiff > -10) return atcoderColors.cyan + '80';
  return atcoderColors.green + '80';
};