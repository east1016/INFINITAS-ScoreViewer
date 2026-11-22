import customBpiStatic from '../data/customBpi.json';

export const fetchCustomBpi = async (): Promise<{ SP: Record<string, any>; DP: Record<string, any> }> => {
  if (import.meta.env.DEV) {
    try {
      const res = await fetch('/api/bpi');
      if (res.ok) return await res.json();
      // 500等のHTTPエラーもstaticにフォールバック
    } catch {
      // BPI server not running — fall through to static
    }
  }
  return customBpiStatic as any;
};
