import React, { useState, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, ToggleButtonGroup, ToggleButton,
  List, ListItem, ListItemText, Chip, IconButton, Tooltip
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import BlockIcon from '@mui/icons-material/Block';
import { getGrade, getDetailGrade } from '../utils/gradeUtils';
import { clearColorMap, scoreColorMapLight } from '../constants/colorConstrains';
import { simpleClearName } from '../constants/clearConstrains';

type SongRow = {
  id: string;
  difficulty: string;
  diffIndex: number;
  level: number;
  notes: number;
  title: string;
  normalizedTitle: string;
  lamp: number;
  score: number;
  rate: number;
  bpi: number;
  customBpi: number;
  bp: number;
};

interface RecommendModalProps {
  open: boolean;
  onClose: () => void;
  songs: SongRow[];
}

type Target = 'AA' | 'AAA' | 'MAX-' | 'BPI';

// 有効なBPI値を取得（公式値優先、なければ参考値）
const getEffectiveBpi = (song: SongRow): number | null => {
  if (!Number.isNaN(song.bpi) && song.bpi !== undefined) {
    return song.bpi;
  }
  if (!Number.isNaN(song.customBpi) && song.customBpi !== undefined) {
    return song.customBpi;
  }
  return null;
};

const RecommendModal: React.FC<RecommendModalProps> = ({
  open,
  onClose,
  songs
}) => {
  const [level, setLevel] = useState<number>(12);
  const [target, setTarget] = useState<Target>('MAX-');
  const [refreshKey, setRefreshKey] = useState(0);
  const [bannedSongs, setBannedSongs] = useState<Set<string>>(new Set()); // 抽選時に適用されるBAN
  const [pendingBans, setPendingBans] = useState<Set<string>>(new Set()); // 表示用の一時的なBAN（グレーアウト）

  // 目標に応じた候補を抽出
  const candidates = useMemo(() => {
    return songs.filter(s => {
      if (s.level !== level) return false;
      if (s.lamp === 0) return false; // NO PLAYは対象外
      if (bannedSongs.has(`${s.id}_${s.difficulty}`)) return false; // BANされた曲は除外
      const grade = getGrade(s.rate);
      const detailGrade = getDetailGrade(s.score, s.notes);

      if (target === 'AA') {
        return grade === 'A'; // 現在Aの曲がAA狙い目
      } else if (target === 'AAA') {
        return grade === 'AA'; // 現在AAの曲がAAA狙い目
      } else if (target === 'MAX-') {
        // 現在AAAだがMAX-未達の曲
        return grade === 'AAA' && !detailGrade.startsWith('MAX-');
      } else if (target === 'BPI') {
        // BPIが有効な曲（公式値または参考値が-15以上）
        const effectiveBpi = getEffectiveBpi(s);
        return effectiveBpi !== null && effectiveBpi >= -15;
      }
      return false;
    });
  }, [songs, level, target, bannedSongs]);

  // 重み付き抽選で5曲選択（refreshKeyが変わると再選択）
  const recommendations = useMemo(() => {
    if (candidates.length === 0) return [];

    // BPI底上げの場合はBPI昇順、それ以外はrate降順でソート
    const sorted = target === 'BPI'
      ? [...candidates].sort((a, b) => (getEffectiveBpi(a) ?? 0) - (getEffectiveBpi(b) ?? 0))
      : [...candidates].sort((a, b) => b.rate - a.rate);

    // 重み付き抽選: 順位に応じて重みを設定（中間傾斜: 1位と45位の比 ≒ 98:1）
    // weight = 1 / (rank ^ 1.2) で中間傾斜を実現
    const weights = sorted.map((_, index) => 1 / Math.pow(index + 1, 1.2));

    // 重み付き抽選で5曲選択（重複なし）
    const selected: typeof sorted = [];
    const remaining = [...sorted];
    const remainingWeights = [...weights];

    while (selected.length < 5 && remaining.length > 0) {
      const rand = Math.random() * remainingWeights.reduce((s, w) => s + w, 0);
      let cumulative = 0;
      let selectedIndex = 0;

      for (let i = 0; i < remainingWeights.length; i++) {
        cumulative += remainingWeights[i];
        if (rand <= cumulative) {
          selectedIndex = i;
          break;
        }
      }

      selected.push(remaining[selectedIndex]);
      remaining.splice(selectedIndex, 1);
      remainingWeights.splice(selectedIndex, 1);
    }

    // 選ばれた曲をソート（BPIモードならBPI昇順、それ以外は目標までのdiff昇順）
    const aaThresh = 7 / 9;
    const aaaThresh = 8 / 9;
    const maxThresh = 17 / 18;
    const threshold = target === 'AA' ? aaThresh : target === 'AAA' ? aaaThresh : maxThresh;

    if (target === 'BPI') {
      selected.sort((a, b) => (getEffectiveBpi(a) ?? 0) - (getEffectiveBpi(b) ?? 0));
    } else {
      selected.sort((a, b) => {
        const gapA = Math.ceil(a.notes * 2 * threshold) - a.score;
        const gapB = Math.ceil(b.notes * 2 * threshold) - b.score;
        return gapA - gapB;
      });
    }

    return selected;
  }, [candidates, refreshKey, target]);

  const handleRefresh = () => {
    // 再抽選時にpendingBansをbannedSongsに適用
    setBannedSongs(prev => new Set([...prev, ...pendingBans]));
    setPendingBans(new Set());
    setRefreshKey(prev => prev + 1);
  };

  const handleBan = (songId: string, difficulty: string) => {
    const key = `${songId}_${difficulty}`;
    setPendingBans(prev => new Set(prev).add(key));
  };

  const handleClearBans = () => {
    setBannedSongs(new Set());
    setPendingBans(new Set());
  };

  const handleClose = () => {
    setBannedSongs(new Set()); // モーダルを閉じる時にBANをクリア
    setPendingBans(new Set());
    onClose();
  };

  // 各グレードの閾値
  const aaThreshold = 7 / 9;   // AA閾値
  const aaaThreshold = 8 / 9;  // AAA閾値
  const maxThreshold = 17 / 18; // MAX-閾値（AAA+の上限）

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        リコメンド
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            レベル
          </Typography>
          <ToggleButtonGroup
            value={level}
            exclusive
            onChange={(_, v) => v && setLevel(v)}
            size="small"
          >
            {[12, 11, 10, 9, 8, 7].map(lv => (
              <ToggleButton key={lv} value={lv}>☆{lv}</ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            目標
          </Typography>
          <ToggleButtonGroup
            value={target}
            exclusive
            onChange={(_, v) => v && setTarget(v)}
            size="small"
          >
            <ToggleButton value="MAX-">新規MAX-</ToggleButton>
            <ToggleButton value="AAA">新規AAA</ToggleButton>
            <ToggleButton value="AA">新規AA</ToggleButton>
            <ToggleButton value="BPI">BPI更新</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            候補: {candidates.length}曲{(bannedSongs.size > 0 || pendingBans.size > 0) && ` (除外: ${bannedSongs.size + pendingBans.size}曲)`}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {(bannedSongs.size > 0 || pendingBans.size > 0) && (
              <Button
                size="small"
                onClick={handleClearBans}
              >
                除外解除
              </Button>
            )}
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={candidates.length === 0}
            >
              再抽選
            </Button>
          </Box>
        </Box>

        <Box sx={{ height: 430, overflow: 'auto' }}>
          {recommendations.length === 0 ? (
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
              条件に合う曲がありません
            </Typography>
          ) : (
            <List dense>
              {recommendations.map((song) => {
              const grade = getGrade(song.rate);
              const detailGrade = getDetailGrade(song.score, song.notes);
              const songKey = `${song.id}_${song.difficulty}`;
              const isBanned = pendingBans.has(songKey);

              // 目標に応じたギャップ計算（BPIの場合は不要）
              const threshold = target === 'AA' ? aaThreshold : target === 'AAA' ? aaaThreshold : maxThreshold;
              const gap = Math.ceil(song.notes * 2 * threshold) - song.score;
              const targetLabel = target === 'AA' ? 'AA' : target === 'AAA' ? 'AAA' : 'MAX-';

              return (
                <ListItem
                  key={songKey}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    opacity: isBanned ? 0.4 : 1,
                    transition: 'opacity 0.2s'
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="body1" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
                        {song.title} [{song.difficulty}]
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                        <Chip
                          size="small"
                          label={`☆${song.level}`}
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          label={simpleClearName[song.lamp]}
                          sx={{ backgroundColor: clearColorMap[song.lamp] }}
                        />
                        <Chip
                          size="small"
                          label={`${grade} (${detailGrade})`}
                          sx={{ backgroundColor: scoreColorMapLight[grade] }}
                        />
                        {target === 'BPI' ? (
                          <Chip
                            size="small"
                            label={`BPI: ${(getEffectiveBpi(song) ?? 0).toFixed(2)}${!Number.isNaN(song.bpi) ? '' : ' *'}`}
                            color="primary"
                            variant="outlined"
                          />
                        ) : (
                          <Chip
                            size="small"
                            label={`${targetLabel} まで +${gap}`}
                            color="primary"
                            variant="outlined"
                          />
                        )}
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleBan(song.id, song.difficulty)}
                            disabled={isBanned}
                            sx={{ p: 0.5 }}
                          >
                            <BlockIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Box>
                    }
                  />
                </ListItem>
              );
            })}
            </List>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>閉じる</Button>
      </DialogActions>
    </Dialog>
  );
};

export default RecommendModal;
