// src/pages/DiffPage.tsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Button,
  Snackbar,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { ungzip } from 'pako';
import { compressDiffData, decompressDiffData } from '../utils/encodeUtils';
import { useAppContext } from '../context/AppContext';
import { clearColorMap, scoreColorMapLight } from '../constants/colorConstrains';
import { simpleClearName } from '../constants/clearConstrains';
import { defaultMisscount } from '../constants/defaultValues';
import { getPercentage, getDetailGrade, getGrade } from '../utils/gradeUtils';
import { Page, PageHeader } from '../components/Page';
import SectionCard from '../components/SectionCard';
import { acInfDiffMap } from '../constants/titleConstrains';
import { resolveVersionByIndex, calculateBpi } from '../utils/bpiUtils';
import { notesOverride, levelOverride, chartOverrideData } from '../constants/chartInfoConstrains';
import ChartOverrideModal from '../components/ChartOverrideModal';
import { renderTitleWithDifficulty } from '../utils/titleUtils';

const urlLengthMax = 4088;
const BPI_SERVER_URL = '';

const DiffPage = () => {
  const { mode, setMode } = useAppContext();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));

  const [titleMap, setTitleMap] = useState<{ [key: string]: string }>({});
  const [chartInfo, setChartInfo] = useState<any>({});
  const [diff, setDiff] = useState<any>({});
  const [user, setUser] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [excludeNewSongs, setExcludeNewSongs] = useState(true);
  const [isShared, setIsShared] = useState(false);
  const [isUrldataValid, setIsUrldataValid] = useState(true);
  const [bpiInfo, setBpiInfo] = useState<any>({});
  const [customBpiData, setCustomBpiData] = useState<any>({});
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  // 譜面補正モーダル
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [selectedSongForOverride, setSelectedSongForOverride] = useState<{
    id: string;
    title: string;
    difficulty: string;
    notes: number;
    level: number | string;
  } | null>(null);

  // ソート
  const [clearSortConfig, setClearSortConfig] = useState<{ key: string; direction: string }>({ key: 'lv', direction: 'desc' });
  const [scoreSortConfig, setScoreSortConfig] = useState<{ key: string; direction: string }>({ key: 'lv', direction: 'desc' });
  const [missSortConfig, setMissSortConfig] = useState<{ key: string; direction: string }>({ key: 'lv', direction: 'desc' });

  const fetchData = useCallback(async () => {
    try {
      const bpiVersionIndex = parseInt(localStorage.getItem('bpiVersion') ?? '-1') ?? -1
      const bpiVersion = await resolveVersionByIndex(bpiVersionIndex);

      // Fetch custom BPI data
      let customBpi: any = { SP: {}, DP: {} };
      try {
        const res = await fetch(`${BPI_SERVER_URL}/api/bpi`);
        if (res.ok) {
          customBpi = await res.json();
        }
      } catch {
        // Server not running, use empty data
      }

      const [
          titleRes,
          chartGz,
          bpiSpInfo,
          bpiDpInfo,
        ] = await Promise.all([
          fetch('https://chinimuruhi.github.io/IIDX-Data-Table/textage/title.json').then((res) => res.json()),
          fetch('https://chinimuruhi.github.io/IIDX-Data-Table/textage/chart-info.json.gz').then((res) => res.arrayBuffer()),
          fetch(`https://chinimuruhi.github.io/IIDX-Data-Table/bpi/${bpiVersion}/sp_dict.json`).then((res) => res.json()),
          fetch(`https://chinimuruhi.github.io/IIDX-Data-Table/bpi/${bpiVersion}/dp_dict.json`).then((res) => res.json()),
        ]);
      setTitleMap(titleRes);
      setChartInfo(JSON.parse(new TextDecoder().decode(ungzip(chartGz))));
      setBpiInfo({
        'SP': bpiSpInfo,
        'DP': bpiDpInfo
      });
      setCustomBpiData(customBpi);

      const urlParams = new URLSearchParams(window.location.search);
      const data = urlParams.get('data');
      let spUpdateCount = 0;
      let dpUpdateCount = 0;
      if (data) {
        let inflatedData;
        try {
          inflatedData = decompressDiffData(data);
        } catch {
          inflatedData = { diff: {}, user: {} };
          setIsUrldataValid(false);
        }
        spUpdateCount = inflatedData?.diff?.['SP'] ? Object.keys(inflatedData.diff['SP']).length : 0;
        dpUpdateCount = inflatedData?.diff?.['DP'] ? Object.keys(inflatedData.diff['DP']).length : 0;
        setDiff(inflatedData.diff);
        setUser(inflatedData.user);
        setIsShared(true);
      } else {
        const storedDiff = JSON.parse(localStorage.getItem('diff') || '{}');
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        spUpdateCount = storedDiff['SP'] ? Object.keys(storedDiff['SP']).length : 0;
        dpUpdateCount = storedDiff['DP'] ? Object.keys(storedDiff['DP']).length : 0;
        setDiff(storedDiff);
        setUser(storedUser);
        setIsShared(false);
      }
      if (spUpdateCount >= dpUpdateCount) {
        setMode('SP');
      } else {
        setMode('DP');
      }
    } catch (error) {
      console.error('データの読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSort = (table: 'clear' | 'score' | 'miss', key: string) => {
    let direction = 'asc';
    const cfg = table === 'clear' ? clearSortConfig : table === 'score' ? scoreSortConfig : missSortConfig;
    if (cfg.key === key && cfg.direction === 'asc') direction = 'desc';
    (table === 'clear' ? setClearSortConfig : table === 'score' ? setScoreSortConfig : setMissSortConfig)({ key, direction });
  };

  const sortedData = (data: any[], key: string, direction: 'asc' | 'desc') =>
    data.sort((a, b) => {
      const cmp = (x: number, y: number) => (direction === 'asc' ? x - y : y - x);
      if (key === 'lv') return cmp(a.lv, b.lv);
      if (key === 'title') return direction === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
      if (key === 'beforeLamp') return cmp(a.before, b.before);
      if (key === 'afterLamp') return cmp(a.after, b.after);
      if (key === 'grade') return cmp(a.afterRate, b.afterRate);
      if (key === 'score') return cmp(a.afterScore, b.afterScore);
      if (key === 'bpi'){
        const aVal = !Number.isNaN(a.bpi) ? a.bpi : a.customBpi;
        const bVal = !Number.isNaN(b.bpi) ? b.bpi : b.customBpi;
        const aBpi = Number.isNaN(aVal) ? -99 : aVal;
        const bBpi = Number.isNaN(bVal) ? -99 : bVal;
        return cmp(aBpi, bBpi);
      } 
      if (key === 'bp') return cmp(a.afterMisscount, b.afterMisscount);
      if (key === 'diff') return cmp(a.diff, b.diff);
      return 0;
    });

  const sortedDataWithState = (data: any[], table: 'clear' | 'score' | 'miss') => {
    const sortConfig = table === 'clear' ? clearSortConfig : table === 'score' ? scoreSortConfig : missSortConfig;
    return sortedData(data, sortConfig.key, sortConfig.direction as 'asc' | 'desc');
  };

  const handleCopyToClipboard = async () => {
    const data = { diff, user };
    const base64Data = compressDiffData(data);
    const currentUrl = window.location.origin + window.location.pathname;
    const url = `${currentUrl}?data=${base64Data}`;

    // 現在の日時を取得
    const now = new Date();
    const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    let text = '更新差分\n';
    if (processed.clearUpdatesCount['SP'] > 0) text += `ランプ更新(SP)： ${processed.clearUpdatesCount['SP']}件\n`;
    if (processed.scoreUpdatesCount['SP'] > 0) text += `スコア更新(SP)： ${processed.scoreUpdatesCount['SP']}件\n`;
    if (processed.missUpdatesCount['SP'] > 0) text += `BP更新(SP)： ${processed.missUpdatesCount['SP']}件\n`;
    if (processed.clearUpdatesCount['DP'] > 0) text += `ランプ更新(DP)： ${processed.clearUpdatesCount['DP']}件\n`;
    if (processed.scoreUpdatesCount['DP'] > 0) text += `スコア更新(DP)： ${processed.scoreUpdatesCount['DP']}件\n`;
    if (processed.missUpdatesCount['DP'] > 0) text += `BP更新(DP)： ${processed.missUpdatesCount['DP']}件\n`;
    text += '\n';

    if (url.length >= urlLengthMax) {
      text += `[${dateStr}](${window.location.origin + window.location.pathname})\n(更新データが多すぎるため共有URLの生成に失敗しました)`;
    } else {
      text += `[${dateStr}](${url})`;
    }

    try {
      await navigator.clipboard.writeText(text);
      setSnack({ open: true, message: 'クリップボードにコピーしました', severity: 'success' });
    } catch {
      setSnack({ open: true, message: 'コピーに失敗しました', severity: 'error' });
    }
  };

  const processed = useMemo(() => {
    const clearUpdates: { [key: string]: any } = { 'SP': [], 'DP': [] };
    const scoreUpdates: { [key: string]: any } = { 'SP': [], 'DP': [] };
    const missUpdates: { [key: string]: any } = { 'SP': [], 'DP': [] };
    const clearUpdatesCount: { [key: string]: number } = { 'SP': 0, 'DP': 0 };
    const scoreUpdatesCount: { [key: string]: number } = { 'SP': 0, 'DP': 0 };
    const missUpdatesCount: { [key: string]: number } = { 'SP': 0, 'DP': 0 };
    const isContainBpi: { [key: string]: boolean } = { 'SP': false, 'DP': false };

    for (const m of Object.keys(clearUpdatesCount)) {
      if (diff[m]) {
        for (const id in diff[m]) {
          for (const difficulty in diff[m][id]) {
            const entry = diff[m][id][difficulty];
            const idx = ['B', 'N', 'H', 'A', 'L'].indexOf(difficulty);
            const overrideKey = `${id}_${difficulty}`;
            const lvRaw = chartInfo[id]?.level?.[m.toLowerCase()]?.[idx] ?? 'N/A';
            const lv = levelOverride[overrideKey] ?? lvRaw;
            const notesRaw = chartInfo[id]?.notes?.[m.toLowerCase()]?.[idx] ?? 0;
            const notes = notesOverride[overrideKey] ?? notesRaw;
            const title = titleMap[id] || id;

            if (entry?.cleartype?.new !== entry?.cleartype?.old && entry?.cleartype?.new > 1) {
              clearUpdatesCount[m]++;
              if (excludeNewSongs && entry?.cleartype?.old === 0) continue;
              clearUpdates[m].push({
                id, title, difficulty, lv,
                before: entry.cleartype.old,
                after: entry.cleartype.new,
                colorBefore: clearColorMap[entry.cleartype.old],
                colorAfter: clearColorMap[entry.cleartype.new],
              });
            }

            if (entry?.score?.new !== entry?.score?.old) {
              scoreUpdatesCount[m]++;
              if (excludeNewSongs && entry?.cleartype?.old === 0) continue;
              const pBefore = getPercentage(entry.score.old, notes);
              const pAfter = getPercentage(entry.score.new, notes);

              // Calculate official BPI
              const bpiInfoEntry = bpiInfo?.[m]?.[id]?.[difficulty];
              const bpi = bpiInfoEntry ? calculateBpi(bpiInfoEntry.wr, bpiInfoEntry.avg, bpiInfoEntry.notes, entry.score.new, bpiInfoEntry.coef) : NaN;
              if(!Number.isNaN(bpi)){
                isContainBpi[m] = true;
              }

              // Calculate custom BPI
              const customBpiEntry = customBpiData?.[m]?.[`${id}_${difficulty}`];
              const customBpi = customBpiEntry && entry.score.new ? calculateBpi(customBpiEntry.wr, customBpiEntry.avg, notes, entry.score.new, -1) : NaN;
              if(!Number.isNaN(customBpi)){
                isContainBpi[m] = true;
              }

              scoreUpdates[m].push({
                id, title, difficulty, lv, notes, bpi, customBpi,
                beforeScore: entry.score.old,
                afterScore: entry.score.new,
                beforeRate: pBefore,
                afterRate: pAfter,
                diff: entry.score.new - entry.score.old,
              });
            }

            if (entry?.misscount?.new !== entry?.misscount?.old) {
              missUpdatesCount[m]++;
              if (excludeNewSongs && entry?.misscount?.old === defaultMisscount) continue;
              missUpdates[m].push({
                id, title, difficulty, lv,
                afterMisscount: entry.misscount.new === defaultMisscount ? '-' : entry.misscount.new,
                diff: entry.misscount.old === defaultMisscount ? defaultMisscount : entry.misscount.new - entry.misscount.old,
              });
            }
          }
        }
      }
    }

    return {
      clearUpdates: {
        'SP': sortedData(clearUpdates['SP'], 'afterLamp', 'desc'),
        'DP': sortedData(clearUpdates['DP'], 'afterLamp', 'desc')
      },
      scoreUpdates: {
        'SP': sortedData(scoreUpdates['SP'], 'bpi', 'desc'),
        'DP': sortedData(scoreUpdates['DP'], 'bpi', 'desc')
      },
      missUpdates: {
        'SP': sortedData(missUpdates['SP'], 'bp', 'asc'),
        'DP': sortedData(missUpdates['DP'], 'bp', 'desc')
      },
      clearUpdatesCount, scoreUpdatesCount, missUpdatesCount, isContainBpi
    };
  }, [diff, chartInfo, titleMap, excludeNewSongs, bpiInfo, customBpiData]);

  const hasUpdates = processed.clearUpdates[mode].length > 0 || processed.scoreUpdates[mode].length > 0 || processed.missUpdates[mode].length > 0;

  if (loading) return <CircularProgress />;

  // PageHeader のタイトル（スマホで日付を改行）
  const headerTitle = isUrldataValid ? (
    <>
      {user.djname ? `${user.djname}さんの` : ''}更新差分
      {user.lastupdated && (
        <Box component="span" sx={{ display: { xs: 'block', sm: 'inline' } }}>
          {' '}({user.lastupdated})
        </Box>
      )}
    </>
  ) : '更新差分';

  // クリップボードにコピー（ヘッダー actions に設置：スマホはタイトルの下に表示）
  const headerActions = (!isShared && hasUpdates && isUrldataValid) ? (
    <Button
      variant="contained"
      onClick={handleCopyToClipboard}
      size={isXs ? 'small' : 'medium'}
      sx={{
        fontWeight: 700,
      }}
    >
      共有用テキストをコピー
    </Button>
  ) : null;

  return (
    <Page>
      <PageHeader compact title={headerTitle} actions={headerActions} />
      <SectionCard dense>
        <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
          {isUrldataValid && (
            <FormControlLabel
              control={<Checkbox checked={excludeNewSongs} onChange={(e) => setExcludeNewSongs(e.target.checked)} />}
              label="初プレー楽曲を除外する"
              sx={{ my: 1.5, '& .MuiFormControlLabel-label': { fontSize: { xs: 13, sm: 14 } } }}
            />
          )}

          {/* ランプ更新 */}
          {processed.clearUpdates[mode].length > 0 && (
            <>
              <Typography variant="h6" sx={{ mb: 1 }}>ランプ更新</Typography>
              <TableContainer component={Paper} sx={{ mb: 2, overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 520, '& td, & th': { fontSize: { xs: 12, sm: 14 } } }}>
                  <TableHead>
                    <TableRow sx={{ display: { xs: 'none', sm: 'table-row' } }}>
                      <TableCell sx={{ cursor: 'pointer' }} onClick={() => handleSort('clear', 'lv')}>☆</TableCell>
                      <TableCell onClick={() => handleSort('clear', 'title')}>Title</TableCell>
                      <TableCell sx={{ textAlign: 'center' }} onClick={() => handleSort('clear', 'beforeLamp')}>Before</TableCell>
                      <TableCell />
                      <TableCell sx={{ textAlign: 'center' }} onClick={() => handleSort('clear', 'afterLamp')}>After</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedDataWithState(processed.clearUpdates[mode], 'clear').map((row) => (
                      <React.Fragment key={`${row.id}_${row.difficulty}`}>
                        {/* PC/Tablet */}
                        <TableRow sx={{ display: { xs: 'none', sm: 'table-row' } }} >
                          <TableCell>☆{row.lv}</TableCell>
                          <TableCell>{renderTitleWithDifficulty(row.title, row.difficulty, acInfDiffMap[Number(row.id)] ? ' (INFINITAS)': '')}</TableCell>
                          <TableCell sx={{ textAlign: 'center' }}><Box sx={{ px: 1, borderRadius: 1, display: 'inline-block', backgroundColor: row.colorBefore }}>{simpleClearName[row.before]}</Box></TableCell>
                          <TableCell sx={{ px: 0, textAlign: 'center' }}>→</TableCell>
                          <TableCell sx={{ textAlign: 'center' }}><Box sx={{ px: 1, borderRadius: 1, display: 'inline-block', backgroundColor: row.colorAfter }}>{simpleClearName[row.after]}</Box></TableCell>
                        </TableRow>

                        {/* Mobile */}
                        <TableRow sx={{ display: { xs: 'table-row', sm: 'none' } }} >
                          <TableCell colSpan={5} sx={{ py: 1.25 }}>
                            <Typography variant="body2" fontWeight={700} noWrap>
                              {renderTitleWithDifficulty(row.title, row.difficulty, `${acInfDiffMap[Number(row.id)] ? ' (INFINITAS)': ''} ／ ☆${row.lv}`)}
                            </Typography>
                            <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 1, fontSize: 12 }}>
                              <Box sx={{ px: 1, borderRadius: 1, bgcolor: row.colorBefore }}>{simpleClearName[row.before]}</Box>
                              <Box sx={{ px: 0.5 }}>→</Box>
                              <Box sx={{ px: 1, borderRadius: 1, bgcolor: row.colorAfter }}>{simpleClearName[row.after]}</Box>
                            </Box>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {/* スコア更新 */}
          {processed.scoreUpdates[mode].length > 0 && (
            <>
              <Typography variant="h6" sx={{ mb: 1 }}>スコア更新</Typography>
              <TableContainer component={Paper} sx={{ mb: 2, overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 520, '& td, & th': { fontSize: { xs: 12, sm: 14 } } }}>
                  <TableHead>
                    <TableRow sx={{ display: { xs: 'none', sm: 'table-row' } }}>
                      <TableCell sx={{ cursor: 'pointer' }} onClick={() => handleSort('score', 'lv')}>☆</TableCell>
                      <TableCell onClick={() => handleSort('score', 'title')}>Title</TableCell>
                      {processed.isContainBpi[mode] && <TableCell onClick={() => handleSort('score', 'bpi')}>BPI</TableCell>}
                      <TableCell sx={{ textAlign: 'center' }}>Before</TableCell>
                      <TableCell sx={{ width: 20, px: 0 }} />
                      <TableCell sx={{ textAlign: 'center' }} onClick={() => handleSort('score', 'grade')}>After</TableCell>
                      <TableCell sx={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('score', 'score')}>Score(%)</TableCell>
                      <TableCell sx={{ textAlign: 'center' }} onClick={() => handleSort('score', 'diff')}>Diff</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedDataWithState(processed.scoreUpdates[mode], 'score').map((row) => {
                      const isInvalid = row.notes === 0 || row.lv === 'N/A';
                      const handleEditClick = () => {
                        setSelectedSongForOverride({
                          id: row.id,
                          title: row.title,
                          difficulty: row.difficulty,
                          notes: row.notes,
                          level: row.lv
                        });
                        setOverrideModalOpen(true);
                      };
                      return (
                      <React.Fragment key={`${row.id}_${row.difficulty}`}>
                        {/* PC/Tablet */}
                        <TableRow sx={{ display: { xs: 'none', sm: 'table-row' } }} >
                          <TableCell>☆{row.lv}</TableCell>
                          <TableCell>
                            {renderTitleWithDifficulty(row.title, row.difficulty, acInfDiffMap[Number(row.id)] ? ' (INFINITAS)': '')}
                            {isInvalid && (
                              <Tooltip title="譜面情報を補正">
                                <IconButton size="small" onClick={handleEditClick} sx={{ ml: 0.5 }}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                          {processed.isContainBpi[mode] && (
                            <TableCell>
                              {!Number.isNaN(row.bpi) ? (
                                <>
                                  {row.bpi.toFixed(2)}
                                  {!Number.isNaN(row.customBpi) && ` (${row.customBpi.toFixed(2)} *)`}
                                </>
                              ) : !Number.isNaN(row.customBpi) ? (
                                `${row.customBpi.toFixed(2)} *`
                              ) : ''}
                            </TableCell>
                          )}
                          <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                            {isInvalid ? 'invalidScore' : (() => {
                              const grade = getGrade(row.beforeRate);
                              const detailGrade = getDetailGrade(row.beforeScore, row.notes);
                              const isMaxMinus = detailGrade.startsWith('MAX-');
                              const colorKey = isMaxMinus ? 'MAX-' : grade;
                              if (['A', 'AA', 'AAA'].includes(grade)) {
                                return (
                                  <Box sx={{ px: 1, borderRadius: 1, display: 'inline-block', backgroundColor: scoreColorMapLight[colorKey], textAlign: 'center', minWidth: 60 }}>
                                    {grade} ({detailGrade})
                                  </Box>
                                );
                              }
                              return <>{grade} ({detailGrade})</>;
                            })()}
                          </TableCell>
                          <TableCell sx={{ width: 20, px: 0, textAlign: 'center' }}>→</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                            {isInvalid ? 'invalidScore' : (() => {
                              const grade = getGrade(row.afterRate);
                              const detailGrade = getDetailGrade(row.afterScore, row.notes);
                              const isMaxMinus = detailGrade.startsWith('MAX-');
                              const colorKey = isMaxMinus ? 'MAX-' : grade;
                              if (['A', 'AA', 'AAA'].includes(grade)) {
                                return (
                                  <Box sx={{ px: 1, borderRadius: 1, display: 'inline-block', backgroundColor: scoreColorMapLight[colorKey], textAlign: 'center', minWidth: 60 }}>
                                    {grade} ({detailGrade})
                                  </Box>
                                );
                              }
                              return <>{grade} ({detailGrade})</>;
                            })()}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>{row.afterScore} ({isInvalid ? '-' : (row.afterRate * 100).toFixed(2)}%)</TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>+{row.diff}</TableCell>
                        </TableRow>

                        {/* Mobile */}
                        <TableRow sx={{ display: { xs: 'table-row', sm: 'none' } }} >
                          <TableCell colSpan={5} sx={{ py: 1.25 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="body2" fontWeight={700} noWrap sx={{ flex: 1 }}>
                                {renderTitleWithDifficulty(row.title, row.difficulty, `${acInfDiffMap[Number(row.id)] ? ' (INFINITAS)': ''} ／ ☆${row.lv}`)}
                              </Typography>
                              {isInvalid && (
                                <IconButton size="small" onClick={handleEditClick}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              )}
                            </Box>
                            <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', color: 'text.secondary', fontSize: 11 }}>
                              {(!Number.isNaN(row.bpi) || !Number.isNaN(row.customBpi)) && (
                                <Box>
                                  BPI: {!Number.isNaN(row.bpi) ? (
                                    <>
                                      {row.bpi.toFixed(2)}
                                      {!Number.isNaN(row.customBpi) && ` (${row.customBpi.toFixed(2)} *)`}
                                    </>
                                  ) : `${row.customBpi.toFixed(2)} *`}
                                </Box>
                              )}
                              {isInvalid ? (
                                <Box>invalidScore</Box>
                              ) : (
                                <>
                                  {(() => {
                                    const grade = getGrade(row.beforeRate);
                                    const detailGrade = getDetailGrade(row.beforeScore, row.notes);
                                    const isMaxMinus = detailGrade.startsWith('MAX-');
                                    const colorKey = isMaxMinus ? 'MAX-' : grade;
                                    if (['A', 'AA', 'AAA'].includes(grade)) {
                                      return (
                                        <Box sx={{ px: 1, borderRadius: 1, display: 'inline-block', backgroundColor: scoreColorMapLight[colorKey] }}>
                                          {grade} ({detailGrade})
                                        </Box>
                                      );
                                    }
                                    return <Box>{grade} ({detailGrade})</Box>;
                                  })()}
                                  <Box sx={{ px: 0.5 }}>→</Box>
                                  {(() => {
                                    const grade = getGrade(row.afterRate);
                                    const detailGrade = getDetailGrade(row.afterScore, row.notes);
                                    const isMaxMinus = detailGrade.startsWith('MAX-');
                                    const colorKey = isMaxMinus ? 'MAX-' : grade;
                                    if (['A', 'AA', 'AAA'].includes(grade)) {
                                      return (
                                        <Box sx={{ px: 1, borderRadius: 1, display: 'inline-block', backgroundColor: scoreColorMapLight[colorKey] }}>
                                          {grade} ({detailGrade})
                                        </Box>
                                      );
                                    }
                                    return <Box>{grade} ({detailGrade})</Box>;
                                  })()}
                                </>
                              )}
                              <Box>Score: {row.afterScore} ({isInvalid ? '-' : (row.afterRate * 100).toFixed(2)}%)</Box>
                              <Box>Diff: +{row.diff}</Box>
                            </Box>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );})}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {/* BP更新 */}
          {processed.missUpdates[mode].length > 0 && (
            <>
              <Typography variant="h6" sx={{ mb: 1 }}>BP更新</Typography>
              <TableContainer component={Paper} sx={{ mb: 0, overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 520, '& td, & th': { fontSize: { xs: 12, sm: 14 } } }}>
                  <TableHead>
                    <TableRow sx={{ display: { xs: 'none', sm: 'table-row' } }}>
                      <TableCell sx={{ cursor: 'pointer' }} onClick={() => handleSort('miss', 'lv')}>☆</TableCell>
                      <TableCell onClick={() => handleSort('miss', 'title')}>Title</TableCell>
                      <TableCell sx={{ textAlign: 'center' }} onClick={() => handleSort('miss', 'bp')}>BP</TableCell>
                      <TableCell sx={{ textAlign: 'center' }} onClick={() => handleSort('miss', 'diff')}>Diff</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedDataWithState(processed.missUpdates[mode], 'miss').map((row) => (
                      <React.Fragment key={`${row.id}_${row.difficulty}`}>
                        {/* PC/Tablet */}
                        <TableRow sx={{ display: { xs: 'none', sm: 'table-row' } }} >
                          <TableCell>☆{row.lv}</TableCell>
                          <TableCell>{renderTitleWithDifficulty(row.title, row.difficulty, acInfDiffMap[Number(row.id)] ? ' (INFINITAS)': '')}</TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>{row.afterMisscount}</TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>{row.diff !== defaultMisscount ? row.diff : ''}</TableCell>
                        </TableRow>

                        {/* Mobile */}
                        <TableRow sx={{ display: { xs: 'table-row', sm: 'none' } }} >
                          <TableCell colSpan={4} sx={{ py: 1.25 }}>
                            <Typography variant="body2" fontWeight={700} noWrap>
                              {renderTitleWithDifficulty(row.title, row.difficulty, `${acInfDiffMap[Number(row.id)] ? ' (INFINITAS)': ''} ／ ☆${row.lv}`)}
                            </Typography>
                            <Box sx={{ mt: 0.5, display: 'flex', gap: 1.25, color: 'text.secondary', fontSize: 12 }}>
                              <span>BP: {row.afterMisscount}</span>
                              <span>{row.diff !== defaultMisscount ? `Diff: ${row.diff}` : ''}</span>
                            </Box>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          {isShared && !isUrldataValid && <Typography variant="h6">共有データが破損しているため表示できませんでした。</Typography>}
          {!hasUpdates && isUrldataValid && <Typography variant="h6">更新がありません</Typography>}
        </Box>
      </SectionCard>

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>

      <ChartOverrideModal
        open={overrideModalOpen}
        onClose={() => setOverrideModalOpen(false)}
        songInfo={selectedSongForOverride}
        existingData={selectedSongForOverride ? chartOverrideData[`${selectedSongForOverride.id}_${selectedSongForOverride.difficulty}`] : null}
        onSave={() => {
          setSnack({ open: true, message: '保存しました。', severity: 'success' });
        }}
      />
    </Page>
  );
};

export default DiffPage;
