import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Typography, Alert
} from '@mui/material';

interface ChartOverrideModalProps {
  open: boolean;
  onClose: () => void;
  songInfo: {
    id: string;
    title: string;
    difficulty: string;
    notes: number;
    level: number | string;
  } | null;
  existingData?: {
    notes: number;
    level?: number;
    title: string;
  } | null;
  onSave: () => void;
}

const CHART_SERVER_URL = '';

const ChartOverrideModal: React.FC<ChartOverrideModalProps> = ({
  open,
  onClose,
  songInfo,
  existingData,
  onSave
}) => {
  const [notes, setNotes] = useState<string>('');
  const [level, setLevel] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingData) {
      setNotes(existingData.notes.toString());
      setLevel(existingData.level?.toString() || '');
    } else if (songInfo) {
      setNotes(songInfo.notes > 0 ? songInfo.notes.toString() : '');
      setLevel(songInfo.level !== 'N/A' ? songInfo.level.toString() : '');
    } else {
      setNotes('');
      setLevel('');
    }
    setError(null);
  }, [existingData, songInfo, open]);

  if (!songInfo) return null;

  const handleSave = async () => {
    const notesNum = parseInt(notes);
    const levelNum = level ? parseInt(level) : undefined;

    if (isNaN(notesNum) || notesNum <= 0) {
      setError('有効なノーツ数を入力してください');
      return;
    }

    if (levelNum !== undefined && (isNaN(levelNum) || levelNum < 1 || levelNum > 12)) {
      setError('レベルは1〜12の範囲で入力してください');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`${CHART_SERVER_URL}/api/chart-override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: songInfo.id,
          difficulty: songInfo.difficulty,
          title: songInfo.title,
          notes: notesNum,
          level: levelNum
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
    if (!confirm('この補正データを削除しますか？')) return;

    setSaving(true);
    try {
      await fetch(`${CHART_SERVER_URL}/api/chart-override`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        譜面情報補正
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            {songInfo.title} [{songInfo.difficulty}]
          </Typography>
          <Typography variant="body2" color="text.secondary">
            現在の値 - Notes: {songInfo.notes > 0 ? songInfo.notes : '未登録'} / Level: {songInfo.level !== 'N/A' ? `☆${songInfo.level}` : '未登録'}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          label="ノーツ数"
          type="number"
          fullWidth
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          sx={{ mb: 2 }}
          inputProps={{ min: 1 }}
          helperText="スコア計算に必要なノーツ数"
        />

        <TextField
          label="レベル (☆)"
          type="number"
          fullWidth
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          inputProps={{ min: 1, max: 12 }}
          helperText="1〜12の範囲（空欄可）"
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

export default ChartOverrideModal;
