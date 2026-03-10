/**
 * 外部URLからデータを取得し、失敗した場合はローカルバックアップにフォールバック
 */

const EXTERNAL_BASE_URL = 'https://chinimuruhi.github.io/IIDX-Data-Table';
const BACKUP_BASE_PATH = '/backup-data';

/**
 * 外部URLをローカルバックアップパスに変換
 */
const toBackupPath = (externalUrl: string): string | null => {
  if (!externalUrl.startsWith(EXTERNAL_BASE_URL)) {
    return null;
  }
  const relativePath = externalUrl.slice(EXTERNAL_BASE_URL.length);
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
 */
export const fetchArrayBufferWithFallback = async (externalUrl: string): Promise<ArrayBuffer> => {
  const response = await fetchWithFallback(externalUrl);
  return response.arrayBuffer();
};
