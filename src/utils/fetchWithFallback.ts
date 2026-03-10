/**
 * 外部URLからデータを取得し、失敗した場合はローカルバックアップにフォールバック
 */

const EXTERNAL_BASE_URL = 'https://chinimuruhi.github.io/IIDX-Data-Table';
const BACKUP_BASE_PATH = '/backup-data';

/**
 * 外部URLをローカルバックアップパスに変換
 * .gzファイルはViteが自動解凍するため、解凍済み.jsonとして保存・取得する
 */
const toBackupPath = (externalUrl: string): string | null => {
  if (!externalUrl.startsWith(EXTERNAL_BASE_URL)) {
    return null;
  }
  let relativePath = externalUrl.slice(EXTERNAL_BASE_URL.length);
  // .gzファイルは解凍済みの.jsonとして保存されている
  if (relativePath.endsWith('.json.gz')) {
    relativePath = relativePath.replace('.json.gz', '.json');
  }
  return BACKUP_BASE_PATH + relativePath;
};

/**
 * フォールバック付きfetch
 * 外部URLから取得を試み、失敗した場合はローカルバックアップから取得
 */
export const fetchWithFallback = async (externalUrl: string): Promise<Response> => {
  try {
    const response = await fetch(externalUrl);
    if (response.ok) {
      return response;
    }
    throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    const backupPath = toBackupPath(externalUrl);
    if (backupPath) {
      console.warn(`External fetch failed for ${externalUrl}, falling back to backup: ${backupPath}`);
      const backupResponse = await fetch(backupPath);
      if (backupResponse.ok) {
        return backupResponse;
      }
      throw new Error(`Backup fetch also failed: ${backupPath}`);
    }
    throw error;
  }
};

/**
 * JSON形式でフォールバック付きfetch
 */
export const fetchJsonWithFallback = async <T = unknown>(externalUrl: string): Promise<T> => {
  const response = await fetchWithFallback(externalUrl);
  return response.json();
};

/**
 * ArrayBuffer形式でフォールバック付きfetch（gzipファイル用）
 * 注意: バックアップから取得した場合は既に解凍済みのJSONが返される
 */
export const fetchArrayBufferWithFallback = async (externalUrl: string): Promise<ArrayBuffer> => {
  const response = await fetchWithFallback(externalUrl);
  return response.arrayBuffer();
};

/**
 * gzip圧縮されたJSONファイル用のフォールバック付きfetch
 * 外部サイトからはgzipとして取得し解凍、バックアップからは解凍済みJSONを取得
 */
export const fetchGzipJsonWithFallback = async <T = unknown>(externalUrl: string): Promise<T> => {
  const isGzUrl = externalUrl.endsWith('.json.gz');

  try {
    const response = await fetch(externalUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    // 外部サイトからはgzipとして取得
    if (isGzUrl) {
      const { ungzip } = await import('pako');
      const buffer = await response.arrayBuffer();
      const json = new TextDecoder().decode(ungzip(buffer));
      return JSON.parse(json);
    }
    return response.json();
  } catch (error) {
    const backupPath = toBackupPath(externalUrl);
    if (backupPath) {
      console.warn(`External fetch failed for ${externalUrl}, falling back to backup: ${backupPath}`);
      const backupResponse = await fetch(backupPath);
      if (backupResponse.ok) {
        // バックアップは解凍済みJSONとして保存されている
        return backupResponse.json();
      }
      throw new Error(`Backup fetch also failed: ${backupPath}`);
    }
    throw error;
  }
};
