import { normalizeTitle, fetchNormalizedTitleMap } from './titleUtils';
import { parse as parseCSV } from 'papaparse';
import { convertDateToTimeString, getCurrentFormattedTime } from './dateUtils'
import { clearMapIDC, clearMapOfficial, clearMapReflux } from '../constants/clearConstrains';
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
    const lastplay = row['最終プレー日時'];

    for (let i = 0; i < difficultyDetailKeys.length; i++) {
      const key = difficultyDetailKeys[i];
      const score = parseInt(row[`${key} スコア`] || '0');
      const miss = row[`${key} ミスカウント`] ? parseInt(row[`${key} ミスカウント`]) : defaultMisscount;
      const clear = clearMapOfficial[(row[`${key} クリアタイプ`] || '').trim()] ?? 0;
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
          lastplay: lastplay
        };
      }
    }
  });

  return data;
}

// INFINITAS打鍵カウンタCSVのパース
export async function parseIDCCsv(text: string): Promise<any> {
  const rows = parseCSV(text, { header: true }).data as any[];
  const data: any = {};

  rows.forEach(row => {
    const title = row['Title'];
    if (!title) return;
    const mode = row['mode'].slice(0, 2);
    const diff = row['mode'].slice(2, 3);
    const score = parseInt(row['Score'] || '0');
    const clear = clearMapIDC[(row['Lamp'] || '').trim()] ?? 0;
    const miss = row['BP'] ? parseInt(row['BP']) : defaultMisscount;
    const lastplay = convertDateToTimeString(row['Last Played']);

    if (clear != 0) {
      if (!data[mode]) data[mode] = {};
      if (!data[mode][title]) data[mode][title] = {};
      data[mode][title][diff] = {
        title,
        difficulty: diff,
        score: score,
        misscount: miss,
        cleartype: clear,
        unlocked: false,
        lastplay
      };
    }
  });

  return data;
}

// INFINITASリザルト手帳のパース
export async function parseInbCsv(text: string, mode: 'SP' | 'DP'): Promise<any> {
  const rows = parseCSV(text, { header: true }).data as any[];
  const data: any = {};

  rows.forEach(row => {
    const title = row['曲名'];
    if (!title) return;
    const rawLastplay = row['最終プレイ日時'];
    const match = rawLastplay.match(/^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})$/);
    let lastplay = '';
    if (match) {
      const [, year, month, day, hour, minute] = match;
      lastplay = `${year}-${month}-${day} ${hour}:${minute}`;
    }

    const difficulty = row['難易度'].slice(0, 1);
    const score = parseInt(row['スコア'] || '0');
    const miss = row['ミスカウント'] ? parseInt(row['ミスカウント']) : defaultMisscount;
    const clear = clearMapIDC[(row['クリアタイプ'] || '').trim()] ?? 0;
    if (clear != 0) {
      if (!data[mode]) data[mode] = {};
      if (!data[mode][title]) data[mode][title] = {};
      data[mode][title][difficulty] = {
        title,
        difficulty: difficulty,
        score: isNaN(score) ? 0 : score,
        misscount: isNaN(miss) ? defaultMisscount : miss,
        cleartype: clear,
        unlocked: false,
        lastplay: lastplay
      };
    }
  });

  return data;
}

// Reflux TSVのパース
export async function parseRefluxTsv(text: string): Promise<any> {
  const rows = text.split('\n').map(line => line.split('\t'));
  const headers = rows[0];
  const data: any = {};

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => rowObj[h] = row[idx]);

    const title = rowObj['title'];
    if (!title) continue;

    for (const mode of ['SP', 'DP']) {
      for (let i = 0; i < difficultyKey.length; i++) {
        const diff = difficultyKey[i];
        const prefix = mode + diff;
        const score = parseInt(rowObj[`${prefix} EX Score`] || '0');
        const miss = rowObj[`${prefix} Miss Count`] ? parseInt(rowObj[`${prefix} Miss Count`]) : defaultMisscount;
        const clear = clearMapReflux[rowObj[`${prefix} Lamp`]] ?? 0;
        const unlocked = rowObj[`${prefix} Unlocked`] === 'TRUE';

        if (clear != 0 || unlocked) {
          if (!data[mode]) data[mode] = {};
          if (!data[mode][title]) data[mode][title] = {};
          data[mode][title][diff] = {
            title,
            difficulty: diff,
            score: isNaN(score) ? 0 : score,
            misscount: isNaN(miss) ? defaultMisscount : miss,
            cleartype: clear,
            unlocked,
            lastplay: '',
          };
        }
      }
    }
  }

  return data;
}

// 曲毎のマージ処理
const mergeScore = (entry: any, oldData: any, oldTS: any, isReflux: boolean, lastplay: string) => {
  let updated: { [key: string]: any } = {};
  let diff: { [key: string]: any } = {};
  let timestamp: { [key: string]: any } = {};

  if (Object.keys(oldData).length > 0 && Object.keys(oldTS).length > 0) {
    // 既プレイ楽曲
    updated = {
      score: oldData.score,
      cleartype: oldData.cleartype,
      misscount: oldData.misscount,
      unlocked: isReflux ? entry.unlocked : oldData.unlocked
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
      timestamp['scoreupdated'] = lastplay;
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
    //初プレイ楽曲
    updated = {
      score: entry.score,
      cleartype: entry.cleartype,
      misscount: entry.misscount,
      unlocked: entry.unlocked
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
      scoreupdated: fixedLastPlay,
      cleartypeupdated: fixedLastPlay,
      misscountupdated: fixedLastPlay
    }
  }
  return { updated, diff, timestamp }
}

// CSV読み込み時のLocalStrageデータとのマージ処理
export async function mergeWithCSVEntries(parsed: any, isReflux: boolean, isInf: boolean) {
  const idMap = await fetchNormalizedTitleMap();
  const reversedacInfDiffMap: { [key: number]: any } =
    Object.fromEntries(
      Object.entries(acInfDiffMap).map(([infId, data]) => [
        data.acID,                 // 新しいキー = acID
        { ...data, infId: Number(infId) } // 元のIDを含めたオブジェクト
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
  let isInfId = false;

  for (const mode in parsed) {
    for (const rawTitle in parsed[mode]) {
      const normTitle = normalizeTitle(rawTitle);
      const acSongId = idMap[normTitle];
      let acInfDif;
      if (!acSongId) {
        failedTitles.push(rawTitle);
        console.log(rawTitle + '(' + normTitle + ')の読み込みに失敗しました。');
        continue;
      }
      if (isInf) {
        acInfDif = reversedacInfDiffMap[Number(acSongId)];
      }
      const newEntries = parsed[mode][rawTitle];
      for (const difficulty in newEntries) {
        let songId = acSongId;
        const entry = newEntries[difficulty];
        if(acInfDif && acInfDif.changedChart.includes(mode + difficulty)){
          songId = acInfDif.infId;
        }
        if (!mergedData[mode]) mergedData[mode] = {};
        if (!mergedData[mode][songId]) mergedData[mode][songId] = {};
        if (!mergedTS[mode]) mergedTS[mode] = {};
        if (!mergedTS[mode][songId]) mergedTS[mode][songId] = {};
        const oldData = mergedData[mode][songId][entry.difficulty] || {};
        const oldTS = mergedTS[mode][songId][entry.difficulty] || {};
        const lastplay = entry.lastplay ? entry.lastplay : getCurrentFormattedTime();

        const merged = mergeScore(entry, oldData, oldTS, isReflux, lastplay);

        // 登録共通処理
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

// JSON変更時のLocalStrageデータとのマージ処理
export function mergeWithJSONData(oldData: any, newData: any, oldTimestamps: any, newTimestamps: any, oldDiff: any, isReflux: boolean) {
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
        const lastplay = newTimestamps?.[mode]?.[songId]?.[difficulty]?.lastplay ? newTimestamps[mode][songId][difficulty].lastplay : getCurrentFormattedTime();

        const merged = mergeScore(entry, oldData, oldTS, isReflux, lastplay);

        // 登録共通処理
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
  for (const id in data[mode]) {
    for (const diff in data[mode][id]) {
      score[`${id}_${diff}`] = data[mode][id][diff].score;
      clear[`${id}_${diff}`] = data[mode][id][diff].cleartype;
      misscount[`${id}_${diff}`] = data[mode][id][diff].misscount;
      unlocked[`${id}_${diff}`] = data[mode][id][diff].unlocked;
    }
  }

  return { score, clear, misscount, unlocked }
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

  // INFINITAS専用譜面のIDリスト（acInfDiffMapのキー）
  const infinitasOnlyIds = new Set(Object.keys(acInfDiffMap).map(id => String(id)));

  // ヘッダー行
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

  // データ行を生成
  for (const songId in data[mode]) {
    // INFINITAS専用譜面を除外
    if (infinitasOnlyIds.has(songId)) {
      continue;
    }

    const songData = data[mode][songId];
    const title = titleMap[songId] || `Unknown Song (ID: ${songId})`;

    // 最終プレー日時を取得
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
      '', // バージョン（空）
      title,
      lastPlay
    ];

    // 各難易度のデータを追加
    for (let i = 0; i < difficultyKey.length; i++) {
      const diff = difficultyKey[i];
      const diffData = songData[diff];

      if (diffData) {
        row.push(
          '', // 難易度（空）
          String(diffData.score || 0),
          clearTypeToOfficialString(diffData.cleartype || 0),
          String(diffData.misscount === defaultMisscount ? '' : diffData.misscount),
          '' // DJ LEVEL（空）
        );
      } else {
        row.push('', '0', 'NO PLAY', '', '');
      }
    }

    rows.push(row);
  }

  // CSV文字列を生成（BOM付きUTF-8）
  const csvContent = rows.map(row =>
    row.map(cell => {
      // セル内に改行、カンマ、ダブルクォートがある場合はエスケープ
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(',')
  ).join('\n');

  // BOMを追加
  return '\ufeff' + csvContent;
}