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
