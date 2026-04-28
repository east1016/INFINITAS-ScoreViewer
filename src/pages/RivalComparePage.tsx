import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Container, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, FormControl, InputLabel, Select, MenuItem,
  Box, Backdrop, CircularProgress, Button, ButtonGroup,
  Alert
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Page, PageHeader } from '../components/Page';
import SectionCard from '../components/SectionCard';
import FilterPanel from '../components/FilterPanel';
import { useAppContext } from '../context/AppContext';

import { difficultyKey } from '../constants/difficultyConstrains';
import { notesOverride, levelOverride } from '../constants/chartInfoConstrains';
import { clearColorMap, scoreColorMapLight } from '../constants/colorConstrains';
import { simpleClearName, clearMapReflux } from '../constants/clearConstrains';
import { defaultMisscount } from '../constants/defaultValues';

import { getPercentage, getDetailGrade, getGrade } from '../utils/gradeUtils';
import { generateSearchText, renderTitleWithDifficulty, normalizeTitle, fetchNormalizedTitleMap } from '../utils/titleUtils';
import { isMatchSong } from '../utils/filterUtils';
import { convertDataToIdDiffKey } from '../utils/scoreDataUtils';
import { acInfDiffMap } from '../constants/titleConstrains';
import { fetchJsonWithFallback, fetchGzipJsonWithFallback } from '../utils/fetchWithFallback';

type SongRow = {
  id: string;
  difficulty: string;
  diffIndex: number;
  level: number;
  notes: number;
  title: string;
  normalizedTitle: string;
  // 自分のスコア
  myLamp: number;
  myScore: number;
  myRate: number;
  myBp: number;
  // ライバルのスコア
  rivalLamp: number;
  rivalScore: number;
  rivalRate: number;
  rivalBp: number;
  // 差分
  scoreDiff: number;  // 正: 自分が上、負: ライバルが上
  lampDiff: number;
  bpDiff: number;
};

type SortKey = 'lv' | 'title' | 'myScore' | 'rivalScore' | 'scoreDiff' | 'myLamp' | 'rivalLamp' | 'myGrade' | 'rivalGrade';
type SortDir = 'asc' | 'desc';

// Reflux TSVをパースしてライバルデータを取得
const parseRivalTsv = (
  text: string,
  normalizedTitleToId: Record<string, string>
): Record<string, Record<string, { score: number; lamp: number; bp: number }>> => {
  const rows = text.split('\n').map(line => line.split('\t'));
  const headers = rows[0];
  const data: Record<string, Record<string, { score: number; lamp: number; bp: number }>> = {};

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => rowObj[h] = row[idx]);

    const title = rowObj['title'];
    if (!title) continue;

    // 曲名を正規化してIDを取得
    const normalizedTitle = normalizeTitle(title);
    const id = normalizedTitleToId[normalizedTitle];
    if (!id) continue; // IDが見つからない場合はスキップ

    for (const mode of ['SP', 'DP']) {
      for (let j = 0; j < difficultyKey.length; j++) {
        const diff = difficultyKey[j];
        const prefix = mode + diff;
        const score = parseInt(rowObj[`${prefix} EX Score`] || '0');
        const bp = rowObj[`${prefix} Miss Count`] ? parseInt(rowObj[`${prefix} Miss Count`]) : defaultMisscount;
        const lamp = clearMapReflux[rowObj[`${prefix} Lamp`]] ?? 0;

        if (score > 0 || lamp > 0) {
          const key = `${mode}_${id}`;
          if (!data[key]) data[key] = {};
          data[key][diff] = { score, lamp, bp };
        }
      }
    }
  }

  return data;
};

const RivalComparePage: React.FC = () => {
  const { mode, filters, setFilters } = useAppContext();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));

  const [chartInfo, setChartInfo] = useState<any>({});
  const [songInfo, setSongInfo] = useState<any>({});
  const [konamiInfInfo, setKonamiInfInfo] = useState<any>({});
  const [titleMap, setTitleMap] = useState<Record<string, string>>({});
  const [normalizedTitleToId, setNormalizedTitleToId] = useState<Record<string, string>>({});

  const [clearData, setClearData] = useState<Record<string, number>>({});
  const [scoreData, setScoreData] = useState<Record<string, number>>({});
  const [missData, setMissData] = useState<Record<string, number>>({});
  const [unlockedData, setUnlockedData] = useState<Record<string, boolean>>({});

  const [rivalData, setRivalData] = useState<Record<string, Record<string, { score: number; lamp: number; bp: number }>>>({});
  const [rivalLoaded, setRivalLoaded] = useState(false);

  const [songs, setSongs] = useState<SongRow[]>([]);
  const [loading, setLoading] = useState(true);
  const selectedLevel = filters.level ?? 12;

  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDir }>({
    key: 'scoreDiff',
    direction: 'asc',
  });
  const [displayLimit, setDisplayLimit] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : {
          key,
          direction: key === 'scoreDiff' ? 'asc' : 'desc',
        }
    );
  };

  const handleSortKeyChange = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: key === 'scoreDiff' ? 'asc' : prev.direction,
    }));
  };

  const toggleSortDir = () =>
    setSortConfig((s) => ({ ...s, direction: s.direction === 'asc' ? 'desc' : 'asc' }));

  // ライバルTSVの読み込み
  const handleRivalFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const decoder = new TextDecoder('utf-8', { fatal: true });
      const text = decoder.decode(new Uint8Array(arrayBuffer));

      if (!text.includes('Type') || !text.includes('Label')) {
        throw new Error('Reflux TSVとして認識できません');
      }

      const parsed = parseRivalTsv(text, normalizedTitleToId);
      setRivalData(parsed);
      setRivalLoaded(true);
    } catch (e: any) {
      alert(`読み込み失敗: ${e.message}`);
    }
  }, [normalizedTitleToId]);

  // 初期データ読み込み
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [
          titleRes,
          songInfoJson,
          chartJson,
          konamiRes,
          normTitleMap,
        ] = await Promise.all([
          fetchJsonWithFallback<{ [key: string]: string }>('https://chinimuruhi.github.io/IIDX-Data-Table/textage/title.json'),
          fetchGzipJsonWithFallback<any>('https://chinimuruhi.github.io/IIDX-Data-Table/textage/song-info.json.gz'),
          fetchGzipJsonWithFallback<any>('https://chinimuruhi.github.io/IIDX-Data-Table/textage/chart-info.json.gz'),
          fetchJsonWithFallback<any>('https://chinimuruhi.github.io/IIDX-Data-Table/konami/song_to_label.json'),
          fetchNormalizedTitleMap(),
        ]);

        setTitleMap(titleRes);
        setSongInfo(songInfoJson);
        setChartInfo(chartJson);
        setKonamiInfInfo(konamiRes);
        setNormalizedTitleToId(normTitleMap);

        const local = JSON.parse(localStorage.getItem('data') || '{}');
        const { clear: clearRes, score: scoreRes, misscount: missRes, unlocked: unlockedRes } = convertDataToIdDiffKey(local, mode);
        setClearData(clearRes);
        setScoreData(scoreRes ?? {});
        setMissData(missRes);
        setUnlockedData(unlockedRes);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [mode]);

  // 曲リスト生成（ライバルデータ読み込み後）
  useEffect(() => {
    if (!rivalLoaded || Object.keys(titleMap).length === 0) return;

    const list: SongRow[] = [];
    for (const id of Object.keys(titleMap)) {
      const c = chartInfo[id];
      if (!c) continue;
      if (!(c.in_ac || c.in_inf)) continue;

      const title = titleMap[id] ?? id;
      const normalizedTitle = normalizeTitle(title);

      for (const diff of difficultyKey) {
        const diffIndex = difficultyKey.indexOf(diff);
        const key = `${id}_${diff}`;
        const chartLevel = c.level?.[mode.toLowerCase()]?.[diffIndex] ?? 0;
        const lv = chartLevel > 0 ? chartLevel : (levelOverride[key] ?? 0);
        if (!lv) continue;

        const chartNotes = c.notes?.[mode.toLowerCase()]?.[diffIndex] ?? 0;
        const notes = chartNotes > 0 ? chartNotes : (notesOverride[key] ?? 0);

        // 自分のスコア
        const myLamp = clearData[key] ?? 0;
        const myScore = scoreData[key] ?? 0;
        const myRate = getPercentage(myScore, notes);
        const myBp = missData[key] ?? defaultMisscount;

        // ライバルのスコア
        const rivalKey = `${mode}_${id}`;
        const rivalEntry = rivalData[rivalKey]?.[diff];
        const rivalLamp = rivalEntry?.lamp ?? 0;
        const rivalScore = rivalEntry?.score ?? 0;
        const rivalRate = getPercentage(rivalScore, notes);
        const rivalBp = rivalEntry?.bp ?? defaultMisscount;

        // どちらかが未プレイの場合はスキップ
        if (myScore === 0 || rivalScore === 0) continue;

        const scoreDiff = myScore - rivalScore;
        const lampDiff = myLamp - rivalLamp;
        const bpDiff = myBp - rivalBp;

        list.push({
          id,
          difficulty: diff,
          diffIndex,
          level: lv,
          notes,
          title,
          normalizedTitle: generateSearchText(title),
          myLamp,
          myScore,
          myRate,
          myBp,
          rivalLamp,
          rivalScore,
          rivalRate,
          rivalBp,
          scoreDiff,
          lampDiff,
          bpDiff,
        });
      }
    }
    setSongs(list);
  }, [rivalLoaded, rivalData, titleMap, chartInfo, mode, clearData, scoreData, missData]);

  const filtered = useMemo(() => {
    return songs.filter(s => {
      if (s.level !== selectedLevel) return false;

      const key = `${s.id}_${s.difficulty}`;
      const lamp = clearData[key] ?? 0;
      const konami = konamiInfInfo[s.id] || {};
      const chart = chartInfo[s.id] || {};
      const unlocked = unlockedData[key] ?? false;
      const version = songInfo[s.id]?.version;
      const label = konamiInfInfo[s.id]?.label;

      return isMatchSong(filters, lamp, s.difficulty, konami, chart, unlocked, version, label, s.myRate);
    });
  }, [songs, selectedLevel, filters, clearData, chartInfo, konamiInfInfo, unlockedData, songInfo]);

  // フィルター変更時にページを1に戻す
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortConfig]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortConfig.direction;

    const cmpNum = (a: number, b: number) => (dir === 'asc' ? a - b : b - a);
    const cmpStr = (a: string, b: string) => (dir === 'asc' ? a.localeCompare(b) : b.localeCompare(a));

    return arr.sort((a, b) => {
      switch (sortConfig.key) {
        case 'lv':
          return cmpNum(a.level, b.level);
        case 'title':
          return cmpStr(a.title, b.title);
        case 'myScore':
          return cmpNum(a.myScore, b.myScore);
        case 'rivalScore':
          return cmpNum(a.rivalScore, b.rivalScore);
        case 'scoreDiff':
          return cmpNum(a.scoreDiff, b.scoreDiff);
        case 'myLamp':
          return cmpNum(a.myLamp, b.myLamp);
        case 'rivalLamp':
          return cmpNum(a.rivalLamp, b.rivalLamp);
        case 'myGrade':
          return cmpNum(a.myRate, b.myRate);
        case 'rivalGrade':
          return cmpNum(a.rivalRate, b.rivalRate);
        default:
          return 0;
      }
    });
  }, [filtered, sortConfig]);

  const totalPages = useMemo(() => {
    if (displayLimit === 0) return 1;
    return Math.ceil(sorted.length / displayLimit);
  }, [sorted.length, displayLimit]);

  const displayed = useMemo(() => {
    if (displayLimit === 0) return sorted;
    const start = (currentPage - 1) * displayLimit;
    return sorted.slice(start, start + displayLimit);
  }, [sorted, displayLimit, currentPage]);

  const handleLimitChange = (limit: number) => {
    setDisplayLimit(limit);
    setCurrentPage(1);
  };

  // 統計情報
  const stats = useMemo(() => {
    let win = 0, lose = 0, draw = 0;
    let totalDiff = 0;
    filtered.forEach(s => {
      if (s.scoreDiff > 0) win++;
      else if (s.scoreDiff < 0) lose++;
      else draw++;
      totalDiff += s.scoreDiff;
    });
    return { win, lose, draw, totalDiff };
  }, [filtered]);

  // スコア差分の色
  const getScoreDiffColor = (diff: number) => {
    if (diff > 0) return '#4caf50';  // 勝ち: 緑
    if (diff < 0) return '#f44336';  // 負け: 赤
    return 'inherit';
  };

  return (
    <Page>
      <PageHeader compact title="ライバル比較" />
      <SectionCard>
        <Container maxWidth="xl" sx={{ mt: 4 }}>
          <Backdrop open={loading} sx={{ zIndex: 9999, color: '#fff' }}>
            <CircularProgress color="inherit" />
          </Backdrop>

          {/* ライバルTSV読み込み */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
              ライバルのReflux TSVを読み込む
            </Typography>
            <Button variant="contained" component="label">
              TSVファイルを選択
              <input type="file" hidden accept=".tsv" onChange={handleRivalFileUpload} />
            </Button>
            {rivalLoaded && (
              <Alert severity="success" sx={{ mt: 1 }}>
                ライバルデータを読み込みました
              </Alert>
            )}
          </Box>

          {rivalLoaded && (
            <>
              <FilterPanel filters={filters} onChange={setFilters} />

              {/* 統計 */}
              <Box sx={{ mb: 2, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <Typography>
                  勝ち: <Box component="span" sx={{ color: '#4caf50', fontWeight: 700 }}>{stats.win}</Box>
                </Typography>
                <Typography>
                  負け: <Box component="span" sx={{ color: '#f44336', fontWeight: 700 }}>{stats.lose}</Box>
                </Typography>
                <Typography>
                  引き分け: <Box component="span" sx={{ fontWeight: 700 }}>{stats.draw}</Box>
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="body2" sx={{ minWidth: 120 }}>
                  全{sorted.length}件中 {displayLimit === 0 ? `1-${sorted.length}` : `${(currentPage - 1) * displayLimit + 1}-${Math.min(currentPage * displayLimit, sorted.length)}`}件
                </Typography>

                <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                  {displayLimit !== 0 && totalPages > 1 && (
                    <ButtonGroup size="small" variant="outlined">
                      <Button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>{'<<'}</Button>
                      <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>{'<'}</Button>
                      <Button sx={{ minWidth: 80, pointerEvents: 'none' }}>{currentPage} / {totalPages}</Button>
                      <Button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>{'>'}</Button>
                      <Button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>{'>>'}</Button>
                    </ButtonGroup>
                  )}
                </Box>

                <ButtonGroup size="small" variant="outlined">
                  <Button onClick={() => handleLimitChange(50)} variant={displayLimit === 50 ? 'contained' : 'outlined'}>50件</Button>
                  <Button onClick={() => handleLimitChange(100)} variant={displayLimit === 100 ? 'contained' : 'outlined'}>100件</Button>
                  <Button onClick={() => handleLimitChange(0)} variant={displayLimit === 0 ? 'contained' : 'outlined'}>全件</Button>
                </ButtonGroup>
              </Box>

              {isXs && (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>ソート</InputLabel>
                    <Select
                      label="ソート"
                      value={sortConfig.key}
                      onChange={(e) => handleSortKeyChange(e.target.value as SortKey)}
                    >
                      <MenuItem value="lv">Level</MenuItem>
                      <MenuItem value="title">Title</MenuItem>
                      <MenuItem value="scoreDiff">スコア差</MenuItem>
                      <MenuItem value="myScore">自分Score</MenuItem>
                      <MenuItem value="myGrade">自分Grade</MenuItem>
                      <MenuItem value="rivalScore">ライバルScore</MenuItem>
                      <MenuItem value="rivalGrade">ライバルGrade</MenuItem>
                    </Select>
                  </FormControl>
                  <Button variant="outlined" size="small" onClick={toggleSortDir}>
                    {sortConfig.direction === 'asc' ? '昇順' : '降順'}
                  </Button>
                </Box>
              )}

              <TableContainer sx={{ mb: 3 }}>
                <Table size="small" sx={{ minWidth: 1100, tableLayout: 'fixed', '& td, & th': { fontSize: { xs: 12, sm: 14 } } }}>
                  <colgroup>
                    <col style={{ width: 60 }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: 80 }} />
                    <col style={{ width: 80 }} />
                    <col style={{ width: 100 }} />
                    <col style={{ width: 80 }} />
                    <col style={{ width: 80 }} />
                    <col style={{ width: 100 }} />
                    <col style={{ width: 80 }} />
                  </colgroup>
                  <TableHead sx={{ display: { xs: 'none', sm: 'table-header-group' } }}>
                    <TableRow>
                      <TableCell sx={{ cursor: 'pointer', bgcolor: sortConfig.key === 'lv' ? 'action.selected' : 'inherit' }} onClick={() => handleSort('lv')}>
                        ☆ {sortConfig.key === 'lv' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </TableCell>
                      <TableCell sx={{ cursor: 'pointer', bgcolor: sortConfig.key === 'title' ? 'action.selected' : 'inherit' }} onClick={() => handleSort('title')}>
                        Title {sortConfig.key === 'title' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </TableCell>
                      <TableCell sx={{ cursor: 'pointer', textAlign: 'center', bgcolor: sortConfig.key === 'myLamp' ? 'action.selected' : 'inherit' }} onClick={() => handleSort('myLamp')}>
                        自分Lamp {sortConfig.key === 'myLamp' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </TableCell>
                      <TableCell sx={{ cursor: 'pointer', textAlign: 'center', bgcolor: sortConfig.key === 'myGrade' ? 'action.selected' : 'inherit' }} onClick={() => handleSort('myGrade')}>
                        自分Grade {sortConfig.key === 'myGrade' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </TableCell>
                      <TableCell sx={{ cursor: 'pointer', bgcolor: sortConfig.key === 'myScore' ? 'action.selected' : 'inherit' }} onClick={() => handleSort('myScore')}>
                        自分Score {sortConfig.key === 'myScore' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </TableCell>
                      <TableCell sx={{ cursor: 'pointer', textAlign: 'center', bgcolor: sortConfig.key === 'rivalLamp' ? 'action.selected' : 'inherit' }} onClick={() => handleSort('rivalLamp')}>
                        ライバルLamp {sortConfig.key === 'rivalLamp' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </TableCell>
                      <TableCell sx={{ cursor: 'pointer', textAlign: 'center', bgcolor: sortConfig.key === 'rivalGrade' ? 'action.selected' : 'inherit' }} onClick={() => handleSort('rivalGrade')}>
                        ライバルGrade {sortConfig.key === 'rivalGrade' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </TableCell>
                      <TableCell sx={{ cursor: 'pointer', bgcolor: sortConfig.key === 'rivalScore' ? 'action.selected' : 'inherit' }} onClick={() => handleSort('rivalScore')}>
                        ライバルScore {sortConfig.key === 'rivalScore' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </TableCell>
                      <TableCell sx={{ cursor: 'pointer', bgcolor: sortConfig.key === 'scoreDiff' ? 'action.selected' : 'inherit' }} onClick={() => handleSort('scoreDiff')}>
                        差分 {sortConfig.key === 'scoreDiff' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {displayed.map((s) => (
                      <React.Fragment key={`${s.id}_${s.difficulty}`}>
                        {/* PC/Tablet */}
                        <TableRow sx={{ display: { xs: 'none', sm: 'table-row' } }} hover>
                          <TableCell>⭐︎{s.level}</TableCell>
                          <TableCell>
                            {renderTitleWithDifficulty(s.title, s.difficulty, acInfDiffMap[Number(s.id)] ? ' (INFINITAS)' : undefined)}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            <Box sx={{ px: 1, borderRadius: 1, display: 'inline-block', backgroundColor: clearColorMap[s.myLamp], minWidth: 60 }}>
                              {simpleClearName[s.myLamp] ?? '-'}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            {(() => {
                              const grade = getGrade(s.myRate);
                              const detailGrade = getDetailGrade(s.myScore, s.notes);
                              const isMaxMinus = detailGrade.startsWith('MAX-');
                              const colorKey = isMaxMinus ? 'MAX-' : grade;
                              if (['A', 'AA', 'AAA'].includes(grade) || isMaxMinus) {
                                return (
                                  <Box sx={{ px: 1, borderRadius: 1, display: 'inline-block', backgroundColor: scoreColorMapLight[colorKey], minWidth: 50 }}>
                                    {detailGrade}
                                  </Box>
                                );
                              }
                              return <>{detailGrade}</>;
                            })()}
                          </TableCell>
                          <TableCell>
                            {s.myScore} ({(s.myRate * 100).toFixed(2)}%)
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            <Box sx={{ px: 1, borderRadius: 1, display: 'inline-block', backgroundColor: clearColorMap[s.rivalLamp], minWidth: 60 }}>
                              {simpleClearName[s.rivalLamp] ?? '-'}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            {(() => {
                              const grade = getGrade(s.rivalRate);
                              const detailGrade = getDetailGrade(s.rivalScore, s.notes);
                              const isMaxMinus = detailGrade.startsWith('MAX-');
                              const colorKey = isMaxMinus ? 'MAX-' : grade;
                              if (['A', 'AA', 'AAA'].includes(grade) || isMaxMinus) {
                                return (
                                  <Box sx={{ px: 1, borderRadius: 1, display: 'inline-block', backgroundColor: scoreColorMapLight[colorKey], minWidth: 50 }}>
                                    {detailGrade}
                                  </Box>
                                );
                              }
                              return <>{detailGrade}</>;
                            })()}
                          </TableCell>
                          <TableCell>
                            {s.rivalScore} ({(s.rivalRate * 100).toFixed(2)}%)
                          </TableCell>
                          <TableCell sx={{ color: getScoreDiffColor(s.scoreDiff), fontWeight: 700 }}>
                            {s.scoreDiff > 0 ? '+' : ''}{s.scoreDiff}
                          </TableCell>
                        </TableRow>

                        {/* Mobile */}
                        <TableRow sx={{ display: { xs: 'table-row', sm: 'none' } }} hover>
                          <TableCell colSpan={9} sx={{ py: 1.25 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" fontWeight={700} noWrap sx={{ flex: 1 }}>
                                {renderTitleWithDifficulty(s.title, s.difficulty, acInfDiffMap[Number(s.id)] ? ' (INFINITAS)' : undefined)}
                              </Typography>
                            </Box>
                            <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 1, fontSize: 11, color: 'text.secondary' }}>
                              <Box>
                                自分: <Box component="span" sx={{ px: 0.5, borderRadius: 1, backgroundColor: clearColorMap[s.myLamp] }}>
                                  {simpleClearName[s.myLamp]}
                                </Box> {getDetailGrade(s.myScore, s.notes)} {s.myScore}
                              </Box>
                              <Box>
                                ライバル: <Box component="span" sx={{ px: 0.5, borderRadius: 1, backgroundColor: clearColorMap[s.rivalLamp] }}>
                                  {simpleClearName[s.rivalLamp]}
                                </Box> {getDetailGrade(s.rivalScore, s.notes)} {s.rivalScore}
                              </Box>
                              <Box sx={{ color: getScoreDiffColor(s.scoreDiff), fontWeight: 700 }}>
                                差: {s.scoreDiff > 0 ? '+' : ''}{s.scoreDiff}
                              </Box>
                            </Box>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    ))}

                    {sorted.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                          条件に一致する曲がありません。
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {!rivalLoaded && (
            <Alert severity="info">
              ライバルのReflux TSVファイルを読み込んでください。
            </Alert>
          )}
        </Container>
      </SectionCard>
    </Page>
  );
};

export default RivalComparePage;
