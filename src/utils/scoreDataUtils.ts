import { normalizeTitle, fetchNormalizedTitleMap } from './titleUtils';
import { parse as parseCSV } from 'papaparse';
import { getCurrentFormattedTime } from './dateUtils'
import { clearMapOfficial } from '../constants/clearConstrains';
import { difficultyDetailKeys, difficultyKey } from '../constants/difficultyConstrains';
import { defaultLastPlay, defaultMisscount } from '../constants/defaultValues';
import { acInfDiffMap } from '../constants/titleConstrains';

// 公式CSVのパース
export async function parseOfficialCsv(text: string, mode: 'SP' | 'DP'): Promise<any> {
  const rows = parseCSV(text, { header: true }).data as any[];
  const data: any = {};

  rows.forEach(row => {
    const title = row['タイトル'];
    if (!title) return;

    for (let i = 0; i < difficultyDetailKeys.length; i++) {
      const key = difficultyDetailKeys[i];
      const score = parseInt(row[`${key} スコア`] || '0');
      const missRaw = row[`${key} ミスカウント`];
      const miss = missRaw && missRaw !== '---' ? parseInt(missRaw) : defaultMisscount;
      const clear = clearMapOfficial[(row[`${key} クリアタイプ`] || '').trim()] ?? 0;
      const lastplay = row[`${key} 最終プレー日時`] || '';
      const scoreupdatedRaw = row[`${key} 最終スコア更新時刻`] || '';
      const playcount = parseInt(row[`${key} プレー回数`] || '0');
      if (clear != 0) {
        if (!data[mode]) data[mode] = {};
        if (!data[mode][title]) data[mode][title] = {};
        data[mode][title][difficultyKey[i]] = {
          title,
          difficulty: difficultyKey[i],
          score: isNaN(score) ? 0 : score,
          misscount: isNaN(miss) ? defaultMisscount : miss,
          cleartype: clear,
          unlocked: false,
          lastplay: lastplay !== '---' ? lastplay : '',
          scoreupdated: scoreupdatedRaw !== '---' ? scoreupdatedRaw : '',
          playcount: isNaN(playcount) ? 0 : playcount,
        };
      }
    }
  });

  return data;
}

// 曲毎のマージ処理
const mergeScore = (entry: any, oldData: any, oldTS: any, lastplay: string) => {
  let updated: { [key: string]: any } = {};
  let diff: { [key: string]: any } = {};
  let timestamp: { [key: string]: any } = {};

  // 公式CSVが持つ正確な最終スコア更新時刻を優先、なければlastplayで代替
  const scoreupdatedFromEntry = entry.scoreupdated || '';

  if (Object.keys(oldData).length > 0 && Object.keys(oldTS).length > 0) {
    // 既プレイ楽曲
    updated = {
      score: oldData.score,
      cleartype: oldData.cleartype,
      misscount: oldData.misscount,
      unlocked: entry.unlocked ?? oldData.unlocked,
      playcount: entry.playcount ?? oldData.playcount,
    };
    timestamp = {
      lastplay: lastplay,
      scoreupdated: oldTS.scoreupdated,
      cleartypeupdated: oldTS.cleartypeupdated,
      misscountupdated: oldTS.misscountupdated
    }
    if (entry.score > oldData.score) {
      updated['score'] = entry.score;
      diff['score'] = {
        old: oldData.score,
        new: entry.score
      };
      timestamp['scoreupdated'] = scoreupdatedFromEntry || lastplay;
    } else if (scoreupdatedFromEntry) {
      // スコアが同じでも公式CSVの正確な日時で上書き
      timestamp['scoreupdated'] = scoreupdatedFromEntry;
    }
    if (entry.cleartype > oldData.cleartype) {
      updated['cleartype'] = entry.cleartype;
      diff['cleartype'] = {
        old: oldData.cleartype,
        new: entry.cleartype
      };
      timestamp['cleartypeupdated'] = lastplay;
    }
    if (entry.misscount < oldData.misscount) {
      updated['misscount'] = entry.misscount;
      diff['misscount'] = {
        old: oldData.misscount,
        new: entry.misscount
      };
      timestamp['misscountupdated'] = lastplay;
    }
  } else {
    // 初プレイ楽曲
    updated = {
      score: entry.score,
      cleartype: entry.cleartype,
      misscount: entry.misscount,
      unlocked: entry.unlocked ?? false,
      playcount: entry.playcount ?? 0,
    };
    let fixedLastPlay = lastplay;
    if (entry.score === 0 && entry.cleartype === 0 && entry.misscount === defaultMisscount) {
      fixedLastPlay = defaultLastPlay;
    } else {
      diff = {
        score: {
          old: 0,
          new: entry.score
        },
        cleartype: {
          old: 0,
          new: entry.cleartype
        },
        misscount: {
          old: defaultMisscount,
          new: entry.misscount
        }
      }
    }
    timestamp = {
      lastplay: fixedLastPlay,
      scoreupdated: scoreupdatedFromEntry || fixedLastPlay,
      cleartypeupdated: fixedLastPlay,
      misscountupdated: fixedLastPlay
    }
  }
  return { updated, diff, timestamp }
}

// 公式CSV読み込み時のLocalStorageデータとのマージ処理
export async function mergeWithCSVEntries(parsed: any) {
  const idMap = await fetchNormalizedTitleMap();
  const reversedacInfDiffMap: { [key: number]: any } =
    Object.fromEntries(
      Object.entries(acInfDiffMap).map(([infId, data]) => [
        data.acID,
        { ...data, infId: Number(infId) }
      ])
    );

  const existingDataRaw = localStorage.getItem('data') || '{}';
  const existingData = existingDataRaw ? JSON.parse(existingDataRaw) : {};
  const existingTSRaw = localStorage.getItem('timestamps') || '{}';
  const existingTS = existingTSRaw ? JSON.parse(existingTSRaw) : {};
  const diffs: any = {};
  const failedTitles: string[] = [];
  const mergedData = { ...existingData };
  const mergedTS = { ...existingTS };

  for (const mode in parsed) {
    for (const rawTitle in parsed[mode]) {
      const normTitle = normalizeTitle(rawTitle);
      const acSongId = idMap[normTitle];
      if (!acSongId) {
        failedTitles.push(rawTitle);
        console.log(rawTitle + '(' + normTitle + ')の読み込みに失敗しました。');
        continue;
      }
      const acInfDif = reversedacInfDiffMap[Number(acSongId)];
      const newEntries = parsed[mode][rawTitle];
      for (const difficulty in newEntries) {
        let songId = acSongId;
        const entry = newEntries[difficulty];
        if (acInfDif && acInfDif.changedChart.includes(mode + difficulty)) {
          songId = acInfDif.infId;
        }
        if (!mergedData[mode]) mergedData[mode] = {};
        if (!mergedData[mode][songId]) mergedData[mode][songId] = {};
        if (!mergedTS[mode]) mergedTS[mode] = {};
        if (!mergedTS[mode][songId]) mergedTS[mode][songId] = {};
        const oldData = mergedData[mode][songId][entry.difficulty] || {};
        const oldTS = mergedTS[mode][songId][entry.difficulty] || {};
        const lastplay = entry.lastplay ? entry.lastplay : getCurrentFormattedTime();

        const merged = mergeScore(entry, oldData, oldTS, lastplay);

        mergedData[mode][songId][entry.difficulty] = merged.updated;
        if (entry.score !== 0 || entry.cleartype !== 0 || entry.misscount !== defaultMisscount) {
          if (!mergedTS[mode][songId]) mergedTS[mode][songId] = {};
          mergedTS[mode][songId][entry.difficulty] = merged.timestamp;
        }
        if (Object.keys(merged.diff).length > 0) {
          if (!diffs[mode]) diffs[mode] = {};
          if (!diffs[mode][songId]) diffs[mode][songId] = {};
          diffs[mode][songId][entry.difficulty] = merged.diff;
        }
      }
    }
  }

  return { data: mergedData, diffs, timestamps: mergedTS, failedTitles };
}

// JSON変更時のLocalStorageデータとのマージ処理
export function mergeWithJSONData(oldData: any, newData: any, oldTimestamps: any, newTimestamps: any, oldDiff: any) {
  const mergedData = { ...oldData };
  const mergedTS = { ...oldTimestamps };
  const mergedDiff = { ...oldDiff };

  for (const mode in newData) {
    for (const songId in newData[mode]) {
      if (!mergedData[mode]) mergedData[mode] = {};
      if (!mergedData[mode][songId]) mergedData[mode][songId] = {};
      if (!mergedTS[mode]) mergedTS[mode] = {};
      if (!mergedTS[mode][songId]) mergedTS[mode][songId] = {};

      const newEntries = newData[mode][songId];
      for (const difficulty in newEntries) {
        const entry = newEntries[difficulty];
        const oldData = mergedData[mode][songId][difficulty] || {};
        const oldTS = mergedTS[mode][songId][difficulty] || {};
        const lastplay = newTimestamps?.[mode]?.[songId]?.[difficulty]?.lastplay
          ? newTimestamps[mode][songId][difficulty].lastplay
          : getCurrentFormattedTime();

        const merged = mergeScore(entry, oldData, oldTS, lastplay);

        mergedData[mode][songId][difficulty] = merged.updated;
        if (entry.score !== 0 || entry.cleartype !== 0 || entry.misscount !== defaultMisscount) {
          if (!mergedTS[mode][songId]) mergedTS[mode][songId] = {};
          mergedTS[mode][songId][difficulty] = merged.timestamp;
        }
        if (Object.keys(merged.diff).length > 0) {
          if (!mergedDiff[mode]) mergedDiff[mode] = {};
          if (!mergedDiff[mode][songId]) mergedDiff[mode][songId] = {};
          if (!mergedDiff[mode][songId][difficulty]) mergedDiff[mode][songId][difficulty] = {};
          for (const diffType in merged.diff) {
            mergedDiff[mode][songId][difficulty][diffType] = merged.diff[diffType];
          }
        }
      }
    }
  }

  return { data: mergedData, diffs: mergedDiff, timestamps: mergedTS };
}

// ${id}_${diff}形式のオブジェクトに変換
export const convertDataToIdDiffKey = (data: any, mode: 'SP' | 'DP') => {
  const score: { [key: string]: number } = {};
  const clear: { [key: string]: number } = {};
  const misscount: { [key: string]: number } = {};
  const unlocked: { [key: string]: boolean } = {};
  const playcount: { [key: string]: number } = {};
  for (const id in data[mode]) {
    for (const diff in data[mode][id]) {
      score[`${id}_${diff}`] = data[mode][id][diff].score;
      clear[`${id}_${diff}`] = data[mode][id][diff].cleartype;
      misscount[`${id}_${diff}`] = data[mode][id][diff].misscount;
      unlocked[`${id}_${diff}`] = data[mode][id][diff].unlocked;
      playcount[`${id}_${diff}`] = data[mode][id][diff].playcount ?? 0;
    }
  }

  return { score, clear, misscount, unlocked, playcount }
}

// クリアタイプの数値を公式CSVの文字列に変換
const clearTypeToOfficialString = (clearType: number): string => {
  const clearTypeMap: Record<number, string> = {
    0: "NO PLAY",
    1: "FAILED",
    2: "ASSIST CLEAR",
    3: "EASY CLEAR",
    4: "CLEAR",
    5: "HARD CLEAR",
    6: "EX HARD CLEAR",
    7: "FULLCOMBO CLEAR"
  };
  return clearTypeMap[clearType] || "NO PLAY";
}

// 公式CSV形式でエクスポート
export async function exportToOfficialCsv(mode: 'SP' | 'DP', titleMap: Record<string, string>, timestamps: any): Promise<string> {
  const data = JSON.parse(localStorage.getItem('data') || '{}');

  if (!data[mode]) {
    return '';
  }

  const infinitasOnlyIds = new Set(Object.keys(acInfDiffMap).map(id => String(id)));

  const headers = [
    'バージョン',
    'タイトル',
    '最終プレー日時',
    ...difficultyDetailKeys.flatMap(diff => [
      `${diff} 難易度`,
      `${diff} スコア`,
      `${diff} クリアタイプ`,
      `${diff} ミスカウント`,
      `${diff} DJ LEVEL`
    ])
  ];

  const rows: string[][] = [headers];

  for (const songId in data[mode]) {
    if (infinitasOnlyIds.has(songId)) {
      continue;
    }

    const songData = data[mode][songId];
    const title = titleMap[songId] || `Unknown Song (ID: ${songId})`;

    let lastPlay = '';
    if (timestamps?.[mode]?.[songId]) {
      const songTimestamps = timestamps[mode][songId];
      for (const diff in songTimestamps) {
        const diffLastPlay = songTimestamps[diff]?.lastplay || '';
        if (diffLastPlay && (!lastPlay || diffLastPlay > lastPlay)) {
          lastPlay = diffLastPlay;
        }
      }
    }

    const row: string[] = [
      '',
      title,
      lastPlay
    ];

    for (let i = 0; i < difficultyKey.length; i++) {
      const diff = difficultyKey[i];
      const diffData = songData[diff];

      if (diffData) {
        row.push(
          '',
          String(diffData.score || 0),
          clearTypeToOfficialString(diffData.cleartype || 0),
          String(diffData.misscount === defaultMisscount ? '' : diffData.misscount),
          ''
        );
      } else {
        row.push('', '0', 'NO PLAY', '', '');
      }
    }

    rows.push(row);
  }

  const csvContent = rows.map(row =>
    row.map(cell => {
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(',')
  ).join('\n');

  return '﻿' + csvContent;
}
