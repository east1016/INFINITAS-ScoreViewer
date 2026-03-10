import { replaceTitle, replaceCharacters } from '../constants/titleConstrains'
import { fetchJsonWithFallback } from './fetchWithFallback';
import React from 'react';

// 難易度ごとの色定義
const difficultyColors: Record<string, string> = {
  A: '#ff0000', // ANOTHER: 赤
  L: '#a855f7', // LEGGENDARIA: 紫
  H: '#d4a800', // HYPER: 黄色
  N: '#0000ff', // NORMAL: 青
  B: '#32cd32', // BEGINNER: 黄緑
};

/**
 * 曲名と難易度を色付きで表示するReactElement を返す
 * @param title 曲名
 * @param difficulty 難易度キー (A, L, H, N, B)
 * @param suffix オプションの接尾辞 (例: " (INFINITAS)")
 */
export const renderTitleWithDifficulty = (
  title: string,
  difficulty: string,
  suffix?: string
): React.ReactElement => {
  const color = difficultyColors[difficulty] || 'inherit';
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      'span',
      {
        style: {
          color: '#fff',
          backgroundColor: color,
          fontWeight: 'bold',
          padding: '0 4px',
          borderRadius: '3px',
          marginRight: '4px',
          fontSize: '0.9em'
        }
      },
      difficulty
    ),
    ' ',
    title,
    suffix || null
  );
};

async function fetchReplaceMap(): Promise<Record<string, string>> {
  return await fetchJsonWithFallback<Record<string, string>>('https://chinimuruhi.github.io/IIDX-Data-Table/manual/replace-characters.json');
}

export async function fetchNormalizedTitleMap(): Promise<Record<string, string>> {
  return await fetchJsonWithFallback<Record<string, string>>('https://chinimuruhi.github.io/IIDX-Data-Table/textage/reverse-normalized-title.json');
}

const remoteReplaceMap = await fetchReplaceMap();

export const normalizeTitle = (title: string): string => {
  for (const { from, to } of replaceTitle) {
    if(title === from) {
      title = to;
    }
  }
  for (const [from, to] of remoteReplaceMap['title']) {
    while (title.includes(from)) {
      title = title.replace(from, to);
    }
  }
  for (const { from, to } of replaceCharacters) {
    while (title.includes(from)) {
      title = title.replace(from, to);
    }
  }

  return title.split('').map(char => {
    const code = char.charCodeAt(0);
    return code > 127 ? '\\u' + code.toString(16).padStart(4, '0') : char;
  }).join('');
}

export const generateSearchText = (text: string) => {
  text = text.replace(/[Ａ-Ｚａ-ｚ０-９ａ-ｚＡ-Ｚ]/g, (s) =>
    String.fromCharCode(s.charCodeAt(0) - 0xfee0)
  );

  text = text.replace(/[ぁ-ん]/g, (s) =>
    String.fromCharCode(s.charCodeAt(0) + 0x60)
  );
  
  return text.toLowerCase();
};
