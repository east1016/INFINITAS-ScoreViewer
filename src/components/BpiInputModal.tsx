import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Typography, Alert
} from '@mui/material';

interface BpiInputModalProps {
  open: boolean;
  onClose: () => void;
  songInfo: {
    id: string;
    title: string;
    difficulty: string;
    notes: number;
    mode: 'SP' | 'DP';
  } | null;
  existingData?: {
    wr: number;
    avg: number;
    updatedAt?: string;
  } | null;
  officialData?: {
    wr: number;
    avg: number;
    notes: number;
    coef?: number;
  } | null;
  bpiVersionName?: string;
  onSave: () => void;
}

const BPI_SERVER_URL = 'http://localhost:3001';

const BpiInputModal: React.FC<BpiInputModalProps> = ({
  open,
  onClose,
  songInfo,
  existingData,
  officialData,
  bpiVersionName,
  onSave
}) => {
  const [wr, setWr] = useState<string>('');
  const [avg, setAvg] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingData) {
      setWr(existingData.wr.toString());
      setAvg(existingData.avg.toString());
    } else {
      setWr('');
      setAvg('');
    }
    setError(null);
  }, [existingData, open]);

  if (!songInfo) return null;

  const maxScore = songInfo.notes * 2;

  const handleSave = async () => {
    const wrNum = parseInt(wr);
    const avgNum = parseInt(avg);

    if (isNaN(wrNum) || isNaN(avgNum)) {
      setError('数値を入力してください');
      return;
    }

    if (wrNum > maxScore || avgNum > maxScore) {
      setError(`最大スコア(${maxScore})を超えています`);
      return;
    }

    if (wrNum < avgNum) {
      setError('全国1位は皆伝平均以上である必要があります');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`${BPI_SERVER_URL}/api/bpi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: songInfo.mode,
          id: songInfo.id,
          difficulty: songInfo.difficulty,
          wr: wrNum,
          avg: avgNum
        })
      });

      if (!response.ok) {
        throw new Error('保存に失敗しました');
      }

      onSave();
      onClose();
    } catch (err) {
      setError('サーバーに接続できません。npm run bpi-server を実行してください。');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('このBPIデータを削除しますか？')) return;

    setSaving(true);
    try {
      await fetch(`${BPI_SERVER_URL}/api/bpi`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: songInfo.mode,
          id: songInfo.id,
          difficulty: songInfo.difficulty
        })
      });
      onSave();
      onClose();
    } catch (err) {
      setError('削除に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        BPI情報入力
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            {songInfo.title} [{songInfo.difficulty}]
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {songInfo.mode} / Notes: {songInfo.notes} / 最大スコア: {maxScore}
          </Typography>
          {existingData?.updatedAt && (
            <Typography variant="caption" color="text.secondary">
              最終更新: {existingData.updatedAt}
            </Typography>
          )}
        </Box>

        {officialData && (
          <Box sx={{ mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
              {bpiVersionName ? `${bpiVersionName}定義ファイル` : '定義ファイルの値'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Typography variant="body2">
                皆伝平均: <strong>{officialData.avg}</strong>
              </Typography>
              <Typography variant="body2">
                全国1位: <strong>{officialData.wr}</strong>
              </Typography>
            </Box>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          label={officialData ? `皆伝平均スコア (AVG) [公式: ${officialData.avg}]` : "皆伝平均スコア (AVG)"}
          type="number"
          fullWidth
          value={avg}
          onChange={(e) => setAvg(e.target.value)}
          sx={{ mb: 2 }}
          inputProps={{ max: maxScore, min: 0 }}
        />

        <TextField
          label={officialData ? `全国1位スコア (WR) [公式: ${officialData.wr}]` : "全国1位スコア (WR)"}
          type="number"
          fullWidth
          value={wr}
          onChange={(e) => setWr(e.target.value)}
          inputProps={{ max: maxScore, min: 0 }}
        />
      </DialogContent>
      <DialogActions>
        {existingData && (
          <Button onClick={handleDelete} color="error" disabled={saving}>
            削除
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} disabled={saving}>
          キャンセル
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BpiInputModal;
