import React, { useState } from 'react';
import {
  Container, Typography, Button, Box,
  Alert, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { parseOfficialCsv, mergeWithCSVEntries } from '../utils/scoreDataUtils';
import { getCurrentFormattedDate } from '../utils/dateUtils';
import { useAppContext } from '../context/AppContext';
import LinkComponent from '../components/LinkComponent';
import { Page, PageHeader } from '../components/Page';
import SectionCard from '../components/SectionCard';

const CsvLoaderPage = () => {
  const navigate = useNavigate();
  const { mode } = useAppContext();
  const [error, setError] = useState<string | null>(null);
  const [successDialogOpen, setSuccessDialogOpen] = useState<boolean>(false);
  const [reportDialogOpen, setReportDialogOpen] = useState<boolean>(false);
  const [failedTitles, setFailedTitles] = useState<string[]>([]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setFailedTitles([]);

    try {
      if (!file.name.endsWith('.csv')) {
        throw new Error('拡張子がcsvではありません');
      }

      const text = await readFileAsText(file);
      if (!text.includes('タイトル') || !text.includes('スコア')) {
        throw new Error('公式CSVとして認識できません');
      }

      const result = await parseOfficialCsv(text, mode);
      const { data, diffs, timestamps, failedTitles } = await mergeWithCSVEntries(result);

      if (failedTitles.length > 0) {
        setFailedTitles(failedTitles);
        setReportDialogOpen(true);
      } else {
        setSuccessDialogOpen(true);
      }

      localStorage.setItem('data', JSON.stringify(data));
      localStorage.setItem('diff', JSON.stringify(diffs));
      localStorage.setItem('timestamps', JSON.stringify(timestamps));

      const lastUpdated = getCurrentFormattedDate();
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}') || {};
      localStorage.setItem('user', JSON.stringify({ ...storedUser, lastupdated: lastUpdated }));
    } catch (e: any) {
      setError(`読み込み失敗: ${e}`);
    }
  };

  const readFileAsText = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let text = decoder.decode(uint8Array);
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.substring(1);
    }
    return text;
  };

  const handleReport = () => {
    const message = encodeURIComponent(`@ci_public\n以下の曲のIDが取得できませんでした:\n${failedTitles.join('\n')}\n`);
    const url = `https://x.com/intent/tweet?hashtags=inf_sv_error&text=${message}`;
    window.open(url, '_blank');
  };

  const handleSuccessDialogClose = () => {
    setSuccessDialogOpen(false);
    navigate('/diff');
  };

  return (
    <Page>
      <PageHeader compact title="CSV読み込み" />
      <SectionCard>
        <Container sx={{ mt: 4 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              beatmania IIDXの公式HP（<LinkComponent url="https://p.eagate.573.jp/game/2dx/">https://p.eagate.573.jp/game/2dx/</LinkComponent>）からダウンロードできるスコアデータCSVです。
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              文字コードはUTF-8 with BOMを想定しております。CSVファイルの手動修正を行う場合は文字コードにご注意ください。CSVのダウンロードにはbeatmania IIDX プレミアムコース登録が必要となります。
            </Typography>
            <Alert severity="warning" sx={{ mb: 2 }}>
              統計の充実のため、公式HPからダウンロードしたCSVは各本家サイトでもスコアデータの登録を行うことを推奨します。
            </Alert>
          </Box>

          <Button variant="contained" component="label">
            ファイルを選択
            <input type="file" hidden accept=".csv" onChange={handleFileUpload} />
          </Button>

          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

          <Dialog open={successDialogOpen} onClose={handleSuccessDialogClose}>
            <DialogTitle>読み込み成功</DialogTitle>
            <DialogContent>
              データの読み込みに成功しました。
            </DialogContent>
            <DialogActions>
              <Button onClick={handleSuccessDialogClose}>OK</Button>
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
        </Container>
      </SectionCard>
    </Page>
  );
};

export default CsvLoaderPage;
