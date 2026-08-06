import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Typography, Divider, Chip
} from '@mui/material';
import { calculateBpi } from '../utils/bpiUtils';

interface BpiCalcModalProps {
  open: boolean;
  onClose: () => void;
  songInfo: {
    title: string;
    difficulty: string;
    notes: number;
    mode: 'SP' | 'DP';
  } | null;
  officialData: {
    wr: number;
    avg: number;
    notes: number;
    coef?: number;
  } | null;
  customData: {
    wr: number;
    avg: number;
  } | null;
  currentScore: number;
}

const bpiColor = (bpi: number) => {
  if (bpi >= 100) return '#f5c518';
  if (bpi >= 50) return '#4caf50';
  if (bpi >= 0) return '#2196f3';
  return '#9e9e9e';
};

const BpiCalcModal: React.FC<BpiCalcModalProps> = ({
  open,
  onClose,
  songInfo,
  officialData,
  customData,
  currentScore,
}) => {
  const [inputScore, setInputScore] = useState<string>('');

  useEffect(() => {
    if (open) {
      setInputScore(currentScore > 0 ? String(currentScore) : '');
    }
  }, [open, currentScore]);

  const maxScore = songInfo ? songInfo.notes * 2 : 0;

  const parsedScore = parseInt(inputScore);
  const scoreValid = !isNaN(parsedScore) && parsedScore >= 0 && parsedScore <= maxScore;

  const officialBpi = useCallback(() => {
    if (!officialData || !scoreValid) return null;
    return calculateBpi(officialData.wr, officialData.avg, officialData.notes, parsedScore, officialData.coef ?? -1);
  }, [officialData, scoreValid, parsedScore]);

  const customBpi = useCallback(() => {
    if (!customData || !songInfo || !scoreValid) return null;
    return calculateBpi(customData.wr, customData.avg, songInfo.notes, parsedScore, -1);
  }, [customData, songInfo, scoreValid, parsedScore]);

  if (!songInfo) return null;

  const offBpi = officialBpi();
  const cstBpi = customBpi();

  const handleScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d+$/.test(val)) {
      setInputScore(val);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        BPI計算
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {songInfo.title} [{songInfo.difficulty}] / {songInfo.mode}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Typography variant="caption" color="text.secondary">
          ノーツ数: {songInfo.notes} / 最大スコア: {maxScore}
        </Typography>

        <TextField
          label="スコアを入力"
          type="text"
          inputMode="numeric"
          fullWidth
          value={inputScore}
          onChange={handleScoreChange}
          sx={{ mt: 2, mb: 1 }}
          autoFocus
          error={inputScore !== '' && !scoreValid}
          helperText={inputScore !== '' && !scoreValid ? `0〜${maxScore} の範囲で入力してください` : ' '}
          inputProps={{ max: maxScore, min: 0 }}
        />

        {scoreValid && (
          <Box sx={{ mt: 1 }}>
            {offBpi !== null && (
              <Box sx={{ mb: 2, p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  公式BPI
                  {officialData && (
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      (avg: {officialData.avg} / wr: {officialData.wr})
                    </Typography>
                  )}
                </Typography>
                <Typography variant="h5" fontWeight="bold" sx={{ color: bpiColor(offBpi) }}>
                  {offBpi.toFixed(2)}
                </Typography>
              </Box>
            )}

            {cstBpi !== null && (
              <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    カスタムBPI
                  </Typography>
                  <Chip label="*" size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                </Box>
                {customData && (
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    (avg: {customData.avg} / wr: {customData.wr})
                  </Typography>
                )}
                <Typography variant="h5" fontWeight="bold" sx={{ color: bpiColor(cstBpi) }}>
                  {cstBpi.toFixed(2)}
                </Typography>
              </Box>
            )}

            {offBpi === null && cstBpi === null && (
              <Typography variant="body2" color="text.secondary">
                このレベルのBPI定義データがありません
              </Typography>
            )}
          </Box>
        )}

        {!scoreValid && inputScore === '' && (officialData || customData) && (
          <Box sx={{ mt: 1 }}>
            <Divider sx={{ mb: 1.5 }} />
            <Typography variant="caption" color="text.secondary">
              参照データ
            </Typography>
            {officialData && (
              <Box sx={{ mt: 0.5 }}>
                <Typography variant="body2">
                  公式 — avg: <strong>{officialData.avg}</strong> / wr: <strong>{officialData.wr}</strong>
                </Typography>
              </Box>
            )}
            {customData && (
              <Box sx={{ mt: 0.5 }}>
                <Typography variant="body2">
                  カスタム * — avg: <strong>{customData.avg}</strong> / wr: <strong>{customData.wr}</strong>
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>閉じる</Button>
      </DialogActions>
    </Dialog>
  );
};

export default BpiCalcModal;
