#!/bin/bash

# 外部データソースのバックアップスクリプト
# chinimuruhi.github.io/IIDX-Data-Table から取得しているデータをローカルにバックアップ

BACKUP_DIR="./public/backup-data"
BASE_URL="https://chinimuruhi.github.io/IIDX-Data-Table"

# バックアップディレクトリ作成
mkdir -p "$BACKUP_DIR/textage"
mkdir -p "$BACKUP_DIR/konami"
mkdir -p "$BACKUP_DIR/bpi"
mkdir -p "$BACKUP_DIR/difficulty/sp11"
mkdir -p "$BACKUP_DIR/difficulty/sp12"
mkdir -p "$BACKUP_DIR/difficulty/dp"
mkdir -p "$BACKUP_DIR/ereter"
mkdir -p "$BACKUP_DIR/cpi"
mkdir -p "$BACKUP_DIR/manual"
mkdir -p "$BACKUP_DIR/radar"
mkdir -p "$BACKUP_DIR/notes_radar"

echo "Downloading external data for backup..."

# textage 関連
echo "Downloading textage data..."
curl -sS -o "$BACKUP_DIR/textage/title.json" "$BASE_URL/textage/title.json"
curl -sS -o "$BACKUP_DIR/textage/song-info.json.gz" "$BASE_URL/textage/song-info.json.gz"
curl -sS -o "$BACKUP_DIR/textage/chart-info.json.gz" "$BASE_URL/textage/chart-info.json.gz"
curl -sS -o "$BACKUP_DIR/textage/reverse-normalized-title.json" "$BASE_URL/textage/reverse-normalized-title.json"

# konami 関連
echo "Downloading konami data..."
curl -sS -o "$BACKUP_DIR/konami/song_to_label.json" "$BASE_URL/konami/song_to_label.json"

# BPI 関連
echo "Downloading BPI data..."
curl -sS -o "$BACKUP_DIR/bpi/versions.json" "$BASE_URL/bpi/versions.json"

# BPIバージョン一覧を取得して各バージョンのデータをダウンロード
BPI_VERSIONS=$(curl -sS "$BASE_URL/bpi/versions.json" | grep -oE '"[0-9]+"' | tr -d '"')
for version in $BPI_VERSIONS; do
  mkdir -p "$BACKUP_DIR/bpi/$version"
  echo "  Downloading BPI version: $version"
  curl -sS -o "$BACKUP_DIR/bpi/$version/sp_dict.json" "$BASE_URL/bpi/$version/sp_dict.json" 2>/dev/null || true
  curl -sS -o "$BACKUP_DIR/bpi/$version/dp_dict.json" "$BASE_URL/bpi/$version/dp_dict.json" 2>/dev/null || true
  curl -sS -o "$BACKUP_DIR/bpi/$version/sp_list.json" "$BASE_URL/bpi/$version/sp_list.json" 2>/dev/null || true
  curl -sS -o "$BACKUP_DIR/bpi/$version/dp_list.json" "$BASE_URL/bpi/$version/dp_list.json" 2>/dev/null || true
done

# difficulty 関連
echo "Downloading difficulty data..."
curl -sS -o "$BACKUP_DIR/difficulty/sp11/songs_list.json" "$BASE_URL/difficulty/sp11/songs_list.json"
curl -sS -o "$BACKUP_DIR/difficulty/sp11/difficulty.json" "$BASE_URL/difficulty/sp11/difficulty.json"
curl -sS -o "$BACKUP_DIR/difficulty/sp12/songs_list.json" "$BASE_URL/difficulty/sp12/songs_list.json"
curl -sS -o "$BACKUP_DIR/difficulty/sp12/difficulty.json" "$BASE_URL/difficulty/sp12/difficulty.json"
curl -sS -o "$BACKUP_DIR/difficulty/dp/songs_dict.json" "$BASE_URL/difficulty/dp/songs_dict.json"

# ereter 関連
echo "Downloading ereter data..."
curl -sS -o "$BACKUP_DIR/ereter/songs_dict.json" "$BASE_URL/ereter/songs_dict.json"

# CPI 関連
echo "Downloading CPI data..."
curl -sS -o "$BACKUP_DIR/cpi/songs_list.json" "$BASE_URL/cpi/songs_list.json"

# manual 関連
echo "Downloading manual data..."
curl -sS -o "$BACKUP_DIR/manual/replace-characters.json" "$BASE_URL/manual/replace-characters.json"

# radar 関連（SP/DP両方）
echo "Downloading radar data..."
curl -sS -o "$BACKUP_DIR/radar/sp-radar.json.gz" "$BASE_URL/radar/sp-radar.json.gz" 2>/dev/null || true
curl -sS -o "$BACKUP_DIR/radar/dp-radar.json.gz" "$BASE_URL/radar/dp-radar.json.gz" 2>/dev/null || true

# notes_radar 関連（RadarPage用）
echo "Downloading notes_radar data..."
curl -sS -o "$BACKUP_DIR/notes_radar/sp.json.gz" "$BASE_URL/notes_radar/sp.json.gz" 2>/dev/null || true
curl -sS -o "$BACKUP_DIR/notes_radar/dp.json.gz" "$BASE_URL/notes_radar/dp.json.gz" 2>/dev/null || true

echo ""
echo "Backup completed!"
echo "Data saved to: $BACKUP_DIR"
echo ""
echo "Backup timestamp: $(date '+%Y-%m-%d %H:%M:%S')"

# バックアップ日時を記録
echo "$(date '+%Y-%m-%d %H:%M:%S')" > "$BACKUP_DIR/last-backup.txt"
