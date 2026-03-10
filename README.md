# INFINITAS-ScoreViewer
https://chinimuruhi.github.io/INFINITAS-ScoreViewer/

## 外部データのバックアップ

本アプリケーションは外部サイト (chinimuruhi.github.io/IIDX-Data-Table) からデータを取得しています。
外部サイトが利用できない場合に備えて、ローカルバックアップからのフォールバック機能があります。

定期的に以下のスクリプトを実行することでバックアップデータを更新できます:

```bash
./scripts/backup-external-data.sh
```

バックアップデータは `public/backup-data/` に保存されます。