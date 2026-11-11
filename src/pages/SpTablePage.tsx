import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Container, Typography, Grid, Paper, Box, CircularProgress, Backdrop,
  ToggleButtonGroup, ToggleButton, Button, Snackbar, Alert
} from '@mui/material';
import { Page, PageHeader } from '../components/Page';
import SectionCard from '../components/SectionCard';
import FilterPanel from '../components/FilterPanel';
import LampAchieveProgress from '../components/LampAchieveProgress';
import { useAppContext } from '../context/AppContext';
import { isMatchSong } from '../utils/filterUtils';
import { clearColorMap } from '../constants/colorConstrains';
import { convertDataToIdDiffKey } from '../utils/scoreDataUtils';
import { defaultMisscount } from '../constants/defaultValues';
import { getLampAchiveCount } from '../utils/lampUtils';
import { fetchJsonWithFallback, fetchGzipJsonWithFallback } from '../utils/fetchWithFallback';
import { renderTitleWithDifficulty } from '../utils/titleUtils';
import { compressDiffData, decompressDiffData } from '../utils/encodeUtils';

type Level = '11' | '12';
type DifficultyType = 'normal' | 'hard';

const SpTablePage = () => {
  const { mode, filters, setFilters } = useAppContext();
  const [level, setLevel] = useState<Level>('12');
  const [songs, setSongs] = useState<any[]>([]);
  const [difficultyLabels, setDifficultyLabels] = useState<{ [key: string]: { [key: string]: string } }>({});
  const [titleMap, setTitleMap] = useState<{ [key: string]: string }>({});
  const [clearData, setClearData] = useState<{ [key: string]: number }>({});
  const [missData, setMissData] = useState<{ [key: string]: number }>({});
  const [unlockedData, setUnlockedData] = useState<{ [key: string]: boolean }>({});
  const [activeTab, setActiveTab] = useState<DifficultyType>('hard');
  const [konamiInfInfo, setKonamiInfInfo] = useState<any>({});
  const [chartInfo, setChartInfo] = useState<any>({});
  const [songInfo, setSongInfo] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [isShared, setIsShared] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [songsRes, diffRes, titleRes, konamiInfInfoRes, songInfoJson, chartJson] = await Promise.all([
          fetchJsonWithFallback<any[]>(`https://chinimuruhi.github.io/IIDX-Data-Table/difficulty/sp${level}/songs_list.json`),
          fetchJsonWithFallback<{ [key: string]: { [key: string]: string } }>(`https://chinimuruhi.github.io/IIDX-Data-Table/difficulty/sp${level}/difficulty.json`),
          fetchJsonWithFallback<{ [key: string]: string }>('https://chinimuruhi.github.io/IIDX-Data-Table/textage/title.json'),
          fetchJsonWithFallback<any>('https://chinimuruhi.github.io/IIDX-Data-Table/konami/song_to_label.json'),
          fetchGzipJsonWithFallback<any>('https://chinimuruhi.github.io/IIDX-Data-Table/textage/song-info.json.gz'),
          fetchGzipJsonWithFallback<any>('https://chinimuruhi.github.io/IIDX-Data-Table/textage/chart-info.json.gz')
        ]);

        setSongs(songsRes);
        setDifficultyLabels(diffRes);
        setTitleMap(titleRes);
        setKonamiInfInfo(konamiInfInfoRes);
        setSongInfo(songInfoJson);
        setChartInfo(chartJson);

        const urlParams = new URLSearchParams(window.location.search);
        const sharedData = urlParams.get('data');
        if (sharedData) {
          try {
            const restored = decompressDiffData(sharedData);
            const { clear, misscount, unlocked } = convertDataToIdDiffKey({ SP: restored }, 'SP');
            setClearData(clear);
            setMissData(misscount);
            setUnlockedData(unlocked);
            setIsShared(true);
          } catch {
            const local = JSON.parse(localStorage.getItem('data') || '{}');
            const { clear, misscount, unlocked } = convertDataToIdDiffKey(local, mode);
            setClearData(clear);
            setMissData(misscount);
            setUnlockedData(unlocked);
          }
        } else {
          const local = JSON.parse(localStorage.getItem('data') || '{}');
          const { clear, misscount, unlocked } = convertDataToIdDiffKey(local, mode);
          setClearData(clear);
          setMissData(misscount);
          setUnlockedData(unlocked);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [mode, level]);

  const handleCopyToClipboard = useCallback(async () => {
    const local = JSON.parse(localStorage.getItem('data') || '{}');
    const spData = local?.SP ?? {};
    // ☆12の曲IDに絞り、cleartype と misscount のみ抽出してURLサイズを削減
    const sp12SongIds = new Set(songs.map(s => String(s.id)));
    const filtered: any = {};
    for (const songId of sp12SongIds) {
      if (!spData[songId]) continue;
      filtered[songId] = {};
      for (const diff of Object.keys(spData[songId])) {
        const { cleartype, misscount } = spData[songId][diff];
        filtered[songId][diff] = { cleartype, misscount };
      }
    }
    const encoded = compressDiffData(filtered);
    const url = `${window.location.origin}${window.location.pathname}?data=${encoded}`;
    try {
      await navigator.clipboard.writeText(url);
      setSnack({ open: true, message: 'URLをコピーしました', severity: 'success' });
    } catch {
      setSnack({ open: true, message: 'コピーに失敗しました', severity: 'error' });
    }
  }, [songs]);

  const filteredSongs = useMemo(() => songs.filter(song => {
    const key = `${song.id}_${song.difficulty}`;
    const lamp = clearData[key] ?? 0;
    const konami = konamiInfInfo[song.id] || {};
    const chart = chartInfo[song.id] || {};
    const unlocked = unlockedData[key] ?? false;
    const version = songInfo[song.id]?.version;
    const label = konamiInfInfo[song.id]?.label;

    return isMatchSong(filters, lamp, song.difficulty, konami, chart, unlocked, version, label);
  }), [songs, clearData, chartInfo, konamiInfInfo, filters, songInfo, unlockedData]);

  const totalCount = filteredSongs.length;
  const stats = useMemo(() => {
    return getLampAchiveCount(filteredSongs, clearData);
  }, [filteredSongs, clearData]);

  const groupedSongs = useMemo(() => {
    const result: { [label: string]: { label: string, songs: any[], value: number } } = {};
    filteredSongs.forEach(song => {
      const value = activeTab === 'normal' ? song.n_value : song.h_value;
      const label = difficultyLabels[activeTab]?.[String(value)] || '未定';
      if (!result[label]) result[label] = { label, songs: [], value: value ?? -1 };
      result[label].songs.push(song);
    });
    return result;
  }, [filteredSongs, activeTab, difficultyLabels]);

  const sortedLabels = useMemo(() => (
    Object.values(groupedSongs).sort((a, b) => b.value - a.value)
  ), [groupedSongs]);

  const getTitleFontSize = (text: string) => {
    const len = text.length;
    if (len >= 25) return { xs: 8, sm: 13, md: 13 };
    if (len >= 15) return { xs: 10, sm: 14, md: 14 };
    return { xs: 12, sm: 14, md: 14 };
  };

  const headerActions = !isShared ? (
    <Button
      variant="contained"
      onClick={handleCopyToClipboard}
      sx={{ fontWeight: 700 }}
    >
      ☆12HARD難易度表の共有
    </Button>
  ) : null;

  return (
    <Page>
      <PageHeader compact title="SP難易度表" actions={headerActions} />
      <SectionCard>
        <Container maxWidth="xl" sx={{ mt: 4 }}>
          <Backdrop open={loading} sx={{ zIndex: 9999, color: '#fff' }}>
            <CircularProgress color="inherit" />
          </Backdrop>

          <LampAchieveProgress stats={stats} totalCount={totalCount} />
          {isShared && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              共有データを表示中
            </Typography>
          )}
          <FilterPanel filters={filters} onChange={setFilters} showLevelFilter={false} showGradeFilter={false} />

          {/* 切り替えボタン */}
          <Box
            sx={{
              my: 2,
              display: 'flex',
              gap: 1,
              overflowX: 'auto',
              px: 1,
              pb: 0.5,
              WebkitOverflowScrolling: 'touch',
              '&::-webkit-scrollbar': { display: 'none' },
            }}
          >
            <ToggleButtonGroup
              value={level}
              exclusive
              onChange={(_, v) => v && setLevel(v)}
              size="small"
              sx={{
                flexWrap: 'nowrap',
                '& .MuiToggleButton-root': {
                  px: { xs: 1.25, sm: 1.5 },
                  py: { xs: 0.5, sm: 0.75 },
                  fontSize: { xs: 12, sm: 13 },
                  whiteSpace: 'nowrap',
                },
              }}
            >
              <ToggleButton value="12">☆12</ToggleButton>
              <ToggleButton value="11" disabled={isShared}>☆11</ToggleButton>
            </ToggleButtonGroup>

            <ToggleButtonGroup
              value={activeTab}
              exclusive
              onChange={(_, v) => v && setActiveTab(v)}
              size="small"
              sx={{
                flexWrap: 'nowrap',
                '& .MuiToggleButton-root': {
                  px: { xs: 1.25, sm: 1.5 },
                  py: { xs: 0.5, sm: 0.75 },
                  fontSize: { xs: 12, sm: 13 },
                  whiteSpace: 'nowrap',
                },
              }}
            >
              <ToggleButton value="hard">HARD難易度</ToggleButton>
              <ToggleButton value="normal">CLEAR難易度</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {sortedLabels.map(group => (
            <Box key={group.label} sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>{group.label}</Typography>

              <Grid
                container
                spacing={{ xs: 1, sm: 2 }}
                columns={{ xs: 3, sm: 12, md: 12 }}
              >
                {group.songs.map((song) => {
                  const key = `${song.id}_${song.difficulty}`;
                  const lamp = clearData[key] ?? 0;
                  const bg = clearColorMap[lamp];
                  const diffLabel = `[${song.difficulty}]`;
                  const title = titleMap[song.id] || song.id;

                  return (
                    <Grid item xs={1} sm={4} md={2} key={key} sx={{ minWidth: 0 }}>
                      <Paper
                        elevation={3}
                        sx={{
                          p: { xs: 1, sm: 1.2 },
                          height: '100%',
                          backgroundColor: bg,
                        }}
                      >
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          sx={{
                            fontSize: getTitleFontSize(`${title} ${diffLabel}`),
                            whiteSpace: 'normal',
                            overflowWrap: 'anywhere',
                            wordBreak: 'break-word',
                            lineHeight: 1.35,
                          }}
                        >
                          {renderTitleWithDifficulty(title, song.difficulty)}
                        </Typography>
                        <Typography variant="caption" display="block">
                          MISS: {missData[key] == null || missData[key] === defaultMisscount ? '-' : missData[key]}
                        </Typography>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          ))}

        </Container>
      </SectionCard>
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Page>
  );
};

export default SpTablePage;
