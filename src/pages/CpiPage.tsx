import { useEffect, useMemo, useState } from 'react';
import {
  Container, Typography, Grid, Paper, Box, CircularProgress, Backdrop,
  ToggleButtonGroup, ToggleButton
} from '@mui/material';
import { useAppContext } from '../context/AppContext';
import FilterPanel from '../components/FilterPanel';
import LampAchieveProgress from '../components/LampAchieveProgress';
import SectionCard from '../components/SectionCard';
import { Page, PageHeader } from '../components/Page';
import { clearColorMap } from '../constants/colorConstrains';
import { cpiClearMap } from '../constants/clearConstrains';
import { convertDataToIdDiffKey } from '../utils/scoreDataUtils';
import { isMatchSong } from '../utils/filterUtils';
import { renderTitleWithDifficulty } from '../utils/titleUtils';
import { defaultMisscount } from '../constants/defaultValues';
import { getLampAchiveCount } from '../utils/lampUtils';
import { fetchJsonWithFallback, fetchGzipJsonWithFallback } from '../utils/fetchWithFallback';


const CpiPage = () => {
  const { mode, filters, setFilters } = useAppContext();
  const [songs, setSongs] = useState<any[]>([]);
  const [titleMap, setTitleMap] = useState<{ [key: string]: string }>({});
  const [activeTab, setActiveTab] = useState<(keyof typeof cpiClearMap)[number]>('hard');
  const [loading, setLoading] = useState(true);
  const [konamiInfInfo, setKomaniInfInfo] = useState<any>({});
  const [chartInfo, setChartInfo] = useState<any>({});
  const [songInfo, setSongInfo] = useState<any>({});
  const [clearData, setClearData] = useState<{ [key: string]: number }>({});
  const [missData, setMissData] = useState<{ [key: string]: number }>({});
  const [unlockedData, setUnlockedData] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [
          cpiSongs,
          titleRes,
          konamiInfInfoRes,
          chartJson,
          songInfoJson
        ] = await Promise.all([
          fetchJsonWithFallback<any[]>('https://chinimuruhi.github.io/IIDX-Data-Table/cpi/songs_list.json'),
          fetchJsonWithFallback<{ [key: string]: string }>('https://chinimuruhi.github.io/IIDX-Data-Table/textage/title.json'),
          fetchJsonWithFallback<any>('https://chinimuruhi.github.io/IIDX-Data-Table/konami/song_to_label.json'),
          fetchGzipJsonWithFallback<any>('https://chinimuruhi.github.io/IIDX-Data-Table/textage/chart-info.json.gz'),
          fetchGzipJsonWithFallback<any>('https://chinimuruhi.github.io/IIDX-Data-Table/textage/song-info.json.gz')
        ]);

        setSongs(cpiSongs);
        setTitleMap(titleRes);
        setKomaniInfInfo(konamiInfInfoRes);
        setChartInfo(chartJson);
        setSongInfo(songInfoJson);

        const local = JSON.parse(localStorage.getItem('data') || '{}');
        const { clear, misscount, unlocked } = convertDataToIdDiffKey(local, mode);
        setClearData(clear);
        setMissData(misscount);
        setUnlockedData(unlocked);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [mode]);

  const filteredSongs = useMemo(() => songs.filter(song => {
    const value = song[activeTab]?.cpi_value;
    if (value == null) return false;

    const key = `${song.id}_${song.difficulty}`;
    const lamp = clearData[key] ?? 0;
    const konami = konamiInfInfo[song.id] || {};
    const chart = chartInfo[song.id] || {};
    const unlocked = unlockedData[key] ?? false;
    const version = songInfo[song.id]?.version;
    const label = konamiInfInfo[song.id]?.label;

    return isMatchSong(filters, lamp, song.difficulty, konami, chart, unlocked, version, label);
  }), [songs, clearData, unlockedData, chartInfo, konamiInfInfo, filters, songInfo, activeTab]);

  const groupedSongs = useMemo(() => {
    const result: { [label: string]: { label: string; value: number; songs: any[] } } = {};
    const infinity: any[] = [];
    const excluded: any[] = [];

    filteredSongs.forEach(song => {
      const value = song[activeTab].cpi_value;
      if (value === -1) {
        infinity.push(song);
      } else if (value === -2) {
        excluded.push(song);
      } else {
        const bucket = Math.floor(value / 50) * 50;
        const label = `${bucket}~${bucket + 49}`;
        if (!result[label]) result[label] = { label, value: bucket, songs: [] };
        result[label].songs.push(song);
      }
    });

    if (infinity.length > 0) {
      result['Infinity'] = { label: 'Infinity', value: Infinity, songs: infinity };
    }
    if (excluded.length > 0) {
      result['算出対象外'] = { label: '算出対象外', value: -Infinity, songs: excluded };
    }

    return result;
  }, [filteredSongs, activeTab]);

  const sortedBuckets = useMemo(() => (
    Object.values(groupedSongs).sort((a, b) => b.value - a.value)
  ), [groupedSongs]);

  const totalCount = filteredSongs.length;
  const stats = useMemo(() => {
    return getLampAchiveCount(filteredSongs, clearData);
  }, [filteredSongs, clearData]);


  const getTitleFontSize = (text: string) => {
    const len = text.length;
    if (len >= 25) return { xs: 8, sm: 13, md: 13 };
    if (len >= 15) return { xs: 10, sm: 14, md: 14 };
    return { xs: 12, sm: 14, md: 14 };
  };

  const metaTextSx = {
    fontSize: { xs: 10, sm: 12, md: 12 }, // スマホは少し小さく
    lineHeight: 1.3,
    color: 'text.secondary',
  } as const;

  return (
    <Page>
      <PageHeader compact title="Clear Power Indicator(CPI)" />
      <SectionCard>
        <Container maxWidth="xl" sx={{ mt: 4 }}>
          <Backdrop open={loading} sx={{ zIndex: 9999, color: '#fff' }}>
            <CircularProgress color="inherit" />
          </Backdrop>
          
          <LampAchieveProgress stats={stats} totalCount={totalCount} />
          <FilterPanel filters={filters} onChange={setFilters} showLevelFilter={false} showGradeFilter={false} />

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
              {Object.keys(cpiClearMap).map(type => (
                <ToggleButton key={type} value={type}>
                  {type.toUpperCase()}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          {sortedBuckets.map(group => (
            <Box key={group.label} sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                {group.label === 'Infinity' ? 'CPI Infinity'
                  : group.label === '算出対象外' ? '算出対象外'
                    : `CPI ${group.label}`}
              </Typography>

              {/* xs=3カラム、sm/md=12カラム */}
              <Grid
                container
                spacing={{ xs: 1, sm: 2 }}
                columns={{ xs: 3, sm: 12, md: 12 }}
              >
                {group.songs
                  .sort((a, b) => (b[activeTab]?.cpi_value ?? 0) - (a[activeTab]?.cpi_value ?? 0))
                  .map(song => {
                    const key = `${song.id}_${song.difficulty}`;
                    const lamp = clearData[key] ?? 0;
                    const bg = clearColorMap[lamp] ?? '#FFFFFF';
                    const diffLabel = song.difficulty === 'A' ? '' : `[${song.difficulty}]`;
                    const title = titleMap[song.id] || song.id;
                    const cpiValue = song[activeTab]?.cpi_value;
                    const displayTitle = `${title} ${diffLabel}`;

                    return (
                      <Grid item xs={1} sm={4} md={2} key={key} sx={{ minWidth: 0 }}>
                        <Paper elevation={3} sx={{ p: { xs: 1, sm: 1.2 }, height: '100%', backgroundColor: bg }}>
                          <Typography
                            variant="body2"
                            fontWeight="bold"
                            sx={{
                              fontSize: getTitleFontSize(displayTitle),
                              whiteSpace: 'normal',
                              overflowWrap: 'anywhere',
                              wordBreak: 'break-word',
                              lineHeight: 1.35,
                            }}
                          >
                            {renderTitleWithDifficulty(title, song.difficulty)}
                          </Typography>

                          {cpiValue !== -2 && (
                            <Typography variant="caption" display="block" sx={metaTextSx}>
                              CPI: {cpiValue === -1 ? 'Infinity' : cpiValue}
                            </Typography>
                          )}
                          <Typography variant="caption" display="block" sx={metaTextSx}>
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
    </Page>
  );
};

export default CpiPage;
