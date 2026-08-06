import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Container, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, FormControl, InputLabel, Select, MenuItem,
  Box, Backdrop, CircularProgress, Button, ButtonGroup, IconButton,
  Snackbar, Alert
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CalculateIcon from '@mui/icons-material/Calculate';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Page, PageHeader } from '../components/Page';
import SectionCard from '../components/SectionCard';
import FilterPanel from '../components/FilterPanel';
import { useAppContext } from '../context/AppContext';

import { difficultyKey } from '../constants/difficultyConstrains';
import { notesOverride, levelOverride, inInfOverride } from '../constants/chartInfoConstrains';
import { clearColorMap, scoreColorMapLight } from '../constants/colorConstrains';
import { simpleClearName } from '../constants/clearConstrains';
import { defaultMisscount } from '../constants/defaultValues';

import { getPercentage, getDetailGrade, getGrade } from '../utils/gradeUtils';
import { generateSearchText, renderTitleWithDifficulty } from '../utils/titleUtils';
import { isMatchSong } from '../utils/filterUtils';
import { convertDataToIdDiffKey } from '../utils/scoreDataUtils';
import { acInfDiffMap } from '../constants/titleConstrains';
import { calculateBpi } from '../utils/bpiUtils';
import LampAchieveProgress from '../components/LampAchieveProgress';
import GradeAchieveProgress from '../components/GradeAchieveProgress';
import { getLampAchiveCount, getGradeAchiveCount } from '../utils/lampUtils';
import BpiInputModal from '../components/BpiInputModal';
import BpiCalcModal from '../components/BpiCalcModal';
import RecommendModal from '../components/RecommendModal';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import { fetchJsonWithFallback, fetchGzipJsonWithFallback } from '../utils/fetchWithFallback';
import { fetchCustomBpi } from '../utils/customBpiClient';

const isEditable = import.meta.env.DEV;

type SongRow = {
  id: string;
  difficulty: string;
  diffIndex: number;
  level: number;
  notes: number;
  title: string;
  normalizedTitle: string;
  lamp: number,
  score: number,
  rate: number,
  bpi: number,
  customBpi: number,  // カスタムBPI値（なければNaN）
  bp: number
};

type SortKey = 'lv' | 'title' | 'cleartype' | 'grade' | 'score' | 'bp' | 'bpi';
type SortDir = 'asc' | 'desc';

const SongTablePage: React.FC = () => {
  const { mode, filters, setFilters } = useAppContext();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));

  const [chartInfo, setChartInfo] = useState<any>({});
  const [songInfo, setSongInfo] = useState<any>({});
  const [konamiInfInfo, setKonamiInfInfo] = useState<any>({});

  const [clearData, setClearData] = useState<Record<string, number>>({});
  const [scoreData, setScoreData] = useState<Record<string, number>>({});
  const [missData, setMissData] = useState<Record<string, number>>({});
  const [unlockedData, setUnlockedData] = useState<Record<string, boolean>>({});
  const [bpiInfo, setBpiInfo] = useState<any>({});

  const [songs, setSongs] = useState<SongRow[]>([]);
  const [loading, setLoading] = useState(true);
  const selectedLevel = filters.level ?? 12;

  // Custom BPI data
  const [customBpiData, setCustomBpiData] = useState<any>({});
  const [bpiModalOpen, setBpiModalOpen] = useState(false);
  const [selectedSongForBpi, setSelectedSongForBpi] = useState<SongRow | null>(null);

  // BPI calc modal
  const [bpiCalcModalOpen, setBpiCalcModalOpen] = useState(false);
  const [selectedSongForCalc, setSelectedSongForCalc] = useState<SongRow | null>(null);

  // Recommend modal
  const [recommendModalOpen, setRecommendModalOpen] = useState(false);

  // BPI version selection
  const [versions, setVersions] = useState<string[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number>(0);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDir }>({
    key: 'grade',
    direction: 'desc',
  });
  const [displayLimit, setDisplayLimit] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : {
          key,
          direction:
            key === 'bp' ? 'asc' :
              key === 'lv' ? 'desc' :
                key === 'score' ? 'desc' :
                  key === 'grade' ? 'desc' : 'asc',
        }
    );
  };
  const handleSortKeyChange = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction:
        key === 'bp' ? 'asc' :
          key === 'lv' ? 'desc' :
            key === 'score' ? 'desc' :
              key === 'grade' ? 'desc' :
                prev.direction,
    }));
  };
  const toggleSortDir = () =>
    setSortConfig((s) => ({ ...s, direction: s.direction === 'asc' ? 'desc' : 'asc' }));

  // Fetch custom BPI data
  const fetchCustomBpiData = useCallback(async () => {
    const data = await fetchCustomBpi();
    setCustomBpiData(data);
    return data;
  }, []);

  // Load BPI versions on mount
  useEffect(() => {
    fetchJsonWithFallback<string[]>('https://chinimuruhi.github.io/IIDX-Data-Table/bpi/versions.json')
      .then((arr: string[]) => {
        setVersions(arr);
        const saved = localStorage.getItem('bpiVersion');
        if (saved !== null) {
          const idx = parseInt(saved, 10);
          if (!isNaN(idx) && idx >= 0 && arr[idx]) {
            setSelectedVersion(idx);
          } else {
            // Default to latest (index 0)
            setSelectedVersion(0);
            localStorage.setItem('bpiVersion', '0');
          }
        } else {
          // Default to latest (index 0)
          setSelectedVersion(0);
          localStorage.setItem('bpiVersion', '0');
        }
      })
      .catch(() => {
        setSnack({ open: true, message: 'バージョンリストの取得に失敗しました。', severity: 'error' });
      });
  }, []);

  // Handle version change
  const handleVersionChange = (newVersion: number) => {
    setSelectedVersion(newVersion);
    localStorage.setItem('bpiVersion', String(newVersion));
    setSnack({ open: true, message: 'BPI定義ファイルを変更しました。', severity: 'success' });
  };

  useEffect(() => {
    if (versions.length === 0) return; // Wait for versions to load

    const fetchAll = async () => {
      setLoading(true);
      try {
        const bpiVersion = versions[selectedVersion] || versions[0];
        const [
          titleRes,
          songInfoJson,
          chartJson,
          konamiRes,
          bpiSpInfo,
          bpiDpInfo,
          customBpi,
        ] = await Promise.all([
          fetchJsonWithFallback<{ [key: string]: string }>('https://chinimuruhi.github.io/IIDX-Data-Table/textage/title.json'),
          fetchGzipJsonWithFallback<any>('https://chinimuruhi.github.io/IIDX-Data-Table/textage/song-info.json.gz'),
          fetchGzipJsonWithFallback<any>('https://chinimuruhi.github.io/IIDX-Data-Table/textage/chart-info.json.gz'),
          fetchJsonWithFallback<any>('https://chinimuruhi.github.io/IIDX-Data-Table/konami/song_to_label.json'),
          fetchJsonWithFallback<any>(`https://chinimuruhi.github.io/IIDX-Data-Table/bpi/${bpiVersion}/sp_dict.json`),
          fetchJsonWithFallback<any>(`https://chinimuruhi.github.io/IIDX-Data-Table/bpi/${bpiVersion}/dp_dict.json`),
          fetchCustomBpiData(),
        ]);

        setSongInfo(songInfoJson);
        setChartInfo(chartJson);
        setKonamiInfInfo(konamiRes);
        const bpiInfoRes = {
          'SP': bpiSpInfo,
          'DP': bpiDpInfo
        };
        setBpiInfo(bpiInfoRes);

        const local = JSON.parse(localStorage.getItem('data') || '{}');
        const { clear: clearRes, score: scoreRes, misscount: missRes, unlocked: unlockedRes } = convertDataToIdDiffKey(local, mode);
        setClearData(clearRes);
        setScoreData(scoreRes ?? {});
        setMissData(missRes);
        setUnlockedData(unlockedRes);

        const list: SongRow[] = [];
        for (const id of Object.keys(titleRes)) {
          const c = chartJson[id];
          if (!c) continue;
          // in_inf のオーバーライドを適用
          const inInf = inInfOverride[id] ?? c.in_inf;
          if (!(c.in_ac || inInf)) continue;

          for (const diff of difficultyKey) {
            const diffIndex = difficultyKey.indexOf(diff);
            const key = `${id}_${diff}`;
            // レベル: chartInfoが0の場合はlevelOverrideからフォールバック
            const chartLevel = c.level?.[mode.toLowerCase()]?.[diffIndex] ?? 0;
            const lv = chartLevel > 0 ? chartLevel : (levelOverride[key] ?? 0);
            if (!lv) continue;

            // ノーツ数: chartInfoが0の場合はnotesOverrideからフォールバック
            const chartNotes = c.notes?.[mode.toLowerCase()]?.[diffIndex] ?? 0;
            const notes = chartNotes > 0 ? chartNotes : (notesOverride[key] ?? 0);
            const title = titleRes[id] ?? id;
            const lamp = clearRes[key] ?? 0;
            const score = scoreRes[key] ?? 0;
            const rate = getPercentage(score, notes);
            const bp = missRes[key] ?? defaultMisscount;

            // Calculate both remote and custom BPI
            const customBpiEntry = customBpi?.[mode]?.[key];
            const bpiInfoEntry = bpiInfoRes?.[mode]?.[id]?.[diff];

            // Remote BPI (official data)
            let bpi: number = NaN;
            if (bpiInfoEntry && score) {
              bpi = calculateBpi(bpiInfoEntry.wr, bpiInfoEntry.avg, bpiInfoEntry.notes, score, bpiInfoEntry.coef) ?? NaN;
            }

            // Custom BPI (user-defined)
            let customBpiValue: number = NaN;
            if (customBpiEntry && score) {
              customBpiValue = calculateBpi(customBpiEntry.wr, customBpiEntry.avg, notes, score, -1) ?? NaN;
            }

            list.push({
              id,
              difficulty: diff,
              diffIndex,
              level: lv,
              notes,
              title,
              normalizedTitle: generateSearchText(title),
              lamp,
              score,
              rate,
              bp,
              bpi,
              customBpi: customBpiValue
            });
          }
        }
        setSongs(list);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [mode, fetchCustomBpiData, versions, selectedVersion]);

  // Open BPI input modal
  const handleOpenBpiModal = (song: SongRow) => {
    setSelectedSongForBpi(song);
    setBpiModalOpen(true);
  };

  // Handle BPI save - reload data
  const handleBpiSave = async () => {
    const newCustomBpi = await fetchCustomBpiData();
    // Recalculate custom BPI for all songs
    setSongs(prevSongs => prevSongs.map(s => {
      const key = `${s.id}_${s.difficulty}`;
      const customBpiEntry = newCustomBpi?.[mode]?.[key];

      let customBpiValue: number = NaN;
      if (customBpiEntry && s.score) {
        customBpiValue = calculateBpi(customBpiEntry.wr, customBpiEntry.avg, s.notes, s.score, -1) ?? NaN;
      }

      return { ...s, customBpi: customBpiValue };
    }));
  };

  const filtered = useMemo(() => {
    return songs
      .filter(s => {
        if (s.level !== selectedLevel) return false;

        const key = `${s.id}_${s.difficulty}`;
        const lamp = clearData[key] ?? 0;
        const konami = konamiInfInfo[s.id] || {};
        const chart = chartInfo[s.id] || {};
        const unlocked = unlockedData[key] ?? false;
        const version = songInfo[s.id]?.version;
        const label = konamiInfInfo[s.id]?.label;

        return isMatchSong(filters, lamp, s.difficulty, konami, chart, unlocked, version, label, s.rate);
      });
  }, [songs, selectedLevel, filters, clearData, chartInfo, konamiInfInfo, unlockedData, songInfo]);

  const totalCount = filtered.length;

  const lampStats = useMemo(() => {
    // getLampAchiveCount expects { id, difficulty } format
    const lampData: Record<string, number> = {};
    filtered.forEach(s => {
      lampData[`${s.id}_${s.difficulty}`] = s.lamp;
    });
    return getLampAchiveCount(filtered, lampData);
  }, [filtered]);

  const gradeStats = useMemo(() => {
    return getGradeAchiveCount(filtered);
  }, [filtered]);

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
        case 'cleartype': 
          return cmpNum(a.lamp, b.lamp);
        case 'grade': 
          return cmpNum(a.rate, b.rate);
        case 'score':
          return cmpNum(a.score, b.score);
        case 'bp': 
          return cmpNum(a.bp, b.bp);
        case 'bpi': {
          // 公式BPIを優先、なければcustomBpiを使用
          const aVal = !Number.isNaN(a.bpi) ? a.bpi : a.customBpi;
          const bVal = !Number.isNaN(b.bpi) ? b.bpi : b.customBpi;
          const aIsNaN = Number.isNaN(aVal);
          const bIsNaN = Number.isNaN(bVal);
          if (aIsNaN && bIsNaN) return 0;
          if (aIsNaN) return 1;
          if (bIsNaN) return -1;
          return cmpNum(aVal, bVal);
        }
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

  return (
    <Page>
      <PageHeader compact title="楽曲一覧" />
      <SectionCard>
        <Container maxWidth="xl" sx={{ mt: 4 }}>
          <Backdrop open={loading} sx={{ zIndex: 9999, color: '#fff' }}>
            <CircularProgress color="inherit" />
          </Backdrop>

          <FilterPanel filters={filters} onChange={setFilters} />

          {selectedLevel >= 11 && versions.length > 0 && (
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                BPI定義:
              </Typography>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <Select
                  value={selectedVersion}
                  onChange={(e) => handleVersionChange(Number(e.target.value))}
                >
                  {versions.map((v, i) => (
                    <MenuItem key={i} value={i}>
                      {v}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', mb: 2 }}>
            <Box sx={{ flex: 1, minWidth: 250 }}>
              <LampAchieveProgress stats={lampStats} totalCount={totalCount} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 250 }}>
              <GradeAchieveProgress stats={gradeStats} totalCount={totalCount} />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="body2" sx={{ minWidth: 120 }}>
              全{sorted.length}件中 {displayLimit === 0 ? `1-${sorted.length}` : `${(currentPage - 1) * displayLimit + 1}-${Math.min(currentPage * displayLimit, sorted.length)}`}件
            </Typography>

            <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              {displayLimit !== 0 && totalPages > 1 && (
                <ButtonGroup size="small" variant="outlined">
                  <Button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    {'<<'}
                  </Button>
                  <Button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    {'<'}
                  </Button>
                  <Button sx={{ minWidth: 80, pointerEvents: 'none' }}>
                    {currentPage} / {totalPages}
                  </Button>
                  <Button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    {'>'}
                  </Button>
                  <Button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    {'>>'}
                  </Button>
                </ButtonGroup>
              )}
            </Box>

            <ButtonGroup size="small" variant="outlined">
              <Button
                onClick={() => handleLimitChange(50)}
                variant={displayLimit === 50 ? 'contained' : 'outlined'}
              >
                50件
              </Button>
              <Button
                onClick={() => handleLimitChange(100)}
                variant={displayLimit === 100 ? 'contained' : 'outlined'}
              >
                100件
              </Button>
              <Button
                onClick={() => handleLimitChange(0)}
                variant={displayLimit === 0 ? 'contained' : 'outlined'}
              >
                全件
              </Button>
            </ButtonGroup>

            <Button
              variant="outlined"
              startIcon={<TipsAndUpdatesIcon />}
              onClick={() => setRecommendModalOpen(true)}
              size="small"
            >
              リコメンド
            </Button>
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
                  <MenuItem value="cleartype">Lamp</MenuItem>
                  <MenuItem value="grade">Grade</MenuItem>
                  {selectedLevel >= 11 &&
                    <MenuItem value="bpi">BPI</MenuItem>
                  }
                  <MenuItem value="score">Score</MenuItem>
                  <MenuItem value="bp">BP</MenuItem>
                </Select>
              </FormControl>
              <Button variant="outlined" size="small" onClick={toggleSortDir}>
                {sortConfig.direction === 'asc' ? '昇順' : '降順'}
              </Button>
            </Box>
          )}

          <TableContainer sx={{ mb: 3 }}>
            <Table size="small" sx={{ minWidth: 700, tableLayout: 'fixed', '& td, & th': { fontSize: { xs: 12, sm: 14 } } }}>
              <colgroup>
                <col style={{ width: 70 }} />
                <col style={{ width: '30%' }} />
                <col style={{ width: 110 }} />
                <col style={{ width: 110 }} />
                {selectedLevel >= 11 && <col style={{ width: 80 }} />}
                <col style={{ width: 140 }} />
                <col style={{ width: 80 }} />
                {selectedLevel >= 11 && <col style={{ width: 44 }} />}
                {selectedLevel >= 11 && <col style={{ width: 50 }} />}
              </colgroup>
              {/* PC/Tablet: 通常ヘッダ */}
              <TableHead sx={{ display: { xs: 'none', sm: 'table-header-group' } }}>
                <TableRow>
                  <TableCell sx={{ cursor: 'pointer', bgcolor: sortConfig.key === 'lv' ? 'action.selected' : 'inherit' }} onClick={() => handleSort('lv')}>
                    ☆ {sortConfig.key === 'lv' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </TableCell>
                  <TableCell sx={{ cursor: 'pointer', bgcolor: sortConfig.key === 'title' ? 'action.selected' : 'inherit' }} onClick={() => handleSort('title')}>
                    Title {sortConfig.key === 'title' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </TableCell>
                  <TableCell sx={{ cursor: 'pointer', textAlign: 'center', bgcolor: sortConfig.key === 'cleartype' ? 'action.selected' : 'inherit' }} onClick={() => handleSort('cleartype')}>
                    Lamp {sortConfig.key === 'cleartype' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </TableCell>
                  <TableCell sx={{ cursor: 'pointer', bgcolor: sortConfig.key === 'grade' ? 'action.selected' : 'inherit' }} onClick={() => handleSort('grade')}>
                    Grade {sortConfig.key === 'grade' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </TableCell>
                  {selectedLevel >= 11 &&
                    <TableCell sx={{ cursor: 'pointer', bgcolor: sortConfig.key === 'bpi' ? 'action.selected' : 'inherit' }} onClick={() => handleSort('bpi')}>
                      BPI {sortConfig.key === 'bpi' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </TableCell>
                  }
                  <TableCell sx={{ cursor: 'pointer', bgcolor: sortConfig.key === 'score' ? 'action.selected' : 'inherit' }} onClick={() => handleSort('score')}>
                    Score {sortConfig.key === 'score' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </TableCell>
                  <TableCell sx={{ cursor: 'pointer', bgcolor: sortConfig.key === 'bp' ? 'action.selected' : 'inherit' }} onClick={() => handleSort('bp')}>
                    BP {sortConfig.key === 'bp' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </TableCell>
                  {selectedLevel >= 11 && <TableCell sx={{ p: 0 }} />}
                  {selectedLevel >= 11 && <TableCell></TableCell>}
                </TableRow>
              </TableHead>

              <TableBody>
                {displayed.map((s) => (
                  <React.Fragment key={`${s.id}_${s.difficulty}`}>
                    <TableRow
                      sx={{ display: { xs: 'none', sm: 'table-row' } }}
                      hover
                    >
                      <TableCell>⭐︎{s.level}</TableCell>
                      <TableCell>
                        {renderTitleWithDifficulty(s.title, s.difficulty, acInfDiffMap[Number(s.id)] ? ' (INFINITAS)' : undefined)}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                        <Box sx={{ px: 1, borderRadius: 1, display: 'inline-block', backgroundColor: clearColorMap[s.lamp], textAlign: 'center', minWidth: 80 }}>
                          {simpleClearName[s.lamp] ?? '-'}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {(() => {
                          const grade = getGrade(s.rate);
                          const detailGrade = getDetailGrade(s.score, s.notes);
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
                      {selectedLevel >= 11 &&
                        <TableCell>
                          {!Number.isNaN(s.bpi) ? (
                            <>
                              {s.bpi.toFixed(2)}
                              {!Number.isNaN(s.customBpi) && ` (${s.customBpi.toFixed(2)} *)`}
                            </>
                          ) : !Number.isNaN(s.customBpi) ? (
                            `${s.customBpi.toFixed(2)} *`
                          ) : ''}
                        </TableCell>
                      }
                      <TableCell>{s.score} ({(s.rate * 100).toFixed(2)}%)</TableCell>
                      <TableCell>{s.bp == defaultMisscount ? '-' : s.bp}</TableCell>
                      {selectedLevel >= 11 && (
                        <TableCell sx={{ p: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={() => { setSelectedSongForCalc(s); setBpiCalcModalOpen(true); }}
                            title="BPIを計算"
                          >
                            <CalculateIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      )}
                      {isEditable && selectedLevel >= 11 && (
                        <TableCell sx={{ p: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenBpiModal(s)}
                            title="BPI情報を入力"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>

                    <TableRow
                      sx={{ display: { xs: 'table-row', sm: 'none' } }}
                      hover
                    >
                      <TableCell colSpan={6} sx={{ py: 1.25 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight={700} noWrap sx={{ flex: 1 }}>
                            {renderTitleWithDifficulty(s.title, s.difficulty, acInfDiffMap[Number(s.id)] ? ' (INFINITAS)' : undefined)}
                          </Typography>
                          {isEditable && selectedLevel >= 11 && (
                            <IconButton
                              size="small"
                              onClick={() => handleOpenBpiModal(s)}
                              title="BPI情報を入力"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Box>

                        <Box
                          sx={{
                            mt: 0.5,
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 1,
                            alignItems: 'center',
                            color: 'text.secondary',
                            fontSize: 10,
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ px: 1, borderRadius: 1, display: 'inline-block', backgroundColor: clearColorMap[s.lamp] }}>
                              {simpleClearName[s.lamp] ?? '-'}
                            </Box>
                          </Box>
                          {(!Number.isNaN(s.bpi) || !Number.isNaN(s.customBpi)) &&
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <span>
                                BPI {!Number.isNaN(s.bpi) ? (
                                  <>
                                    {s.bpi.toFixed(2)}
                                    {!Number.isNaN(s.customBpi) && ` (${s.customBpi.toFixed(2)} *)`}
                                  </>
                                ) : `${s.customBpi.toFixed(2)} *`}
                              </span>
                            </Box>
                          }

                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {(() => {
                              const grade = getGrade(s.rate);
                              const detailGrade = getDetailGrade(s.score, s.notes);
                              const isMaxMinus = detailGrade.startsWith('MAX-');
                              const colorKey = isMaxMinus ? 'MAX-' : grade;
                              if (['A', 'AA', 'AAA'].includes(grade)) {
                                return (
                                  <Box sx={{ px: 1, borderRadius: 1, display: 'inline-block', backgroundColor: scoreColorMapLight[colorKey] }}>
                                    {grade} ({detailGrade})
                                  </Box>
                                );
                              }
                              return <span>{grade} ({detailGrade})</span>;
                            })()}
                          </Box>

                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <span>{s.score} ({(s.rate * 100).toFixed(2)}%)</span>
                          </Box>

                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <span>{s.bp == defaultMisscount ? '-' : s.bp}</span>
                          </Box>
                        </Box>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}

                {sorted.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                      条件に一致する曲がありません。
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

        </Container>
      </SectionCard>

      <BpiInputModal
        open={bpiModalOpen}
        onClose={() => setBpiModalOpen(false)}
        songInfo={selectedSongForBpi ? {
          id: selectedSongForBpi.id,
          title: selectedSongForBpi.title,
          difficulty: selectedSongForBpi.difficulty,
          notes: selectedSongForBpi.notes,
          mode: mode
        } : null}
        existingData={selectedSongForBpi ? customBpiData?.[mode]?.[`${selectedSongForBpi.id}_${selectedSongForBpi.difficulty}`] : null}
        officialData={selectedSongForBpi ? bpiInfo?.[mode]?.[selectedSongForBpi.id]?.[selectedSongForBpi.difficulty] : null}
        bpiVersionName={versions[selectedVersion]}
        onSave={handleBpiSave}
      />

      <BpiCalcModal
        open={bpiCalcModalOpen}
        onClose={() => setBpiCalcModalOpen(false)}
        songInfo={selectedSongForCalc ? {
          title: selectedSongForCalc.title,
          difficulty: selectedSongForCalc.difficulty,
          notes: selectedSongForCalc.notes,
          mode: mode,
        } : null}
        officialData={selectedSongForCalc ? bpiInfo?.[mode]?.[selectedSongForCalc.id]?.[selectedSongForCalc.difficulty] ?? null : null}
        customData={selectedSongForCalc ? customBpiData?.[mode]?.[`${selectedSongForCalc.id}_${selectedSongForCalc.difficulty}`] ?? null : null}
        currentScore={selectedSongForCalc?.score ?? 0}
      />

      <RecommendModal
        open={recommendModalOpen}
        onClose={() => setRecommendModalOpen(false)}
        songs={songs}
      />

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
    </Page>
  );
};

export default SongTablePage;
