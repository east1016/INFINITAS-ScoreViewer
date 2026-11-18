// src/pages/Index.tsx
import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Link as MuiLink,
  Stack,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import NoAccountsIcon from '@mui/icons-material/NoAccounts';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import ReportRoundedIcon from '@mui/icons-material/ReportRounded';
import { CheckCircleRounded } from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { parseOfficialCsv, mergeWithCSVEntries } from '../utils/scoreDataUtils';
import { getCurrentFormattedDate } from '../utils/dateUtils';
import { useAppContext } from '../context/AppContext';

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { mode } = useAppContext();
  const [error, setError] = useState<string | null>(null);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [failedTitles, setFailedTitles] = useState<string[]>([]);

  const readFileAsText = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let text = decoder.decode(uint8Array);
    if (text.charCodeAt(0) === 0xFEFF) text = text.substring(1);
    return text;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setFailedTitles([]);
    try {
      if (!file.name.endsWith('.csv')) throw new Error('拡張子がcsvではありません');
      const text = await readFileAsText(file);
      if (!text.includes('タイトル') || !text.includes('スコア')) throw new Error('公式CSVとして認識できません');
      const result = await parseOfficialCsv(text, mode);
      const { data, diffs, timestamps, failedTitles: failed } = await mergeWithCSVEntries(result);
      localStorage.setItem('data', JSON.stringify(data));
      localStorage.setItem('diff', JSON.stringify(diffs));
      localStorage.setItem('timestamps', JSON.stringify(timestamps));
      const lastUpdated = getCurrentFormattedDate();
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}') || {};
      localStorage.setItem('user', JSON.stringify({ ...storedUser, lastupdated: lastUpdated }));
      if (failed.length > 0) {
        setFailedTitles(failed);
        setReportDialogOpen(true);
      } else {
        setSuccessDialogOpen(true);
      }
    } catch (e: any) {
      setError(`読み込み失敗: ${e}`);
    }
    event.target.value = '';
  };

  const handleReport = () => {
    const message = encodeURIComponent(`@ci_public\n以下の曲のIDが取得できませんでした:\n${failedTitles.join('\n')}\n`);
    window.open(`https://x.com/intent/tweet?hashtags=inf_sv_error&text=${message}`, '_blank');
  };

  const handleSuccessClose = () => {
    setSuccessDialogOpen(false);
    navigate('/diff');
  };

  return (
    <Box sx={{ bgcolor: 'background.default', color: 'text.primary' }}>
      {/* Hero */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          py: { xs: 10, md: 14 },
          background:
            'radial-gradient(1200px 600px at 10% -10%, rgba(99,102,241,.22), transparent 60%), radial-gradient(900px 500px at 110% 10%, rgba(56,189,248,.18), transparent 55%)',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={7}>
              <Chip
                label="INFINITAS ScoreViewer"
                color="primary"
                variant="outlined"
                sx={{ mb: 2, fontWeight: 600, letterSpacing: .4 }}
              />
              <Typography variant="h5" component="h1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                beatmania IIDXの
                <Box component="span" sx={{ color: 'primary.main' }}>
                  スコア・ランプを可視化
                </Box>
              </Typography>
              <Typography variant="h6" sx={{ mt: 2, opacity: 0.9 }}>
                INFINITASデータや手動入力のデータも、ACと同様の指標で可視化。
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 4 }}>
                <Button
                  component="label"
                  size="large"
                  variant="contained"
                  endIcon={<CloudUploadRoundedIcon />}
                  sx={{ px: 3, py: 1.2, borderRadius: 3, fontWeight: 700 }}
                >
                  CSVを読み込む
                  <input type="file" hidden accept=".csv" onChange={handleFileUpload} />
                </Button>
                <Button
                  href="https://github.com/chinimuruhi/INFINITAS-ScoreViewer"
                  target="_blank"
                  rel="noreferrer"
                  size="large"
                  variant="text"
                  endIcon={<LaunchRoundedIcon />}
                  sx={{ px: 2, py: 1.2, borderRadius: 3 }}
                >
                  GitHub
                </Button>
              </Stack>

              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            </Grid>

            <Grid item xs={12} md={5}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 4,
                  p: 2,
                  backdropFilter: 'blur(6px)',
                  background:
                    'linear-gradient(135deg, rgba(255,255,255,.1), rgba(255,255,255,.04))',
                  border: theme => `1px solid ${theme.palette.divider}`,
                }}
              >
                <CardContent>
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <CloudUploadRoundedIcon color="primary" />
                      <Typography variant="subtitle1" fontWeight={700}>
                        はじめに
                      </Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                      INFINITAS ScoreViewerへようこそ！当サイトはINFINITASや手動入力のスコアデータでも、
                      ACと同様の指標で可視化することを目指しております。
                    </Typography>
                    <Divider flexItem />
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <NoAccountsIcon color="primary" />
                      <Typography variant="subtitle2" fontWeight={700}>ユーザ登録不要</Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      端末のブラウザ（LocalStorage）に保存します。キャッシュ削除で消える可能性があるため、
                      <MuiLink component={RouterLink} to="/settings" sx={{ fontWeight: 700 }}>
                        設定
                      </MuiLink>
                      から定期的なバックアップを推奨します。
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* こんな方におすすめ！ */}
      <Container maxWidth="lg" sx={{ py: 0 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  こんな方におすすめ！
                </Typography>
                <div style={{ opacity: 0.9 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CheckCircleRounded fontSize="small" sx={{ color: 'success.main' }} />
                    <span>INFINITASでもACと同様の指標（BPIなど）を使用したい</span>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CheckCircleRounded fontSize="small" sx={{ color: 'success.main' }} />
                    <span>ACとINFINITASをマージしたスコア状況が知りたい</span>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CheckCircleRounded fontSize="small" sx={{ color: 'success.main' }} />
                    <span>INFINITASに収録されている楽曲だとどのくらいランプが埋まっているのかを知りたい</span>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CheckCircleRounded fontSize="small" sx={{ color: 'success.main' }} />
                    <span>DPの難易度表に合わせたランプ状況を可視化したい</span>
                  </Stack>
                </div>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* 対応している指標 */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
              <InsightsRoundedIcon color="primary" />
              <Typography variant="h6" fontWeight={800}>対応している指標</Typography>
            </Stack>
            <Stack spacing={1} sx={{ pl: 0.5 }}>
              <ItemLink href="https://iidx-sp12.github.io/">SP⭐︎12 難易度表</ItemLink>
              <ItemLink href="https://docs.google.com/spreadsheets/d/1e7gdUmBk3zUGSxVGC--8p6w2TIWMLBcLzOcmWoeOx6Y/edit?gid=649088745#gid=649088745">
                SP⭐︎11 難易度表
              </ItemLink>
              <ItemLink href="https://cpi.makecir.com/">Clear Power Indicator(CPI)</ItemLink>
              <ItemLink href="https://bpi.poyashi.me/">Beat Power Indicator(BPI)</ItemLink>
              <ItemLink href="https://zasa.sakura.ne.jp/dp/">DP非公式難易度表</ItemLink>
              <ItemLink href="http://ereter.net/iidxsongs/analytics/combined/">ereter's dp laboratory</ItemLink>
            </Stack>
          </CardContent>
        </Card>
      </Container>

      {/* お問い合わせ / 注意事項 */}
      <Container maxWidth="lg" sx={{ py: 0 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                  <ReportRoundedIcon color="primary" />
                  <Typography variant="h6" fontWeight={800}>お問い合わせ</Typography>
                </Stack>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  不具合報告等は
                  <MuiLink href="https://x.com/ci_public" target="_blank" rel="noreferrer" sx={{ fontWeight: 700 }}>
                    @ci_public
                  </MuiLink>
                  や
                  <MuiLink href="https://github.com/chinimuruhi/INFINITAS-ScoreViewer/issues" target="_blank" rel="noreferrer" sx={{ fontWeight: 700, ml: .5 }}>
                    Issues
                  </MuiLink>
                  等にご連絡いただけますと幸いです。
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
                  注意事項
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  本サイトは非公式であり、株式会社コナミアミューズメント様とは一切関係ありません。
                  本サイトをご利用中に何かしらのトラブルが発生したとしても、運営者は一切の責任を負いません。
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 6 }}>
          © {new Date().getFullYear()} chinimuruhi
        </Typography>
      </Container>

      {/* Dialogs */}
      <Dialog open={successDialogOpen} onClose={handleSuccessClose}>
        <DialogTitle>読み込み成功</DialogTitle>
        <DialogContent>データの読み込みに成功しました。</DialogContent>
        <DialogActions>
          <Button onClick={handleSuccessClose}>OK</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={reportDialogOpen} onClose={() => setReportDialogOpen(false)}>
        <DialogTitle>読み込み成功</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            以下の楽曲が読み込めませんでした。修正のため、報告いただけますと幸いです。
          </Typography>
          <Box>
            {failedTitles.map((title, i) => <div key={i}>{title}</div>)}
          </Box>
          <Alert severity="warning">
            <Typography variant="body2" gutterBottom>
              新曲の読み込みの対応についてはtextage様に追加されてから最大一週間程度かかります。
            </Typography>
            <Typography variant="body2">
              当サイトの楽曲リストは毎週水曜午前10時に更新を行っておりますので、更新後再度読み込みをお願いいたします。
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleReport}>報告する</Button>
          <Button onClick={() => { setReportDialogOpen(false); navigate('/diff'); }}>OK</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const ItemLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <Typography variant="body2">
    <MuiLink href={href} target="_blank" rel="noreferrer" sx={{ display: 'inline-flex', alignItems: 'center', gap: .5 }}>
      {children}
      <LaunchRoundedIcon fontSize="small" sx={{ ml: .25 }} />
    </MuiLink>
  </Typography>
);

export default Index;
