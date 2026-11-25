import React, { useEffect, useState } from 'react';
import {
  Button,
  Container,
  Paper,
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
          if (!isNaN(idx) && idx === -1) {
            setSelectedVersion(-1);
          } else if (!isNaN(idx) && idx >= 0 && arr[idx]) {
            setSelectedVersion(idx);
          } else {
            setSelectedVersion(-1);
            localStorage.setItem('bpiVersion', '-1');
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

  const handleVersionChange = (idx: number) => {
    setSelectedVersion(idx);
    localStorage.setItem('bpiVersion', String(idx));
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
            <FormControl sx={{ minWidth: 240 }}>
              <InputLabel id="bpi-version-select-label">バージョン</InputLabel>
              <Select
                labelId="bpi-version-select-label"
                value={selectedVersion}
                label="バージョン"
                onChange={(e) => handleVersionChange(Number(e.target.value))}
              >
                <MenuItem value={-1}>BPIM2</MenuItem>
                {versions.map((v, i) => (
                  <MenuItem key={i} value={i}>
                    {v}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
