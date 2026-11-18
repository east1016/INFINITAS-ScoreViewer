import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material';
import { appKeys } from '../constants/localStrageConstrains';
import SectionCard from '../components/SectionCard';
import { Page, PageHeader } from '../components/Page';
import { fetchJsonWithFallback } from '../utils/fetchWithFallback';

const SettingsPage: React.FC = () => {
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false, message: '', severity: 'success',
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [versions, setVersions] = useState<string[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number>(0);

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
            setSelectedVersion(0);
            localStorage.setItem('bpiVersion', '0');
          }
        } else {
          setSelectedVersion(0);
          localStorage.setItem('bpiVersion', '0');
        }
      })
      .catch(() => {
        setSnack({ open: true, message: 'バージョンリストの取得に失敗しました。', severity: 'error' });
      });
  }, []);

  const handleSaveVersion = () => {
    try {
      localStorage.setItem('bpiVersion', String(selectedVersion));
      setSnack({ open: true, message: 'バージョン設定を保存しました。', severity: 'success' });
    } catch {
      setSnack({ open: true, message: 'バージョン設定の保存に失敗しました。', severity: 'error' });
    }
  };

  const applyDelete = () => {
    try {
      appKeys.forEach((k) => localStorage.removeItem(k));
      setDeleteDialogOpen(false);
      setSnack({ open: true, message: 'ローカルストレージのデータを削除しました。', severity: 'success' });
    } catch {
      setSnack({ open: true, message: '削除に失敗しました。', severity: 'error' });
    }
  };

  return (
    <Page>
      <PageHeader compact title="設定" />
      <SectionCard>
        <Container maxWidth="md" sx={{ my: 4 }}>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>BPI定義ファイル</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-end">
              <FormControl sx={{ flex: 1, minWidth: 240 }}>
                <InputLabel id="bpi-version-select-label">バージョン</InputLabel>
                <Select
                  labelId="bpi-version-select-label"
                  value={selectedVersion}
                  label="バージョン"
                  onChange={(e) => setSelectedVersion(Number(e.target.value))}
                >
                  {versions.map((v, i) => (
                    <MenuItem key={i} value={i}>
                      {v}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button variant="contained" onClick={handleSaveVersion}>保存</Button>
            </Stack>
          </Paper>

          <Paper sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'error.light' }}>
            <Typography variant="h6" gutterBottom color="error">データの削除</Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              登録したスコアデータを削除します。
            </Typography>
            <Button color="error" variant="contained" onClick={() => setDeleteDialogOpen(true)}>
              スコアデータを削除
            </Button>
          </Paper>

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

          <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
            <DialogTitle>削除の確認</DialogTitle>
            <DialogContent>
              <DialogContentText>
                本当に登録データを削除しますか？ この操作は元に戻せません。
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteDialogOpen(false)}>キャンセル</Button>
              <Button onClick={applyDelete} color="error" variant="contained">削除する</Button>
            </DialogActions>
          </Dialog>

        </Container>
      </SectionCard>
    </Page>
  );
};

export default SettingsPage;
